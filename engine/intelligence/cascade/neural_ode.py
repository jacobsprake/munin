"""
Neural ODE for continuous stress redistribution through infrastructure.

Models dh/dt = f_theta(h, t) where h is the graph state vector and f_theta
is a neural network with residual connections. Includes physics regularisation
for flow conservation, load redistribution, and thermal dynamics.

Implements Euler and RK4 solvers directly -- no torchdiffeq dependency.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


class SolverType(Enum):
    EULER = "euler"
    RK4 = "rk4"


# ---------------------------------------------------------------------------
# ODEFunc: the neural network that computes dh/dt
# ---------------------------------------------------------------------------

class ODEFunc(nn.Module):
    """
    Neural network f_theta that maps (t, h) -> dh/dt.

    Architecture: MLP with residual connections and layer normalisation.
    The time scalar *t* is injected via a learned linear embedding that
    is added to the hidden representation, allowing the dynamics to be
    time-dependent.
    """

    def __init__(
        self,
        state_dim: int,
        hidden_dim: int = 64,
        n_blocks: int = 2,
    ) -> None:
        super().__init__()
        self.state_dim = state_dim
        self.hidden_dim = hidden_dim

        # Time embedding: scalar t -> hidden_dim
        self.time_embed = nn.Sequential(
            nn.Linear(1, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim),
        )

        # Input projection
        self.input_proj = nn.Linear(state_dim, hidden_dim)

        # Residual MLP blocks
        self.blocks = nn.ModuleList()
        for _ in range(n_blocks):
            self.blocks.append(
                nn.Sequential(
                    nn.LayerNorm(hidden_dim),
                    nn.Linear(hidden_dim, hidden_dim),
                    nn.SiLU(),
                    nn.Linear(hidden_dim, hidden_dim),
                    nn.SiLU(),
                )
            )
        self.block_norms = nn.ModuleList(
            [nn.LayerNorm(hidden_dim) for _ in range(n_blocks)]
        )

        # Output projection back to state space
        self.output_proj = nn.Sequential(
            nn.LayerNorm(hidden_dim),
            nn.Linear(hidden_dim, state_dim),
        )

    def forward(self, t: torch.Tensor, h: torch.Tensor) -> torch.Tensor:
        """
        Compute dh/dt.

        Args:
            t: scalar time tensor (shape () or (1,)).
            h: graph state tensor (N, state_dim) where N is number of nodes.

        Returns:
            dh_dt: (N, state_dim) -- time derivative of the state.
        """
        # Ensure t is (1,) for the linear layer
        t_input = t.reshape(1)
        t_emb = self.time_embed(t_input)  # (hidden_dim,)

        x = self.input_proj(h)  # (N, hidden_dim)
        x = x + t_emb.unsqueeze(0)  # broadcast time embedding

        for block, norm in zip(self.blocks, self.block_norms):
            residual = x
            x = block(x)
            x = norm(x + residual)  # residual connection

        dh_dt = self.output_proj(x)  # (N, state_dim)
        return dh_dt


# ---------------------------------------------------------------------------
# ODE Solvers
# ---------------------------------------------------------------------------

def _euler_step(
    func: ODEFunc,
    h: torch.Tensor,
    t: torch.Tensor,
    dt: torch.Tensor,
) -> torch.Tensor:
    """Single Euler integration step: h_{t+dt} = h_t + dt * f(t, h_t)."""
    return h + dt * func(t, h)


def _rk4_step(
    func: ODEFunc,
    h: torch.Tensor,
    t: torch.Tensor,
    dt: torch.Tensor,
) -> torch.Tensor:
    """Single RK4 integration step."""
    half_dt = 0.5 * dt
    k1 = func(t, h)
    k2 = func(t + half_dt, h + half_dt * k1)
    k3 = func(t + half_dt, h + half_dt * k2)
    k4 = func(t + dt, h + dt * k3)
    return h + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)


# ---------------------------------------------------------------------------
# NeuralODE
# ---------------------------------------------------------------------------

class NeuralODE(nn.Module):
    """
    Neural ODE for continuous-time stress redistribution in infrastructure.

    Integrates dh/dt = f_theta(h, t) from t0 to t1, returning the full
    trajectory of hidden states. Includes physics regularisation penalties
    for flow conservation, load redistribution, and thermal dynamics.
    """

    def __init__(
        self,
        state_dim: int,
        hidden_dim: int = 64,
        n_blocks: int = 2,
        solver: str = "rk4",
    ) -> None:
        super().__init__()
        self.state_dim = state_dim
        self.func = ODEFunc(state_dim, hidden_dim, n_blocks)
        self.solver = SolverType(solver)

        # Physics regularisation weight parameters (learnable scaling)
        self.flow_weight = nn.Parameter(torch.tensor(1.0))
        self.load_weight = nn.Parameter(torch.tensor(1.0))
        self.thermal_weight = nn.Parameter(torch.tensor(1.0))

    def forward(
        self,
        h0: torch.Tensor,
        t_span: Tuple[float, float],
        n_steps: int = 50,
    ) -> torch.Tensor:
        """
        Integrate the ODE from t_span[0] to t_span[1].

        Args:
            h0:     (N, state_dim) initial graph state.
            t_span: (t_start, t_end) time interval.
            n_steps: number of integration steps.

        Returns:
            trajectory: (n_steps + 1, N, state_dim) states at each timestep
                        including the initial state.
        """
        device = h0.device
        t_start, t_end = t_span
        dt = torch.tensor(
            (t_end - t_start) / n_steps, dtype=h0.dtype, device=device
        )

        step_fn = _rk4_step if self.solver == SolverType.RK4 else _euler_step

        trajectory: List[torch.Tensor] = [h0]
        h = h0
        t = torch.tensor(t_start, dtype=h0.dtype, device=device)

        for _ in range(n_steps):
            h = step_fn(self.func, h, t, dt)
            t = t + dt
            trajectory.append(h)

        return torch.stack(trajectory, dim=0)  # (n_steps+1, N, state_dim)

    def physics_regularization(
        self,
        h: torch.Tensor,
        dh_dt: torch.Tensor,
    ) -> torch.Tensor:
        """
        Compute physics-based regularisation penalty.

        Three components:
        1. **Flow conservation**: net change across all nodes should be ~zero
           (energy/mass is neither created nor destroyed in steady-state).
        2. **Load redistribution**: when one node sheds load, neighbouring
           nodes should absorb it -- penalise large imbalances.
        3. **Thermal dynamics**: temperature changes (modelled as the last
           channel of h) should be smooth and bounded.

        Args:
            h:     (N, state_dim) current graph state.
            dh_dt: (N, state_dim) time derivative of the state.

        Returns:
            penalty: scalar regularisation loss.
        """
        # 1. Flow conservation: sum of all state changes should be near zero.
        #    This encodes that infrastructure is a closed system in aggregate.
        flow_penalty = torch.sum(dh_dt, dim=0).pow(2).mean()

        # 2. Load redistribution: penalise variance of state derivatives
        #    across nodes -- extreme outliers indicate unphysical spikes.
        load_penalty = dh_dt.var(dim=0).mean()

        # 3. Thermal smoothness: penalise large magnitudes of dh/dt
        #    (temperature/stress cannot change infinitely fast).
        thermal_penalty = dh_dt.pow(2).mean()

        penalty = (
            self.flow_weight.abs() * flow_penalty
            + self.load_weight.abs() * load_penalty
            + self.thermal_weight.abs() * thermal_penalty
        )
        return penalty

    def compute_regularized_loss(
        self,
        h0: torch.Tensor,
        t: float = 0.0,
        reg_coeff: float = 0.01,
    ) -> torch.Tensor:
        """
        Convenience: compute dh/dt at time *t* and return the physics penalty.

        Useful during training to add as a loss term.
        """
        t_tensor = torch.tensor(t, dtype=h0.dtype, device=h0.device)
        dh_dt = self.func(t_tensor, h0)
        return reg_coeff * self.physics_regularization(h0, dh_dt)
