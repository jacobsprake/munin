"""
Physics-informed loss functions for infrastructure anomaly detection.

Each loss encodes domain-specific physical constraints that the autoencoder
must respect in addition to minimising reconstruction error. Violations of
physical laws (conservation of mass, Kirchhoff's laws, signal attenuation
bounds) are penalised, steering the model toward physically plausible
reconstructions and making true anomalies easier to detect.
"""

from __future__ import annotations

import torch
import torch.nn as nn
from typing import Dict, Optional


class PhysicsLoss(nn.Module):
    """Collection of physics-constraint losses for infrastructure domains.

    Parameters
    ----------
    lambda_hydraulic : float
        Weight for hydraulic conservation-of-mass penalty.
    lambda_electrical : float
        Weight for electrical Kirchhoff / power-balance penalty.
    lambda_telecom : float
        Weight for telecom attenuation / capacity penalty.
    """

    def __init__(
        self,
        lambda_hydraulic: float = 1.0,
        lambda_electrical: float = 1.0,
        lambda_telecom: float = 1.0,
    ) -> None:
        super().__init__()
        self.lambda_hydraulic = lambda_hydraulic
        self.lambda_electrical = lambda_electrical
        self.lambda_telecom = lambda_telecom

    # ------------------------------------------------------------------
    # Domain-specific physics losses
    # ------------------------------------------------------------------

    def hydraulic_loss(
        self,
        predicted: torch.Tensor,
        targets: torch.Tensor,
        metadata: Dict[str, torch.Tensor],
    ) -> torch.Tensor:
        """Conservation of mass: sum(inflows) == sum(outflows) + delta_storage.

        Parameters
        ----------
        predicted : Tensor (batch, seq_len, n_sensors)
            Reconstructed sensor values.
        targets : Tensor (batch, seq_len, n_sensors)
            Ground-truth sensor values.
        metadata : dict
            Must contain:
            - ``inflow_indices``  : 1-D LongTensor of sensor indices for inflows
            - ``outflow_indices`` : 1-D LongTensor of sensor indices for outflows
            - ``storage_indices`` : 1-D LongTensor of sensor indices for storage levels

        Returns
        -------
        loss : scalar Tensor
        """
        inflow_idx = metadata["inflow_indices"]
        outflow_idx = metadata["outflow_indices"]
        storage_idx = metadata["storage_indices"]

        pred_inflow = predicted[:, :, inflow_idx].sum(dim=-1)     # (batch, seq_len)
        pred_outflow = predicted[:, :, outflow_idx].sum(dim=-1)   # (batch, seq_len)
        pred_storage = predicted[:, :, storage_idx].sum(dim=-1)   # (batch, seq_len)

        # delta_storage: difference between consecutive timesteps
        # Pad the first timestep with zero change.
        delta_storage = torch.zeros_like(pred_storage)
        delta_storage[:, 1:] = pred_storage[:, 1:] - pred_storage[:, :-1]

        # Conservation of mass violation
        violation = pred_inflow - pred_outflow - delta_storage  # should be ~0
        loss = (violation ** 2).mean()
        return self.lambda_hydraulic * loss

    def electrical_loss(
        self,
        predicted: torch.Tensor,
        targets: torch.Tensor,
        metadata: Dict[str, torch.Tensor],
    ) -> torch.Tensor:
        """Kirchhoff's current law + power balance.

        Parameters
        ----------
        predicted : Tensor (batch, seq_len, n_sensors)
        targets : Tensor (batch, seq_len, n_sensors)
        metadata : dict
            Must contain:
            - ``node_groups`` : list of lists of sensor indices.
              Each inner list contains the current-sensor indices meeting at one node.
              By KCL the algebraic sum at each node should be zero (sign convention
              must be handled in data preprocessing -- positive = into node).
            - ``generation_indices`` : 1-D LongTensor of generation sensor indices
            - ``load_indices``       : 1-D LongTensor of load sensor indices
            - ``loss_indices``       : 1-D LongTensor of line-loss sensor indices (optional)

        Returns
        -------
        loss : scalar Tensor
        """
        kcl_loss = torch.tensor(0.0, device=predicted.device, dtype=predicted.dtype)

        # --- Kirchhoff's Current Law ---
        node_groups = metadata.get("node_groups", [])
        for node_indices in node_groups:
            idx = torch.as_tensor(node_indices, device=predicted.device, dtype=torch.long)
            current_sum = predicted[:, :, idx].sum(dim=-1)  # should be 0
            kcl_loss = kcl_loss + (current_sum ** 2).mean()

        if len(node_groups) > 0:
            kcl_loss = kcl_loss / len(node_groups)

        # --- Power balance: generation = load + losses ---
        gen_idx = metadata["generation_indices"]
        load_idx = metadata["load_indices"]
        loss_idx = metadata.get("loss_indices", None)

        total_gen = predicted[:, :, gen_idx].sum(dim=-1)
        total_load = predicted[:, :, load_idx].sum(dim=-1)

        if loss_idx is not None and len(loss_idx) > 0:
            total_losses = predicted[:, :, loss_idx].sum(dim=-1)
        else:
            total_losses = torch.zeros_like(total_gen)

        power_violation = total_gen - total_load - total_losses
        power_loss = (power_violation ** 2).mean()

        loss = kcl_loss + power_loss
        return self.lambda_electrical * loss

    def telecom_loss(
        self,
        predicted: torch.Tensor,
        targets: torch.Tensor,
        metadata: Dict[str, torch.Tensor],
    ) -> torch.Tensor:
        """Signal attenuation and bandwidth capacity constraints.

        Parameters
        ----------
        predicted : Tensor (batch, seq_len, n_sensors)
        targets : Tensor (batch, seq_len, n_sensors)
        metadata : dict
            Must contain:
            - ``signal_indices``    : 1-D LongTensor of signal-strength sensor indices
            - ``distance``          : Tensor (n_signals,) distance for each signal path (km)
            - ``attenuation_coeff`` : float, expected attenuation per unit distance (dB/km)
            - ``tx_power_indices``  : 1-D LongTensor of transmit-power sensor indices
              (same length as signal_indices; paired element-wise)
            - ``bandwidth_indices`` : 1-D LongTensor of bandwidth-usage sensor indices
            - ``capacity``          : Tensor (n_bandwidth,) max capacity for each link

        Returns
        -------
        loss : scalar Tensor
        """
        sig_idx = metadata["signal_indices"]
        tx_idx = metadata["tx_power_indices"]
        distance = metadata["distance"].to(predicted.device)       # (n_signals,)
        atten_coeff = float(metadata["attenuation_coeff"])

        # Expected received power: tx_power - attenuation_coeff * distance
        pred_rx = predicted[:, :, sig_idx]       # (batch, seq_len, n_signals)
        pred_tx = predicted[:, :, tx_idx]        # (batch, seq_len, n_signals)

        expected_rx = pred_tx - atten_coeff * distance.unsqueeze(0).unsqueeze(0)
        attenuation_violation = (pred_rx - expected_rx) ** 2
        atten_loss = attenuation_violation.mean()

        # Bandwidth cannot exceed capacity
        bw_idx = metadata["bandwidth_indices"]
        capacity = metadata["capacity"].to(predicted.device)  # (n_bandwidth,)

        pred_bw = predicted[:, :, bw_idx]  # (batch, seq_len, n_bandwidth)
        # Penalise only the excess (ReLU of bw - capacity)
        excess = torch.relu(pred_bw - capacity.unsqueeze(0).unsqueeze(0))
        capacity_loss = (excess ** 2).mean()

        loss = atten_loss + capacity_loss
        return self.lambda_telecom * loss

    # ------------------------------------------------------------------
    # Combined loss
    # ------------------------------------------------------------------

    @staticmethod
    def combined_loss(
        reconstruction_loss: torch.Tensor,
        physics_violations: torch.Tensor,
        lambda_physics: float = 0.1,
    ) -> torch.Tensor:
        """Weighted combination of reconstruction and physics losses.

        Parameters
        ----------
        reconstruction_loss : scalar Tensor
        physics_violations : scalar Tensor
            Sum (or individual) physics constraint violation(s).
        lambda_physics : float
            Weighting factor for the physics term.

        Returns
        -------
        total : scalar Tensor
        """
        return reconstruction_loss + lambda_physics * physics_violations
