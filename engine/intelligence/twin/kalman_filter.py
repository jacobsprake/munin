"""
Ensemble Kalman Filter (EnKF) for data assimilation.

Assimilates live sensor observations into the digital twin state to keep
the simulation synchronised with physical reality. Implements the standard
EnKF update:

    x_a = x_f + K (y - H x_f)

where K = P_f H^T (H P_f H^T + R)^{-1}

and the ensemble approximation of P_f.
"""

from __future__ import annotations

from typing import Callable, Dict, Optional, Tuple

import numpy as np


class EnsembleKalmanFilter:
    """Ensemble Kalman Filter for multi-physics data assimilation.

    Parameters
    ----------
    state_dim : int
        Dimension of the state vector.
    obs_dim : int
        Dimension of the observation vector.
    ensemble_size : int
        Number of ensemble members (50 is a good default for moderate state dims).
    inflation_factor : float
        Multiplicative covariance inflation to prevent filter divergence (>= 1.0).
    """

    def __init__(
        self,
        state_dim: int,
        obs_dim: int,
        ensemble_size: int = 50,
        inflation_factor: float = 1.02,
    ) -> None:
        self.state_dim = state_dim
        self.obs_dim = obs_dim
        self.ensemble_size = ensemble_size
        self.inflation_factor = inflation_factor

        # Initialise ensemble around zero with small perturbations
        self._ensemble: np.ndarray = np.random.randn(
            ensemble_size, state_dim
        ) * 0.01  # (N_ens, state_dim)

        # Default observation operator: identity (first obs_dim states are observed)
        self._H: np.ndarray = np.zeros((obs_dim, state_dim), dtype=np.float64)
        for i in range(min(obs_dim, state_dim)):
            self._H[i, i] = 1.0

        self._divergence_history: list = []

    # ------------------------------------------------------------------
    # Initialisation helpers
    # ------------------------------------------------------------------

    def initialize_ensemble(
        self, mean: np.ndarray, std: np.ndarray
    ) -> None:
        """Initialise ensemble from a mean state and per-element std.

        Parameters
        ----------
        mean : ndarray of shape (state_dim,)
        std : ndarray of shape (state_dim,)
        """
        for i in range(self.ensemble_size):
            self._ensemble[i] = mean + std * np.random.randn(self.state_dim)

    def set_observation_operator(self, H: np.ndarray) -> None:
        """Set a custom observation operator H (obs_dim x state_dim)."""
        assert H.shape == (self.obs_dim, self.state_dim), (
            f"H must be ({self.obs_dim}, {self.state_dim}), got {H.shape}"
        )
        self._H = H.copy()

    # ------------------------------------------------------------------
    # Predict step
    # ------------------------------------------------------------------

    def predict(
        self,
        model_fn: Callable[[np.ndarray], np.ndarray],
        process_noise_std: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """Advance each ensemble member through the model.

        Parameters
        ----------
        model_fn : callable
            Takes a state vector (state_dim,) and returns the propagated
            state vector (state_dim,). This is typically one step of the
            physics engine.
        process_noise_std : ndarray of shape (state_dim,) or None
            Standard deviation of additive process noise. If None, no noise
            is added.

        Returns
        -------
        forecast_mean : ndarray of shape (state_dim,)
        """
        for i in range(self.ensemble_size):
            self._ensemble[i] = model_fn(self._ensemble[i])
            if process_noise_std is not None:
                self._ensemble[i] += (
                    process_noise_std * np.random.randn(self.state_dim)
                )

        # Covariance inflation
        mean = self._ensemble.mean(axis=0)
        self._ensemble = mean + self.inflation_factor * (self._ensemble - mean)

        return mean

    # ------------------------------------------------------------------
    # Update step (assimilation)
    # ------------------------------------------------------------------

    def update(
        self,
        observations: np.ndarray,
        obs_noise_cov: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Assimilate observations into the ensemble.

        Implements the stochastic EnKF update:
            x_a^i = x_f^i + K (y + eps_i - H x_f^i)

        where K = P_f H^T (H P_f H^T + R)^{-1} and eps_i ~ N(0, R).

        Parameters
        ----------
        observations : ndarray of shape (obs_dim,)
            Observed values.
        obs_noise_cov : ndarray of shape (obs_dim, obs_dim)
            Observation noise covariance matrix R.

        Returns
        -------
        analysis_mean : ndarray of shape (state_dim,)
            Updated state estimate.
        analysis_cov : ndarray of shape (state_dim, state_dim)
            Updated state covariance (ensemble approximation).
        """
        N = self.ensemble_size
        H = self._H
        y = observations

        # Forecast ensemble mean and anomalies
        x_f_mean = self._ensemble.mean(axis=0)  # (state_dim,)
        X_f = self._ensemble - x_f_mean  # (N, state_dim) anomalies

        # Forecast covariance in observation space
        HX_f = X_f @ H.T  # (N, obs_dim)
        P_HT = (X_f.T @ HX_f) / (N - 1)  # (state_dim, obs_dim)
        HPH_T = (HX_f.T @ HX_f) / (N - 1)  # (obs_dim, obs_dim)

        # Kalman gain: K = P_f H^T (H P_f H^T + R)^{-1}
        S = HPH_T + obs_noise_cov  # (obs_dim, obs_dim)
        try:
            S_inv = np.linalg.inv(S)
        except np.linalg.LinAlgError:
            # Fallback: pseudo-inverse
            S_inv = np.linalg.pinv(S)

        K = P_HT @ S_inv  # (state_dim, obs_dim)

        # Stochastic update: perturb observations for each member
        for i in range(N):
            eps = np.random.multivariate_normal(
                np.zeros(self.obs_dim), obs_noise_cov
            )
            y_perturbed = y + eps
            innovation = y_perturbed - H @ self._ensemble[i]
            self._ensemble[i] += K @ innovation

        # Compute analysis statistics
        analysis_mean = self._ensemble.mean(axis=0)
        X_a = self._ensemble - analysis_mean
        analysis_cov = (X_a.T @ X_a) / (N - 1)

        return analysis_mean, analysis_cov

    # ------------------------------------------------------------------
    # State estimate
    # ------------------------------------------------------------------

    def get_state_estimate(self) -> Tuple[np.ndarray, np.ndarray]:
        """Return the current ensemble mean and covariance.

        Returns
        -------
        mean : ndarray of shape (state_dim,)
        cov : ndarray of shape (state_dim, state_dim)
        """
        mean = self._ensemble.mean(axis=0)
        X = self._ensemble - mean
        cov = (X.T @ X) / (self.ensemble_size - 1)
        return mean, cov

    # ------------------------------------------------------------------
    # Divergence detection
    # ------------------------------------------------------------------

    def check_divergence(
        self,
        observations: np.ndarray,
        obs_noise_cov: np.ndarray,
        threshold: float = 3.0,
    ) -> Dict:
        """Check if the ensemble has diverged from observations.

        Computes the normalised innovation statistic. If any observation
        dimension exceeds *threshold* standard deviations, the filter
        is considered diverged.

        Parameters
        ----------
        observations : ndarray of shape (obs_dim,)
        obs_noise_cov : ndarray of shape (obs_dim, obs_dim)
        threshold : float
            Number of standard deviations beyond which divergence is flagged.

        Returns
        -------
        dict with keys:
            'diverged' : bool
            'max_innovation_std' : float — largest normalised innovation
            'innovation' : ndarray — raw innovation vector
        """
        mean = self._ensemble.mean(axis=0)
        predicted_obs = self._H @ mean
        innovation = observations - predicted_obs

        # Innovation variance: H P H^T + R
        X = self._ensemble - mean
        HX = X @ self._H.T
        HPH_T = (HX.T @ HX) / (self.ensemble_size - 1)
        S = HPH_T + obs_noise_cov

        # Normalised innovation
        S_diag = np.diag(S)
        S_diag = np.maximum(S_diag, 1e-12)
        normalised = np.abs(innovation) / np.sqrt(S_diag)
        max_std = float(np.max(normalised))

        self._divergence_history.append(max_std)

        return {
            "diverged": max_std > threshold,
            "max_innovation_std": max_std,
            "innovation": innovation,
        }

    @property
    def ensemble(self) -> np.ndarray:
        """Direct access to the ensemble array (N_ens, state_dim)."""
        return self._ensemble

    @ensemble.setter
    def ensemble(self, value: np.ndarray) -> None:
        assert value.shape == (self.ensemble_size, self.state_dim)
        self._ensemble = value.copy()
