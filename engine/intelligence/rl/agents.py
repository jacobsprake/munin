"""
Hierarchical RL agents for infrastructure response optimisation.

Three agents operate at different time scales:
  - StrategicAgent (PPO): 5-minute cycle, selects playbooks + ministries
  - TacticalAgent (SAC): 30-second cycle, optimises authorization routing
  - ResourceAgent: pre-positions crews, equipment, and barriers
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.distributions import Categorical, Normal


# ---------------------------------------------------------------------------
# Shared MLP builder
# ---------------------------------------------------------------------------

def build_mlp(
    input_dim: int,
    hidden_dims: List[int],
    output_dim: int,
    activation: str = "relu",
    output_activation: Optional[str] = None,
) -> nn.Sequential:
    """Build a multi-layer perceptron."""
    layers: List[nn.Module] = []
    prev_dim = input_dim
    act_fn = {"relu": nn.ReLU, "tanh": nn.Tanh, "elu": nn.ELU}

    for h_dim in hidden_dims:
        layers.append(nn.Linear(prev_dim, h_dim))
        layers.append(act_fn.get(activation, nn.ReLU)())
        prev_dim = h_dim

    layers.append(nn.Linear(prev_dim, output_dim))
    if output_activation is not None:
        layers.append(act_fn.get(output_activation, nn.ReLU)())

    return nn.Sequential(*layers)


# ---------------------------------------------------------------------------
# Replay / trajectory storage
# ---------------------------------------------------------------------------

@dataclass
class Transition:
    """A single environment transition."""
    state: np.ndarray
    action: np.ndarray
    reward: float
    next_state: np.ndarray
    done: bool
    log_prob: float = 0.0
    value: float = 0.0


class ReplayBuffer:
    """Simple replay buffer for off-policy methods (SAC)."""

    def __init__(self, capacity: int = 100_000) -> None:
        self._capacity = capacity
        self._buffer: List[Transition] = []
        self._idx = 0

    def push(self, transition: Transition) -> None:
        if len(self._buffer) < self._capacity:
            self._buffer.append(transition)
        else:
            self._buffer[self._idx % self._capacity] = transition
        self._idx += 1

    def sample(self, batch_size: int) -> List[Transition]:
        indices = np.random.randint(0, len(self._buffer), size=batch_size)
        return [self._buffer[i] for i in indices]

    def __len__(self) -> int:
        return len(self._buffer)


class TrajectoryBuffer:
    """Stores complete trajectories for on-policy methods (PPO)."""

    def __init__(self) -> None:
        self._trajectories: List[Transition] = []

    def push(self, transition: Transition) -> None:
        self._trajectories.append(transition)

    def get_all(self) -> List[Transition]:
        return list(self._trajectories)

    def clear(self) -> None:
        self._trajectories.clear()

    def __len__(self) -> int:
        return len(self._trajectories)


# ===========================================================================
# STRATEGIC AGENT — PPO
# ===========================================================================

class StrategicAgent(nn.Module):
    """PPO agent for strategic response decisions.

    Operates on a 5-minute decision cycle. Selects which playbook to
    activate and which ministry to engage.

    Parameters
    ----------
    state_dim : int
        Observation dimension.
    n_playbooks : int
        Number of available response playbooks (discrete action).
    n_ministries : int
        Number of ministries (discrete action).
    hidden_dims : list of int
        Hidden layer sizes for policy and value networks.
    lr : float
        Learning rate.
    gamma : float
        Discount factor.
    clip_eps : float
        PPO clipping epsilon.
    entropy_coeff : float
        Entropy bonus coefficient.
    """

    def __init__(
        self,
        state_dim: int,
        n_playbooks: int = 10,
        n_ministries: int = 5,
        hidden_dims: Optional[List[int]] = None,
        lr: float = 3e-4,
        gamma: float = 0.99,
        clip_eps: float = 0.2,
        entropy_coeff: float = 0.01,
    ) -> None:
        super().__init__()
        if hidden_dims is None:
            hidden_dims = [256, 256]

        self.state_dim = state_dim
        self.n_playbooks = n_playbooks
        self.n_ministries = n_ministries
        self.gamma = gamma
        self.clip_eps = clip_eps
        self.entropy_coeff = entropy_coeff

        # Policy network: shared backbone -> two action heads
        self.backbone = build_mlp(state_dim, hidden_dims[:-1], hidden_dims[-1])
        self.playbook_head = nn.Linear(hidden_dims[-1], n_playbooks)
        self.ministry_head = nn.Linear(hidden_dims[-1], n_ministries)

        # Value network
        self.value_net = build_mlp(state_dim, hidden_dims, 1)

        # Optimiser
        self.optimizer = torch.optim.Adam(self.parameters(), lr=lr)

        # Trajectory buffer
        self.buffer = TrajectoryBuffer()

    def forward(self, state: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Forward pass through policy backbone."""
        features = self.backbone(state)
        playbook_logits = self.playbook_head(features)
        ministry_logits = self.ministry_head(features)
        return playbook_logits, ministry_logits

    def select_action(
        self, state: np.ndarray
    ) -> Tuple[np.ndarray, float, float]:
        """Select action given current state.

        Returns
        -------
        action : ndarray of shape (2,) — [playbook_id, ministry_id]
        log_prob : float — log probability of action
        value : float — state value estimate
        """
        state_t = torch.FloatTensor(state).unsqueeze(0)

        with torch.no_grad():
            pb_logits, min_logits = self.forward(state_t)
            value = self.value_net(state_t).item()

        pb_dist = Categorical(logits=pb_logits.squeeze(0))
        min_dist = Categorical(logits=min_logits.squeeze(0))

        pb_action = pb_dist.sample()
        min_action = min_dist.sample()

        log_prob = (pb_dist.log_prob(pb_action) + min_dist.log_prob(min_action)).item()

        action = np.array(
            [pb_action.item(), min_action.item()], dtype=np.float32
        )
        return action, log_prob, value

    def evaluate_actions(
        self,
        states: torch.Tensor,
        actions: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Evaluate log-probs, entropy, and values for a batch of (s, a).

        Parameters
        ----------
        states : Tensor (batch, state_dim)
        actions : Tensor (batch, 2) — [playbook_ids, ministry_ids]

        Returns
        -------
        log_probs : Tensor (batch,)
        entropy : Tensor (batch,)
        values : Tensor (batch,)
        """
        pb_logits, min_logits = self.forward(states)
        values = self.value_net(states).squeeze(-1)

        pb_dist = Categorical(logits=pb_logits)
        min_dist = Categorical(logits=min_logits)

        pb_ids = actions[:, 0].long()
        min_ids = actions[:, 1].long()

        log_probs = pb_dist.log_prob(pb_ids) + min_dist.log_prob(min_ids)
        entropy = pb_dist.entropy() + min_dist.entropy()

        return log_probs, entropy, values

    def update(self, trajectories: Optional[List[Transition]] = None) -> Dict[str, float]:
        """PPO update with clipped surrogate objective.

        Parameters
        ----------
        trajectories : list of Transition, optional
            If None, uses internal buffer.

        Returns
        -------
        dict with training metrics.
        """
        if trajectories is None:
            trajectories = self.buffer.get_all()

        if not trajectories:
            return {"loss": 0.0}

        # Compute returns and advantages
        returns = self._compute_returns(trajectories)

        # Convert to tensors
        states = torch.FloatTensor(np.stack([t.state for t in trajectories]))
        actions = torch.FloatTensor(np.stack([t.action for t in trajectories]))
        old_log_probs = torch.FloatTensor([t.log_prob for t in trajectories])
        old_values = torch.FloatTensor([t.value for t in trajectories])
        returns_t = torch.FloatTensor(returns)

        advantages = returns_t - old_values
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

        # PPO update (single epoch for simplicity; can loop multiple times)
        for _ in range(4):
            log_probs, entropy, values = self.evaluate_actions(states, actions)

            ratio = torch.exp(log_probs - old_log_probs)
            surr1 = ratio * advantages
            surr2 = torch.clamp(
                ratio, 1.0 - self.clip_eps, 1.0 + self.clip_eps
            ) * advantages

            policy_loss = -torch.min(surr1, surr2).mean()
            value_loss = F.mse_loss(values, returns_t)
            entropy_loss = -entropy.mean()

            loss = policy_loss + 0.5 * value_loss + self.entropy_coeff * entropy_loss

            self.optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(self.parameters(), 0.5)
            self.optimizer.step()

        self.buffer.clear()

        return {
            "policy_loss": policy_loss.item(),
            "value_loss": value_loss.item(),
            "entropy": -entropy_loss.item(),
            "total_loss": loss.item(),
        }

    def _compute_returns(
        self, trajectories: List[Transition]
    ) -> np.ndarray:
        """Compute discounted returns."""
        returns = np.zeros(len(trajectories), dtype=np.float32)
        running_return = 0.0
        for i in reversed(range(len(trajectories))):
            if trajectories[i].done:
                running_return = 0.0
            running_return = (
                trajectories[i].reward + self.gamma * running_return
            )
            returns[i] = running_return
        return returns


# ===========================================================================
# TACTICAL AGENT — SAC-style
# ===========================================================================

class TacticalAgent(nn.Module):
    """SAC-style agent for tactical authorization routing.

    Operates on a 30-second decision cycle. Outputs continuous routing
    priority weights.

    Parameters
    ----------
    state_dim : int
        Observation dimension.
    action_dim : int
        Continuous action dimension (routing priority weights).
    hidden_dims : list of int
        Hidden layer sizes.
    lr : float
        Learning rate.
    gamma : float
        Discount factor.
    tau : float
        Soft target network update rate.
    alpha : float
        SAC entropy temperature.
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int = 5,
        hidden_dims: Optional[List[int]] = None,
        lr: float = 3e-4,
        gamma: float = 0.99,
        tau: float = 0.005,
        alpha: float = 0.2,
    ) -> None:
        super().__init__()
        if hidden_dims is None:
            hidden_dims = [256, 256]

        self.state_dim = state_dim
        self.action_dim = action_dim
        self.gamma = gamma
        self.tau = tau
        self.alpha = alpha

        # Policy network (Gaussian): outputs mean and log_std
        self.policy_backbone = build_mlp(state_dim, hidden_dims, hidden_dims[-1])
        self.mean_head = nn.Linear(hidden_dims[-1], action_dim)
        self.log_std_head = nn.Linear(hidden_dims[-1], action_dim)

        # Twin Q-networks
        self.q1 = build_mlp(state_dim + action_dim, hidden_dims, 1)
        self.q2 = build_mlp(state_dim + action_dim, hidden_dims, 1)

        # Target Q-networks
        self.q1_target = build_mlp(state_dim + action_dim, hidden_dims, 1)
        self.q2_target = build_mlp(state_dim + action_dim, hidden_dims, 1)
        self._hard_update_targets()

        # Optimisers
        policy_params = (
            list(self.policy_backbone.parameters())
            + list(self.mean_head.parameters())
            + list(self.log_std_head.parameters())
        )
        self.policy_optimizer = torch.optim.Adam(policy_params, lr=lr)
        self.q1_optimizer = torch.optim.Adam(self.q1.parameters(), lr=lr)
        self.q2_optimizer = torch.optim.Adam(self.q2.parameters(), lr=lr)

        # Replay buffer
        self.buffer = ReplayBuffer(capacity=100_000)

        # Log-std bounds
        self._log_std_min = -20.0
        self._log_std_max = 2.0

    def _hard_update_targets(self) -> None:
        self.q1_target.load_state_dict(self.q1.state_dict())
        self.q2_target.load_state_dict(self.q2.state_dict())

    def _soft_update_targets(self) -> None:
        for tp, p in zip(self.q1_target.parameters(), self.q1.parameters()):
            tp.data.copy_(self.tau * p.data + (1.0 - self.tau) * tp.data)
        for tp, p in zip(self.q2_target.parameters(), self.q2.parameters()):
            tp.data.copy_(self.tau * p.data + (1.0 - self.tau) * tp.data)

    def _get_policy_distribution(
        self, state: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Get mean and std from policy network."""
        features = self.policy_backbone(state)
        mean = self.mean_head(features)
        log_std = self.log_std_head(features)
        log_std = torch.clamp(log_std, self._log_std_min, self._log_std_max)
        return mean, log_std.exp()

    def _sample_action(
        self, state: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Sample action using reparameterisation trick with tanh squashing."""
        mean, std = self._get_policy_distribution(state)
        dist = Normal(mean, std)
        z = dist.rsample()
        action = torch.tanh(z)

        # Log-prob with tanh correction
        log_prob = dist.log_prob(z) - torch.log(1 - action.pow(2) + 1e-6)
        log_prob = log_prob.sum(dim=-1, keepdim=True)

        return action, log_prob

    def select_action(self, state: np.ndarray) -> np.ndarray:
        """Select action given current state.

        Returns
        -------
        action : ndarray of shape (action_dim,) in [-1, 1]
        """
        state_t = torch.FloatTensor(state).unsqueeze(0)
        with torch.no_grad():
            action, _ = self._sample_action(state_t)
        return action.squeeze(0).numpy()

    def update(self, batch_size: int = 256) -> Dict[str, float]:
        """SAC update step.

        Parameters
        ----------
        batch_size : int

        Returns
        -------
        dict with training metrics.
        """
        if len(self.buffer) < batch_size:
            return {"q_loss": 0.0, "policy_loss": 0.0}

        batch = self.buffer.sample(batch_size)

        states = torch.FloatTensor(np.stack([t.state for t in batch]))
        actions = torch.FloatTensor(np.stack([t.action for t in batch]))
        rewards = torch.FloatTensor([t.reward for t in batch]).unsqueeze(1)
        next_states = torch.FloatTensor(np.stack([t.next_state for t in batch]))
        dones = torch.FloatTensor([float(t.done) for t in batch]).unsqueeze(1)

        # --- Q-function update ---
        with torch.no_grad():
            next_action, next_log_prob = self._sample_action(next_states)
            sa_next = torch.cat([next_states, next_action], dim=-1)
            q1_target = self.q1_target(sa_next)
            q2_target = self.q2_target(sa_next)
            q_target = torch.min(q1_target, q2_target) - self.alpha * next_log_prob
            target = rewards + self.gamma * (1 - dones) * q_target

        sa = torch.cat([states, actions], dim=-1)
        q1_pred = self.q1(sa)
        q2_pred = self.q2(sa)
        q1_loss = F.mse_loss(q1_pred, target)
        q2_loss = F.mse_loss(q2_pred, target)

        self.q1_optimizer.zero_grad()
        q1_loss.backward()
        self.q1_optimizer.step()

        self.q2_optimizer.zero_grad()
        q2_loss.backward()
        self.q2_optimizer.step()

        # --- Policy update ---
        new_action, new_log_prob = self._sample_action(states)
        sa_new = torch.cat([states, new_action], dim=-1)
        q1_new = self.q1(sa_new)
        q2_new = self.q2(sa_new)
        q_new = torch.min(q1_new, q2_new)

        policy_loss = (self.alpha * new_log_prob - q_new).mean()

        self.policy_optimizer.zero_grad()
        policy_loss.backward()
        self.policy_optimizer.step()

        # --- Soft target update ---
        self._soft_update_targets()

        return {
            "q1_loss": q1_loss.item(),
            "q2_loss": q2_loss.item(),
            "policy_loss": policy_loss.item(),
        }


# ===========================================================================
# RESOURCE AGENT
# ===========================================================================

class ResourceAgent(nn.Module):
    """Agent for pre-positioning resources (crews, equipment, barriers).

    Uses a simple actor-critic architecture with deterministic policy
    and additive exploration noise.

    Parameters
    ----------
    state_dim : int
        Observation dimension.
    action_dim : int
        Number of resource types to allocate.
    hidden_dims : list of int
        Hidden layer sizes.
    lr : float
        Learning rate.
    gamma : float
        Discount factor.
    noise_std : float
        Exploration noise standard deviation.
    """

    def __init__(
        self,
        state_dim: int,
        action_dim: int = 8,
        hidden_dims: Optional[List[int]] = None,
        lr: float = 3e-4,
        gamma: float = 0.99,
        noise_std: float = 0.1,
    ) -> None:
        super().__init__()
        if hidden_dims is None:
            hidden_dims = [256, 128]

        self.state_dim = state_dim
        self.action_dim = action_dim
        self.gamma = gamma
        self.noise_std = noise_std

        # Actor: deterministic policy
        self.actor = build_mlp(state_dim, hidden_dims, action_dim)
        self.actor_output = nn.Sigmoid()  # Resource weights in [0, 1]

        # Critic: state-action value
        self.critic = build_mlp(state_dim + action_dim, hidden_dims, 1)

        # Target networks
        self.actor_target = build_mlp(state_dim, hidden_dims, action_dim)
        self.critic_target = build_mlp(state_dim + action_dim, hidden_dims, 1)
        self.actor_target.load_state_dict(self.actor.state_dict())
        self.critic_target.load_state_dict(self.critic.state_dict())

        self.actor_optimizer = torch.optim.Adam(
            list(self.actor.parameters()), lr=lr
        )
        self.critic_optimizer = torch.optim.Adam(
            self.critic.parameters(), lr=lr
        )

        self.buffer = ReplayBuffer(capacity=100_000)
        self._tau = 0.005

    def select_action(
        self, state: np.ndarray, explore: bool = True
    ) -> np.ndarray:
        """Select resource allocation vector.

        Returns
        -------
        action : ndarray of shape (action_dim,) in [0, 1]
        """
        state_t = torch.FloatTensor(state).unsqueeze(0)
        with torch.no_grad():
            action = self.actor_output(self.actor(state_t)).squeeze(0).numpy()

        if explore:
            noise = np.random.randn(self.action_dim) * self.noise_std
            action = np.clip(action + noise, 0.0, 1.0)

        return action.astype(np.float32)

    def update(self, batch_size: int = 256) -> Dict[str, float]:
        """DDPG-style update.

        Parameters
        ----------
        batch_size : int

        Returns
        -------
        dict with training metrics.
        """
        if len(self.buffer) < batch_size:
            return {"critic_loss": 0.0, "actor_loss": 0.0}

        batch = self.buffer.sample(batch_size)

        states = torch.FloatTensor(np.stack([t.state for t in batch]))
        actions = torch.FloatTensor(np.stack([t.action for t in batch]))
        rewards = torch.FloatTensor([t.reward for t in batch]).unsqueeze(1)
        next_states = torch.FloatTensor(np.stack([t.next_state for t in batch]))
        dones = torch.FloatTensor([float(t.done) for t in batch]).unsqueeze(1)

        # --- Critic update ---
        with torch.no_grad():
            next_action = torch.sigmoid(self.actor_target(next_states))
            sa_next = torch.cat([next_states, next_action], dim=-1)
            q_target = rewards + self.gamma * (1 - dones) * self.critic_target(sa_next)

        sa = torch.cat([states, actions], dim=-1)
        q_pred = self.critic(sa)
        critic_loss = F.mse_loss(q_pred, q_target)

        self.critic_optimizer.zero_grad()
        critic_loss.backward()
        self.critic_optimizer.step()

        # --- Actor update ---
        new_action = self.actor_output(self.actor(states))
        sa_new = torch.cat([states, new_action], dim=-1)
        actor_loss = -self.critic(sa_new).mean()

        self.actor_optimizer.zero_grad()
        actor_loss.backward()
        self.actor_optimizer.step()

        # --- Soft target update ---
        for tp, p in zip(
            self.actor_target.parameters(), self.actor.parameters()
        ):
            tp.data.copy_(self._tau * p.data + (1 - self._tau) * tp.data)
        for tp, p in zip(
            self.critic_target.parameters(), self.critic.parameters()
        ):
            tp.data.copy_(self._tau * p.data + (1 - self._tau) * tp.data)

        return {
            "critic_loss": critic_loss.item(),
            "actor_loss": actor_loss.item(),
        }
