"""
RL training pipeline for hierarchical response optimisation.

Coordinates training of Strategic (PPO), Tactical (SAC), and Resource (DDPG)
agents in a hierarchical loop, with logging and checkpoint management.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch

from .agents import (
    ReplayBuffer,
    ResourceAgent,
    StrategicAgent,
    TacticalAgent,
    Transition,
    TrajectoryBuffer,
)
from .environment import ResponseEnvironment
from .reward import compute_reward_detailed

from engine.logger import get_logger

log = get_logger(__name__)


@dataclass
class TrainingMetrics:
    """Accumulates training metrics across episodes."""

    episode_rewards: List[float] = field(default_factory=list)
    episode_lengths: List[int] = field(default_factory=list)
    strategic_losses: List[Dict] = field(default_factory=list)
    tactical_losses: List[Dict] = field(default_factory=list)
    resource_losses: List[Dict] = field(default_factory=list)
    eval_rewards: List[float] = field(default_factory=list)

    def summary(self, last_n: int = 100) -> Dict:
        recent_rewards = self.episode_rewards[-last_n:]
        recent_lengths = self.episode_lengths[-last_n:]
        return {
            "n_episodes": len(self.episode_rewards),
            "mean_reward": float(np.mean(recent_rewards)) if recent_rewards else 0.0,
            "std_reward": float(np.std(recent_rewards)) if recent_rewards else 0.0,
            "mean_length": float(np.mean(recent_lengths)) if recent_lengths else 0.0,
            "best_reward": float(max(self.episode_rewards)) if self.episode_rewards else 0.0,
        }


class RLTrainer:
    """Hierarchical RL training pipeline.

    Coordinates training of three agents at different time scales:
      - Strategic: updated every episode (PPO, on-policy)
      - Tactical: updated every N steps (SAC, off-policy)
      - Resource: updated every N steps (DDPG, off-policy)

    Parameters
    ----------
    env : ResponseEnvironment
        The response optimisation environment.
    strategic : StrategicAgent
        PPO agent for strategic decisions.
    tactical : TacticalAgent
        SAC agent for authorization routing.
    resource : ResourceAgent
        DDPG agent for resource pre-positioning.
    strategic_interval : int
        Strategic agent acts every N environment steps (default 10 = 5 min).
    tactical_interval : int
        Tactical agent acts every N environment steps (default 1 = 30 sec).
    update_every : int
        Off-policy agents update every N steps.
    """

    def __init__(
        self,
        env: ResponseEnvironment,
        strategic: StrategicAgent,
        tactical: TacticalAgent,
        resource: ResourceAgent,
        strategic_interval: int = 10,
        tactical_interval: int = 1,
        update_every: int = 4,
    ) -> None:
        self.env = env
        self.strategic = strategic
        self.tactical = tactical
        self.resource = resource
        self.strategic_interval = strategic_interval
        self.tactical_interval = tactical_interval
        self.update_every = update_every
        self.metrics = TrainingMetrics()

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(
        self,
        n_episodes: int = 10_000,
        log_interval: int = 100,
        eval_interval: int = 500,
        eval_episodes: int = 20,
        checkpoint_dir: Optional[str] = None,
    ) -> TrainingMetrics:
        """Run the hierarchical training loop.

        Parameters
        ----------
        n_episodes : int
            Total training episodes.
        log_interval : int
            Print metrics every N episodes.
        eval_interval : int
            Run evaluation every N episodes.
        eval_episodes : int
            Number of episodes per evaluation.
        checkpoint_dir : str, optional
            Directory for saving checkpoints.

        Returns
        -------
        TrainingMetrics
        """
        if checkpoint_dir is not None:
            os.makedirs(checkpoint_dir, exist_ok=True)

        best_eval_reward = -float("inf")

        for episode in range(1, n_episodes + 1):
            episode_reward, episode_length = self._run_episode(
                training=True
            )
            self.metrics.episode_rewards.append(episode_reward)
            self.metrics.episode_lengths.append(episode_length)

            # Update strategic agent (on-policy: update after each episode)
            if len(self.strategic.buffer) > 0:
                strat_loss = self.strategic.update()
                self.metrics.strategic_losses.append(strat_loss)

            # Logging
            if episode % log_interval == 0:
                summary = self.metrics.summary(last_n=log_interval)
                log.info(
                    f"[Episode {episode}/{n_episodes}] "
                    f"reward={summary['mean_reward']:.1f} +/- {summary['std_reward']:.1f}  "
                    f"length={summary['mean_length']:.0f}"
                )

            # Evaluation
            if episode % eval_interval == 0:
                eval_reward = self._evaluate(n_episodes=eval_episodes)
                self.metrics.eval_rewards.append(eval_reward)
                log.info(f"[Eval] mean_reward={eval_reward:.1f}")

                # Checkpoint best model
                if checkpoint_dir is not None and eval_reward > best_eval_reward:
                    best_eval_reward = eval_reward
                    self.save(os.path.join(checkpoint_dir, "best"))
                    log.info(f"[Checkpoint] New best: {best_eval_reward:.1f}")

        # Final checkpoint
        if checkpoint_dir is not None:
            self.save(os.path.join(checkpoint_dir, "final"))

        return self.metrics

    def _run_episode(self, training: bool = True) -> Tuple[float, int]:
        """Run a single episode, collecting transitions for all agents.

        Returns (total_reward, episode_length).
        """
        state = self.env.reset()
        total_reward = 0.0
        step_count = 0
        done = False

        # Track last strategic action for the interval
        strategic_action = None
        strategic_log_prob = 0.0
        strategic_value = 0.0
        strategic_state = state.copy()

        while not done:
            step_count += 1

            # --- Strategic agent (every strategic_interval steps) ---
            if step_count % self.strategic_interval == 1 or strategic_action is None:
                strategic_state = state.copy()
                strategic_action, strategic_log_prob, strategic_value = (
                    self.strategic.select_action(state)
                )

            # --- Tactical agent (every tactical_interval steps) ---
            tactical_action = self.tactical.select_action(state)

            # --- Resource agent (every step) ---
            resource_action = self.resource.select_action(
                state, explore=training
            )

            # Combine actions into environment action format:
            # [playbook_prob, ministry_prob, resource_weights...]
            n_pb = self.strategic.n_playbooks
            n_min = self.strategic.n_ministries
            combined_action = np.zeros(self.env.action_dim, dtype=np.float32)
            combined_action[0] = strategic_action[0] / max(n_pb, 1)
            combined_action[1] = strategic_action[1] / max(n_min, 1)

            # Tactical modulates the routing (add priority weights)
            tact_dim = min(len(tactical_action), self.env.action_dim - 2)
            combined_action[2 : 2 + tact_dim] += (
                np.clip(tactical_action[:tact_dim], -1, 1) * 0.3
            )

            # Resource allocation fills remaining action dimensions
            res_dim = min(len(resource_action), self.env.action_dim - 2)
            combined_action[2 : 2 + res_dim] += resource_action[:res_dim]
            combined_action[2:] = np.clip(combined_action[2:], 0, 1)

            # Step environment
            next_state, reward, done, info = self.env.step(combined_action)
            total_reward += reward

            if training:
                # Store strategic transition (at interval boundaries)
                if step_count % self.strategic_interval == 0 or done:
                    self.strategic.buffer.push(
                        Transition(
                            state=strategic_state,
                            action=strategic_action,
                            reward=reward * self.strategic_interval,
                            next_state=next_state,
                            done=done,
                            log_prob=strategic_log_prob,
                            value=strategic_value,
                        )
                    )

                # Store tactical transition
                self.tactical.buffer.push(
                    Transition(
                        state=state,
                        action=tactical_action,
                        reward=reward,
                        next_state=next_state,
                        done=done,
                    )
                )

                # Store resource transition
                self.resource.buffer.push(
                    Transition(
                        state=state,
                        action=resource_action,
                        reward=reward,
                        next_state=next_state,
                        done=done,
                    )
                )

                # Off-policy updates
                if step_count % self.update_every == 0:
                    tact_loss = self.tactical.update()
                    if tact_loss.get("q1_loss", 0) > 0:
                        self.metrics.tactical_losses.append(tact_loss)

                    res_loss = self.resource.update()
                    if res_loss.get("critic_loss", 0) > 0:
                        self.metrics.resource_losses.append(res_loss)

            state = next_state

        return total_reward, step_count

    # ------------------------------------------------------------------
    # Evaluation
    # ------------------------------------------------------------------

    def _evaluate(self, n_episodes: int = 20) -> float:
        """Evaluate agents without exploration or training.

        Returns mean reward over evaluation episodes.
        """
        rewards = []
        for _ in range(n_episodes):
            reward, _ = self._run_episode(training=False)
            rewards.append(reward)
        return float(np.mean(rewards))

    def evaluate(self, n_episodes: int = 100) -> Dict:
        """Full evaluation with detailed metrics.

        Parameters
        ----------
        n_episodes : int

        Returns
        -------
        dict with evaluation statistics.
        """
        rewards = []
        lengths = []
        for _ in range(n_episodes):
            reward, length = self._run_episode(training=False)
            rewards.append(reward)
            lengths.append(length)

        return {
            "mean_reward": float(np.mean(rewards)),
            "std_reward": float(np.std(rewards)),
            "min_reward": float(np.min(rewards)),
            "max_reward": float(np.max(rewards)),
            "mean_length": float(np.mean(lengths)),
            "n_episodes": n_episodes,
        }

    # ------------------------------------------------------------------
    # Save / Load
    # ------------------------------------------------------------------

    def save(self, path: str) -> None:
        """Save all agent parameters and training metrics.

        Parameters
        ----------
        path : str
            Directory path for the checkpoint.
        """
        os.makedirs(path, exist_ok=True)

        torch.save(self.strategic.state_dict(), os.path.join(path, "strategic.pt"))
        torch.save(self.tactical.state_dict(), os.path.join(path, "tactical.pt"))
        torch.save(self.resource.state_dict(), os.path.join(path, "resource.pt"))

        # Save metrics
        metrics_data = {
            "episode_rewards": self.metrics.episode_rewards,
            "episode_lengths": self.metrics.episode_lengths,
            "eval_rewards": self.metrics.eval_rewards,
        }
        with open(os.path.join(path, "metrics.json"), "w") as f:
            json.dump(metrics_data, f)

    def load(self, path: str) -> None:
        """Load agent parameters from a checkpoint.

        Parameters
        ----------
        path : str
            Directory path of the checkpoint.
        """
        strategic_path = os.path.join(path, "strategic.pt")
        tactical_path = os.path.join(path, "tactical.pt")
        resource_path = os.path.join(path, "resource.pt")

        if os.path.exists(strategic_path):
            self.strategic.load_state_dict(
                torch.load(strategic_path, map_location="cpu", weights_only=True)
            )
        if os.path.exists(tactical_path):
            self.tactical.load_state_dict(
                torch.load(tactical_path, map_location="cpu", weights_only=True)
            )
        if os.path.exists(resource_path):
            self.resource.load_state_dict(
                torch.load(resource_path, map_location="cpu", weights_only=True)
            )

        # Load metrics
        metrics_path = os.path.join(path, "metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, "r") as f:
                data = json.load(f)
            self.metrics.episode_rewards = data.get("episode_rewards", [])
            self.metrics.episode_lengths = data.get("episode_lengths", [])
            self.metrics.eval_rewards = data.get("eval_rewards", [])
