"""
Jump process handler for discrete infrastructure failures.

Models discrete events such as breaker trips, pump shutdowns, fibre cuts,
and backup activation. When predicted load exceeds capacity at any node,
protection logic triggers, load is redistributed, and the graph state is
re-encoded.
"""

from __future__ import annotations

from typing import Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

from .gnn_encoder import scatter_add


class JumpProcess(nn.Module):
    """
    Discrete jump process for infrastructure failure events.

    Handles detection of capacity exceedances, application of protection
    logic (trip/shutdown/cut/backup), and load redistribution among
    surviving neighbours.
    """

    def __init__(
        self,
        state_dim: int,
        hidden_dim: int = 64,
    ) -> None:
        super().__init__()
        self.state_dim = state_dim

        # Network to compute redistribution weights from node states +
        # edge features. Given a failed node's load and its neighbours,
        # this MLP determines how much each neighbour absorbs.
        self.redistribution_net = nn.Sequential(
            nn.Linear(state_dim * 2, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, 1),
        )

        # Protection activation network: learns a soft threshold that
        # maps (state, capacity) -> protection activation probability.
        self.protection_net = nn.Sequential(
            nn.Linear(state_dim + 1, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, 1),
        )

        # Post-jump state adjustment: transforms node state after
        # a protection event (e.g., breaker trips set load to zero).
        self.post_jump_transform = nn.Sequential(
            nn.Linear(state_dim, state_dim),
            nn.Tanh(),
        )

    # ------------------------------------------------------------------
    # Detection
    # ------------------------------------------------------------------

    def detect_jumps(
        self,
        node_states: torch.Tensor,
        capacities: torch.Tensor,
    ) -> torch.BoolTensor:
        """
        Detect which nodes have exceeded their capacity thresholds.

        Uses a learned soft threshold via the protection network so the
        model can learn non-trivial protection triggering behaviour
        (e.g., trip at 95% for electrical but 110% for hydraulic).

        Args:
            node_states: (N, state_dim) current node states.
            capacities:  (N, 1) or (N,) capacity of each node.

        Returns:
            jump_mask: (N,) boolean tensor -- True where protection triggers.
        """
        if capacities.dim() == 1:
            capacities = capacities.unsqueeze(-1)  # (N, 1)

        # Concatenate state with capacity for the protection network
        x = torch.cat([node_states, capacities], dim=-1)  # (N, state_dim + 1)
        activation = self.protection_net(x).squeeze(-1)  # (N,)

        # Hard threshold at 0 (sigmoid > 0.5 equivalent)
        jump_mask = activation > 0.0
        return jump_mask

    # ------------------------------------------------------------------
    # Protection logic
    # ------------------------------------------------------------------

    def apply_jumps(
        self,
        node_states: torch.Tensor,
        jump_mask: torch.BoolTensor,
        edge_index: torch.LongTensor,
    ) -> torch.Tensor:
        """
        Apply protection logic to nodes that have triggered.

        Failed nodes have their state transformed (e.g., load set to near
        zero to model a breaker trip or pump shutdown).

        Args:
            node_states: (N, state_dim) current states.
            jump_mask:   (N,) boolean -- True for triggered nodes.
            edge_index:  (2, E) sparse adjacency.

        Returns:
            new_states: (N, state_dim) states after protection events.
        """
        new_states = node_states.clone()

        if jump_mask.any():
            # Transform failed nodes' states through protection logic
            failed_states = node_states[jump_mask]  # (F, state_dim)
            protected_states = self.post_jump_transform(failed_states)

            # Scale down: protection events dramatically reduce the node's
            # active load (breaker trip -> near zero output)
            protected_states = protected_states * 0.05

            new_states[jump_mask] = protected_states

        return new_states

    # ------------------------------------------------------------------
    # Load redistribution
    # ------------------------------------------------------------------

    def redistribute_load(
        self,
        node_states: torch.Tensor,
        failed_nodes: torch.BoolTensor,
        edge_index: torch.LongTensor,
        edge_features: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """
        Redistribute load from failed nodes to their surviving neighbours.

        For each failed node, its pre-failure load is distributed among
        connected surviving neighbours proportional to learned weights
        (which account for edge properties like distance and type).

        Args:
            node_states:   (N, state_dim) states BEFORE jump (original load).
            failed_nodes:  (N,) boolean mask of failed nodes.
            edge_index:    (2, E) sparse adjacency.
            edge_features: (E, edge_dim) optional edge attributes (unused
                           in current version; redistribution is state-based).

        Returns:
            redistributed: (N, state_dim) new states with load redistributed.
        """
        N = node_states.size(0)
        src_idx, tgt_idx = edge_index[0], edge_index[1]
        device = node_states.device

        redistributed = node_states.clone()

        if not failed_nodes.any():
            return redistributed

        # Identify load that needs to be redistributed from each failed node.
        # We use the L1 norm of the state as a proxy for "total load".
        failed_load = node_states.clone()
        failed_load[~failed_nodes] = 0.0  # zero out non-failed

        # For each edge from a failed node to a surviving node,
        # compute redistribution weight.
        src_failed = failed_nodes[src_idx]  # (E,) mask of edges FROM failed
        tgt_alive = ~failed_nodes[tgt_idx]  # (E,) mask of edges TO surviving
        redistribute_edges = src_failed & tgt_alive  # (E,)

        if not redistribute_edges.any():
            return redistributed

        # Get the edges that will carry redistributed load
        re_src = src_idx[redistribute_edges]
        re_tgt = tgt_idx[redistribute_edges]

        # Compute redistribution weights from source-target state pairs
        src_feats = node_states[re_src]  # (R, state_dim)
        tgt_feats = node_states[re_tgt]  # (R, state_dim)
        weight_input = torch.cat([src_feats, tgt_feats], dim=-1)  # (R, 2*state_dim)
        raw_weights = self.redistribution_net(weight_input).squeeze(-1)  # (R,)

        # Normalise weights per source (failed) node so total redistributed
        # load from each failed node sums to original load.
        # Use softmax grouped by source node.
        unique_src = re_src.unique()
        normalised_weights = torch.zeros_like(raw_weights)

        for src_node in unique_src:
            mask = re_src == src_node
            normalised_weights[mask] = F.softmax(raw_weights[mask], dim=0)

        # Redistribute: each surviving target receives a weighted fraction
        # of the failed source's state.
        # messages[i] = normalised_weights[i] * failed_source_state[i]
        messages = normalised_weights.unsqueeze(-1) * failed_load[re_src]  # (R, state_dim)

        # Scatter-add messages to target nodes
        added_load = scatter_add(messages, re_tgt, dim=0, dim_size=N)
        redistributed = redistributed + added_load

        # Zero out the failed nodes' redistributed load
        # (they already went through post_jump_transform in apply_jumps)

        return redistributed

    # ------------------------------------------------------------------
    # Combined step
    # ------------------------------------------------------------------

    def forward(
        self,
        node_states: torch.Tensor,
        capacities: torch.Tensor,
        edge_index: torch.LongTensor,
        edge_features: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, torch.BoolTensor]:
        """
        Full jump process step: detect, protect, redistribute.

        Args:
            node_states: (N, state_dim) current states.
            capacities:  (N,) or (N, 1) node capacities.
            edge_index:  (2, E) adjacency.
            edge_features: (E, edge_dim) optional.

        Returns:
            new_states: (N, state_dim) states after jump processing.
            jump_mask:  (N,) which nodes triggered protection.
        """
        # 1. Detect capacity exceedances
        jump_mask = self.detect_jumps(node_states, capacities)

        if not jump_mask.any():
            return node_states, jump_mask

        # 2. Redistribute load from failing nodes to neighbours
        #    (done BEFORE protection trips, using original load values)
        redistributed = self.redistribute_load(
            node_states, jump_mask, edge_index, edge_features
        )

        # 3. Apply protection logic to the failed nodes
        new_states = self.apply_jumps(redistributed, jump_mask, edge_index)

        return new_states, jump_mask
