"""
Full PI-GN-JODE cascade predictor.

Combines the GNN encoder, Neural ODE continuous dynamics, and jump process
discrete failures into a unified cascade prediction system.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR

from .gnn_encoder import EdgeConditionedGNN
from .jump_process import JumpProcess
from .neural_ode import NeuralODE

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class CascadeConfig:
    """Configuration for the cascade prediction system."""

    node_dim: int = 16
    edge_dim: int = 8
    hidden_dim: int = 64
    gnn_layers: int = 3
    ode_hidden_dim: int = 64
    dropout: float = 0.1
    n_mc_samples: int = 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_dim": self.node_dim,
            "edge_dim": self.edge_dim,
            "hidden_dim": self.hidden_dim,
            "gnn_layers": self.gnn_layers,
            "ode_hidden_dim": self.ode_hidden_dim,
            "dropout": self.dropout,
            "n_mc_samples": self.n_mc_samples,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "CascadeConfig":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


# ---------------------------------------------------------------------------
# Prediction output
# ---------------------------------------------------------------------------

@dataclass
class CascadePrediction:
    """
    Output of cascade prediction.

    Attributes:
        affected_nodes: Dict mapping node_id -> list of failure probabilities
            at each timestep.
        cascade_paths: List of (source, target) propagation edges.
        time_to_impact: Dict mapping node_id -> estimated hours until failure.
        uncertainty: Dict mapping node_id -> standard deviation of failure prob.
        confidence_interval: Dict mapping node_id -> (lower, upper) 95% CI.
    """

    affected_nodes: Dict[str, List[float]] = field(default_factory=dict)
    cascade_paths: List[Tuple[str, str]] = field(default_factory=list)
    time_to_impact: Dict[str, float] = field(default_factory=dict)
    uncertainty: Dict[str, float] = field(default_factory=dict)
    confidence_interval: Dict[str, Tuple[float, float]] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Graph data container
# ---------------------------------------------------------------------------

@dataclass
class GraphData:
    """
    Container for infrastructure graph data.

    Attributes:
        node_features: (N, node_dim) tensor of node states.
        edge_index: (2, E) tensor of (source, target) pairs.
        edge_features: (E, edge_dim) tensor of edge attributes.
        node_ids: list of string identifiers for each node.
        capacities: (N,) tensor of node capacities.
    """

    node_features: torch.Tensor
    edge_index: torch.LongTensor
    edge_features: torch.Tensor
    node_ids: List[str]
    capacities: torch.Tensor

    @property
    def num_nodes(self) -> int:
        return self.node_features.size(0)

    @property
    def device(self) -> torch.device:
        return self.node_features.device

    def to(self, device: torch.device) -> "GraphData":
        return GraphData(
            node_features=self.node_features.to(device),
            edge_index=self.edge_index.to(device),
            edge_features=self.edge_features.to(device),
            node_ids=self.node_ids,
            capacities=self.capacities.to(device),
        )


# ---------------------------------------------------------------------------
# Labelled scenario for training
# ---------------------------------------------------------------------------

@dataclass
class LabelledScenario:
    """
    A labelled cascade scenario for training/evaluation.

    Attributes:
        graph: the infrastructure graph state at failure onset.
        failure_nodes: list of node IDs where failure originates.
        ground_truth_affected: dict mapping node_id -> 1.0 if affected, 0.0 otherwise.
        ground_truth_times: dict mapping node_id -> time (hours) when affected.
        t_horizon: observation horizon in hours.
    """

    graph: GraphData
    failure_nodes: List[str]
    ground_truth_affected: Dict[str, float]
    ground_truth_times: Dict[str, float] = field(default_factory=dict)
    t_horizon: float = 48.0


# ---------------------------------------------------------------------------
# Cascade Predictor
# ---------------------------------------------------------------------------

class CascadePredictor(nn.Module):
    """
    Full PI-GN-JODE cascade predictor.

    Pipeline:
    1. GNN encoder: graph -> initial hidden states
    2. Neural ODE: continuous stress propagation over time
    3. Jump process: discrete protection events at each ODE step
    4. Decoder: hidden states -> failure probabilities
    """

    def __init__(self, config: CascadeConfig) -> None:
        super().__init__()
        self.config = config

        # GNN encoder
        self.encoder = EdgeConditionedGNN(
            node_dim=config.node_dim,
            edge_dim=config.edge_dim,
            hidden_dim=config.hidden_dim,
            n_layers=config.gnn_layers,
            dropout=config.dropout,
        )

        # Neural ODE for continuous dynamics
        self.ode = NeuralODE(
            state_dim=config.hidden_dim,
            hidden_dim=config.ode_hidden_dim,
            n_blocks=2,
            solver="rk4",
        )

        # Jump process for discrete failures
        self.jump = JumpProcess(
            state_dim=config.hidden_dim,
            hidden_dim=config.ode_hidden_dim,
        )

        # Failure probability decoder: hidden state -> P(failure)
        self.failure_decoder = nn.Sequential(
            nn.Linear(config.hidden_dim, config.hidden_dim),
            nn.SiLU(),
            nn.Linear(config.hidden_dim, 1),
            nn.Sigmoid(),
        )

        # Capacity estimator from hidden states (used when explicit
        # capacities are in the node features)
        self.capacity_decoder = nn.Sequential(
            nn.Linear(config.hidden_dim, config.hidden_dim // 2),
            nn.SiLU(),
            nn.Linear(config.hidden_dim // 2, 1),
            nn.Softplus(),  # capacities are positive
        )

    def encode(self, graph: GraphData) -> torch.Tensor:
        """
        Encode infrastructure graph into initial hidden states via GNN.

        Args:
            graph: GraphData with node_features, edge_index, edge_features.

        Returns:
            h0: (N, hidden_dim) initial hidden states.
        """
        return self.encoder(
            graph.node_features,
            graph.edge_index,
            graph.edge_features,
        )

    def _inject_failure(
        self,
        h: torch.Tensor,
        failure_indices: List[int],
    ) -> torch.Tensor:
        """
        Inject failure signal into the initial hidden states of failing nodes.

        Sets a large perturbation on the failure nodes to seed the cascade.
        """
        h = h.clone()
        if failure_indices:
            # Add a strong stress signal to failing nodes
            stress = torch.ones(h.size(-1), device=h.device) * 3.0
            for idx in failure_indices:
                h[idx] = h[idx] + stress
        return h

    def _simulate_cascade(
        self,
        h0: torch.Tensor,
        graph: GraphData,
        t_horizon: float,
        dt: float,
    ) -> Tuple[torch.Tensor, List[torch.BoolTensor]]:
        """
        Run the coupled ODE + jump simulation.

        Alternates between short ODE integration windows and jump detection.
        Each window integrates for *dt* hours, then checks for jumps.

        Returns:
            trajectory: (T, N, hidden_dim) hidden states over time.
            jump_history: list of boolean masks at each step.
        """
        n_windows = max(1, int(t_horizon / dt))
        ode_substeps = 5  # sub-steps within each window for the ODE solver

        trajectory: List[torch.Tensor] = [h0]
        jump_history: List[torch.BoolTensor] = []

        h = h0
        for _ in range(n_windows):
            # 1. Continuous ODE integration for one window
            ode_traj = self.ode(h, t_span=(0.0, dt), n_steps=ode_substeps)
            h = ode_traj[-1]  # take final state of this window

            # 2. Estimate current capacities from hidden states
            capacities = self.capacity_decoder(h).squeeze(-1)
            # Use graph capacities if available, blended with learned estimate
            if graph.capacities is not None:
                # Scale learned capacities to be in a similar range
                capacities = 0.5 * capacities + 0.5 * graph.capacities

            # 3. Jump process: detect and handle discrete failures
            h, jump_mask = self.jump(
                h, capacities, graph.edge_index, graph.edge_features
            )

            trajectory.append(h)
            jump_history.append(jump_mask)

        return torch.stack(trajectory, dim=0), jump_history

    def predict_cascade(
        self,
        graph: GraphData,
        failure_nodes: List[str],
        t_horizon: float = 48.0,
        dt: float = 0.1,
    ) -> CascadePrediction:
        """
        Predict cascade propagation from initial failure nodes.

        Args:
            graph: infrastructure graph state.
            failure_nodes: list of node IDs where failure starts.
            t_horizon: prediction horizon in hours.
            dt: time step between jump checks (hours).

        Returns:
            CascadePrediction with affected nodes, paths, timing, etc.
        """
        self.eval()
        device = graph.device

        # Map node IDs to indices
        id_to_idx = {nid: i for i, nid in enumerate(graph.node_ids)}
        failure_indices = [id_to_idx[nid] for nid in failure_nodes if nid in id_to_idx]

        with torch.no_grad():
            # 1. Encode graph
            h0 = self.encode(graph)

            # 2. Inject failure
            h0 = self._inject_failure(h0, failure_indices)

            # 3. Simulate
            trajectory, jump_history = self._simulate_cascade(
                h0, graph, t_horizon, dt
            )

            # 4. Decode failure probabilities at each timestep
            # trajectory: (T, N, hidden_dim)
            T, N, _ = trajectory.shape
            flat = trajectory.reshape(T * N, -1)
            probs = self.failure_decoder(flat).reshape(T, N)  # (T, N)

        return self._build_prediction(
            probs, jump_history, graph, failure_indices, dt
        )

    def predict_with_uncertainty(
        self,
        graph: GraphData,
        failure_nodes: List[str],
        n_samples: int = 100,
        t_horizon: float = 48.0,
        dt: float = 0.1,
    ) -> CascadePrediction:
        """
        Predict cascade with MC dropout uncertainty estimation.

        Runs *n_samples* forward passes with dropout enabled to estimate
        epistemic uncertainty.

        Args:
            graph: infrastructure graph.
            failure_nodes: initial failure node IDs.
            n_samples: number of MC samples (overrides config if provided).
            t_horizon: prediction horizon in hours.
            dt: time step in hours.

        Returns:
            CascadePrediction with uncertainty and confidence intervals.
        """
        # Enable dropout for MC sampling
        self.train()

        device = graph.device
        id_to_idx = {nid: i for i, nid in enumerate(graph.node_ids)}
        failure_indices = [id_to_idx[nid] for nid in failure_nodes if nid in id_to_idx]

        all_probs: List[torch.Tensor] = []

        with torch.no_grad():
            for _ in range(n_samples):
                h0 = self.encode(graph)
                h0 = self._inject_failure(h0, failure_indices)
                trajectory, _ = self._simulate_cascade(h0, graph, t_horizon, dt)

                T, N, _ = trajectory.shape
                flat = trajectory.reshape(T * N, -1)
                probs = self.failure_decoder(flat).reshape(T, N)
                all_probs.append(probs)

        self.eval()

        # Stack: (n_samples, T, N)
        stacked = torch.stack(all_probs, dim=0)
        mean_probs = stacked.mean(dim=0)  # (T, N)
        std_probs = stacked.std(dim=0)  # (T, N)

        # Build prediction from mean
        prediction = self._build_prediction(
            mean_probs, [], graph, failure_indices, dt
        )

        # Add uncertainty information
        for i, nid in enumerate(graph.node_ids):
            node_std = std_probs[:, i].max().item()
            prediction.uncertainty[nid] = node_std

            # 95% CI from MC samples at the final timestep
            final_samples = stacked[:, -1, i]
            lower = torch.quantile(final_samples, 0.025).item()
            upper = torch.quantile(final_samples, 0.975).item()
            prediction.confidence_interval[nid] = (lower, upper)

        return prediction

    def _build_prediction(
        self,
        probs: torch.Tensor,
        jump_history: List[torch.BoolTensor],
        graph: GraphData,
        failure_indices: List[int],
        dt: float,
    ) -> CascadePrediction:
        """
        Build CascadePrediction from raw probability trajectory.

        Args:
            probs: (T, N) failure probabilities over time.
            jump_history: list of jump masks.
            graph: original graph data.
            failure_indices: indices of initial failure nodes.
            dt: time step in hours.
        """
        T, N = probs.shape
        pred = CascadePrediction()

        FAILURE_THRESHOLD = 0.5

        # Affected nodes: per-node probability trajectory
        for i, nid in enumerate(graph.node_ids):
            prob_list = probs[:, i].cpu().tolist()
            pred.affected_nodes[nid] = prob_list

            # Time to impact: first timestep where P(failure) > threshold
            for t_step, p in enumerate(prob_list):
                if p > FAILURE_THRESHOLD:
                    pred.time_to_impact[nid] = t_step * dt
                    break

        # Cascade paths: infer from jump history
        # When a node fails (jump triggers), edges from that node to
        # subsequently failing nodes form cascade paths.
        src_idx, tgt_idx = graph.edge_index[0], graph.edge_index[1]
        failed_so_far: set = set(failure_indices)

        for step, jump_mask in enumerate(jump_history):
            newly_failed = set()
            for node_idx in range(N):
                if jump_mask[node_idx].item() and node_idx not in failed_so_far:
                    newly_failed.add(node_idx)

            # For each newly failed node, find which already-failed node
            # is connected to it (the cascade source).
            for new_node in newly_failed:
                # Find edges where target == new_node and source is in failed_so_far
                edge_mask = (tgt_idx == new_node)
                candidate_sources = src_idx[edge_mask].tolist()
                for cs in candidate_sources:
                    if cs in failed_so_far:
                        src_name = graph.node_ids[cs]
                        tgt_name = graph.node_ids[new_node]
                        pred.cascade_paths.append((src_name, tgt_name))
                        break

            failed_so_far.update(newly_failed)

        return pred


# ---------------------------------------------------------------------------
# Cascade Trainer
# ---------------------------------------------------------------------------

class CascadeTrainer:
    """
    Training and evaluation harness for CascadePredictor.

    Uses binary cross-entropy for failure prediction, plus physics
    regularisation from the Neural ODE.
    """

    def __init__(
        self,
        model: CascadePredictor,
        device: Optional[torch.device] = None,
    ) -> None:
        self.model = model
        self.device = device or torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )
        self.model.to(self.device)

    def train(
        self,
        scenarios: List[LabelledScenario],
        epochs: int = 200,
        lr: float = 1e-3,
        reg_coeff: float = 0.01,
        val_scenarios: Optional[List[LabelledScenario]] = None,
    ) -> Dict[str, List[float]]:
        """
        Train the cascade predictor on labelled scenarios.

        Args:
            scenarios: list of labelled cascade scenarios.
            epochs: number of training epochs.
            lr: learning rate.
            reg_coeff: weight for physics regularisation.
            val_scenarios: optional validation set.

        Returns:
            history: dict with 'loss', 'bce', 'physics_reg', and optionally
                     'val_loss' per epoch.
        """
        self.model.train()
        optimizer = AdamW(self.model.parameters(), lr=lr, weight_decay=1e-4)
        scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=lr * 0.01)

        history: Dict[str, List[float]] = {
            "loss": [],
            "bce": [],
            "physics_reg": [],
        }
        if val_scenarios:
            history["val_loss"] = []

        for epoch in range(epochs):
            epoch_loss = 0.0
            epoch_bce = 0.0
            epoch_reg = 0.0

            for scenario in scenarios:
                graph = scenario.graph.to(self.device)
                id_to_idx = {nid: i for i, nid in enumerate(graph.node_ids)}
                failure_indices = [
                    id_to_idx[nid]
                    for nid in scenario.failure_nodes
                    if nid in id_to_idx
                ]

                optimizer.zero_grad()

                # Encode and inject failure
                h0 = self.model.encode(graph)
                h0 = self.model._inject_failure(h0, failure_indices)

                # Simulate cascade
                trajectory, jump_history = self.model._simulate_cascade(
                    h0, graph, scenario.t_horizon, dt=0.5
                )

                # Decode final-step failure probabilities
                h_final = trajectory[-1]  # (N, hidden_dim)
                pred_probs = self.model.failure_decoder(h_final).squeeze(-1)  # (N,)

                # Build ground-truth target
                target = torch.zeros(graph.num_nodes, device=self.device)
                for nid, affected in scenario.ground_truth_affected.items():
                    if nid in id_to_idx:
                        target[id_to_idx[nid]] = affected

                # BCE loss
                bce = F.binary_cross_entropy(pred_probs, target)

                # Physics regularisation
                physics_reg = self.model.ode.compute_regularized_loss(
                    h0, t=0.0, reg_coeff=reg_coeff
                )

                loss = bce + physics_reg
                loss.backward()

                # Gradient clipping
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)

                optimizer.step()

                epoch_loss += loss.item()
                epoch_bce += bce.item()
                epoch_reg += physics_reg.item()

            n = max(len(scenarios), 1)
            history["loss"].append(epoch_loss / n)
            history["bce"].append(epoch_bce / n)
            history["physics_reg"].append(epoch_reg / n)

            scheduler.step()

            # Validation
            if val_scenarios:
                val_loss = self._eval_loss(val_scenarios)
                history["val_loss"].append(val_loss)

            if (epoch + 1) % 20 == 0:
                logger.info(
                    f"Epoch {epoch+1}/{epochs}  "
                    f"loss={history['loss'][-1]:.4f}  "
                    f"bce={history['bce'][-1]:.4f}  "
                    f"reg={history['physics_reg'][-1]:.6f}"
                )

        return history

    @torch.no_grad()
    def _eval_loss(self, scenarios: List[LabelledScenario]) -> float:
        """Compute mean BCE loss on a set of scenarios."""
        self.model.eval()
        total_loss = 0.0

        for scenario in scenarios:
            graph = scenario.graph.to(self.device)
            id_to_idx = {nid: i for i, nid in enumerate(graph.node_ids)}
            failure_indices = [
                id_to_idx[nid]
                for nid in scenario.failure_nodes
                if nid in id_to_idx
            ]

            h0 = self.model.encode(graph)
            h0 = self.model._inject_failure(h0, failure_indices)
            trajectory, _ = self.model._simulate_cascade(
                h0, graph, scenario.t_horizon, dt=0.5
            )

            h_final = trajectory[-1]
            pred_probs = self.model.failure_decoder(h_final).squeeze(-1)

            target = torch.zeros(graph.num_nodes, device=self.device)
            for nid, affected in scenario.ground_truth_affected.items():
                if nid in id_to_idx:
                    target[id_to_idx[nid]] = affected

            total_loss += F.binary_cross_entropy(pred_probs, target).item()

        self.model.train()
        return total_loss / max(len(scenarios), 1)

    @torch.no_grad()
    def evaluate(
        self,
        test_scenarios: List[LabelledScenario],
    ) -> Dict[str, float]:
        """
        Evaluate on test scenarios.

        Returns:
            metrics: dict with precision_recall_auc, false_positive_rate,
                     and multi_hop_accuracy.
        """
        self.model.eval()

        all_preds: List[float] = []
        all_targets: List[float] = []
        multi_hop_correct = 0
        multi_hop_total = 0

        for scenario in test_scenarios:
            graph = scenario.graph.to(self.device)
            id_to_idx = {nid: i for i, nid in enumerate(graph.node_ids)}
            failure_indices = [
                id_to_idx[nid]
                for nid in scenario.failure_nodes
                if nid in id_to_idx
            ]
            failure_set = set(scenario.failure_nodes)

            h0 = self.model.encode(graph)
            h0 = self.model._inject_failure(h0, failure_indices)
            trajectory, _ = self.model._simulate_cascade(
                h0, graph, scenario.t_horizon, dt=0.5
            )

            h_final = trajectory[-1]
            pred_probs = self.model.failure_decoder(h_final).squeeze(-1)

            for nid in graph.node_ids:
                idx = id_to_idx[nid]
                pred = pred_probs[idx].item()
                target = scenario.ground_truth_affected.get(nid, 0.0)
                all_preds.append(pred)
                all_targets.append(target)

                # Multi-hop: nodes that are NOT initial failures but ARE affected
                if nid not in failure_set and target > 0.5:
                    multi_hop_total += 1
                    if pred > 0.5:
                        multi_hop_correct += 1

        preds_arr = np.array(all_preds)
        targets_arr = np.array(all_targets)

        # Precision-recall AUC (approximate via thresholds)
        pr_auc = self._approx_pr_auc(preds_arr, targets_arr)

        # False positive rate at threshold 0.5
        pred_pos = preds_arr > 0.5
        actual_neg = targets_arr < 0.5
        fp = (pred_pos & actual_neg).sum()
        total_neg = actual_neg.sum()
        fpr = float(fp / max(total_neg, 1))

        # Multi-hop accuracy
        mha = float(multi_hop_correct / max(multi_hop_total, 1))

        return {
            "precision_recall_auc": pr_auc,
            "false_positive_rate": fpr,
            "multi_hop_accuracy": mha,
        }

    @staticmethod
    def _approx_pr_auc(preds: np.ndarray, targets: np.ndarray) -> float:
        """
        Approximate precision-recall AUC using threshold sweep.

        Uses 200 thresholds between 0 and 1.
        """
        thresholds = np.linspace(0.0, 1.0, 200)
        precisions = []
        recalls = []

        positives = targets > 0.5

        for thresh in thresholds:
            pred_pos = preds > thresh
            tp = (pred_pos & positives).sum()
            fp = (pred_pos & ~positives).sum()
            fn = (~pred_pos & positives).sum()

            precision = tp / max(tp + fp, 1)
            recall = tp / max(tp + fn, 1)
            precisions.append(precision)
            recalls.append(recall)

        # Sort by recall for AUC calculation
        recalls = np.array(recalls)
        precisions = np.array(precisions)
        sorted_idx = np.argsort(recalls)
        recalls = recalls[sorted_idx]
        precisions = precisions[sorted_idx]

        # Trapezoidal AUC
        auc = float(np.trapz(precisions, recalls))
        return max(0.0, min(1.0, abs(auc)))

    def save(self, path: str | Path) -> None:
        """Save model weights and config."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "model_state_dict": self.model.state_dict(),
                "config": self.model.config.to_dict(),
            },
            path,
        )
        logger.info(f"Saved cascade predictor to {path}")

    def load(self, path: str | Path) -> None:
        """Load model weights (config must match)."""
        path = Path(path)
        checkpoint = torch.load(path, map_location=self.device, weights_only=False)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        logger.info(f"Loaded cascade predictor from {path}")
