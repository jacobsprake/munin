"""
Training pipeline for the physics-informed anomaly detection system.

Ties together the LSTM-Autoencoder, physics loss functions, and One-Class
SVM detector into a single workflow: train -> evaluate -> detect.
"""

from __future__ import annotations

import json
import logging
import pathlib
import pickle
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from .lstm_autoencoder import LSTMAutoencoder
from .physics_loss import PhysicsLoss
from .detector import AnomalyDetector, AnomalyResult, ConfounderFilter

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------


@dataclass
class AnomalyConfig:
    """Configuration for the anomaly detection pipeline."""

    hidden_dim: int = 128
    latent_dim: int = 32
    n_layers: int = 2
    dropout: float = 0.1
    window_size: int = 60        # samples per window
    physics_lambda: float = 0.1
    svm_nu: float = 0.05
    anomaly_percentile: float = 95.0


# ------------------------------------------------------------------
# Anomaly report
# ------------------------------------------------------------------


@dataclass
class AnomalyReport:
    """JSON-serializable anomaly detection report."""

    n_samples: int
    n_anomalies: int
    anomaly_rate: float
    threshold: float
    mean_score: float
    max_score: float
    per_sensor_mse: List[float]
    flagged_indices: List[int]
    attributions: Optional[List[Dict[str, float]]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, default=str)


# ------------------------------------------------------------------
# Trainer
# ------------------------------------------------------------------


class AnomalyTrainer:
    """End-to-end training and inference pipeline.

    Parameters
    ----------
    n_sensors : int
        Number of sensor channels in the input data.
    config : AnomalyConfig, optional
        Pipeline configuration. Uses defaults when omitted.
    physics_metadata : dict, optional
        Sensor-index metadata required by ``PhysicsLoss`` methods.
        If ``None``, physics loss is skipped during training.
    domain : str, optional
        Infrastructure domain for physics loss selection.
        One of ``"hydraulic"``, ``"electrical"``, ``"telecom"``, or ``None``.
    device : str, optional
        PyTorch device string (``"cpu"``, ``"cuda"``, ``"mps"``).
    """

    def __init__(
        self,
        n_sensors: int,
        config: Optional[AnomalyConfig] = None,
        physics_metadata: Optional[Dict[str, Any]] = None,
        domain: Optional[str] = None,
        device: Optional[str] = None,
    ) -> None:
        self.n_sensors = n_sensors
        self.config = config or AnomalyConfig()
        self.physics_metadata = physics_metadata
        self.domain = domain

        if device is not None:
            self.device = torch.device(device)
        elif torch.cuda.is_available():
            self.device = torch.device("cuda")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            self.device = torch.device("mps")
        else:
            self.device = torch.device("cpu")

        # --- Components ---
        self.model = LSTMAutoencoder(
            n_sensors=n_sensors,
            hidden_dim=self.config.hidden_dim,
            latent_dim=self.config.latent_dim,
            n_layers=self.config.n_layers,
            dropout=self.config.dropout,
        ).to(self.device)

        self.physics_loss = PhysicsLoss()
        self.reconstruction_criterion = nn.MSELoss()

        self.detector = AnomalyDetector(
            nu=self.config.svm_nu,
            anomaly_percentile=self.config.anomaly_percentile,
        )
        self.confounder_filter = ConfounderFilter()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _numpy_to_dataloader(
        self,
        data: np.ndarray,
        batch_size: int = 64,
        shuffle: bool = True,
    ) -> DataLoader:
        """Convert a numpy array of shape (n_windows, seq_len, n_sensors)
        into a PyTorch DataLoader.

        If ``data`` is 2-D (n_total_samples, n_sensors) it is automatically
        windowed using ``self.config.window_size``.
        """
        if data.ndim == 2:
            data = self._create_windows(data)

        tensor = torch.as_tensor(data, dtype=torch.float32)
        dataset = TensorDataset(tensor)
        return DataLoader(dataset, batch_size=batch_size, shuffle=shuffle)

    def _create_windows(self, data: np.ndarray) -> np.ndarray:
        """Slide a window of ``window_size`` over (n_samples, n_sensors)."""
        ws = self.config.window_size
        n = len(data) - ws + 1
        if n <= 0:
            raise ValueError(
                f"Data length {len(data)} is shorter than window_size {ws}."
            )
        windows = np.stack([data[i : i + ws] for i in range(n)], axis=0)
        return windows

    def _compute_physics_loss(self, predicted: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """Dispatch to the appropriate domain-specific physics loss."""
        if self.domain is None or self.physics_metadata is None:
            return torch.tensor(0.0, device=self.device)

        meta = self.physics_metadata
        if self.domain == "hydraulic":
            return self.physics_loss.hydraulic_loss(predicted, targets, meta)
        elif self.domain == "electrical":
            return self.physics_loss.electrical_loss(predicted, targets, meta)
        elif self.domain == "telecom":
            return self.physics_loss.telecom_loss(predicted, targets, meta)
        else:
            logger.warning("Unknown domain '%s'; skipping physics loss.", self.domain)
            return torch.tensor(0.0, device=self.device)

    @torch.no_grad()
    def _extract_latents_and_errors(
        self,
        dataloader: DataLoader,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Run inference and return latent vectors + per-sample MSE."""
        self.model.eval()
        latents: List[np.ndarray] = []
        errors: List[np.ndarray] = []

        for (batch,) in dataloader:
            batch = batch.to(self.device)
            x_hat, z = self.model(batch)
            mse = ((batch - x_hat) ** 2).mean(dim=(1, 2))  # (batch_size,)
            latents.append(z.cpu().numpy())
            errors.append(mse.cpu().numpy())

        return np.concatenate(latents, axis=0), np.concatenate(errors, axis=0)

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(
        self,
        train_data: np.ndarray,
        val_data: Optional[np.ndarray] = None,
        epochs: int = 100,
        lr: float = 1e-3,
        batch_size: int = 64,
    ) -> Dict[str, List[float]]:
        """Train the autoencoder with combined reconstruction + physics loss,
        then fit the One-Class SVM on the training latent space.

        Parameters
        ----------
        train_data : ndarray
            Shape (n_windows, seq_len, n_sensors) or (n_samples, n_sensors).
        val_data : ndarray, optional
            Same shape conventions as ``train_data``.
        epochs : int
        lr : float
        batch_size : int

        Returns
        -------
        history : dict with keys ``train_loss``, ``val_loss``,
            ``recon_loss``, ``physics_loss``.
        """
        train_loader = self._numpy_to_dataloader(train_data, batch_size=batch_size, shuffle=True)
        val_loader: Optional[DataLoader] = None
        if val_data is not None:
            val_loader = self._numpy_to_dataloader(val_data, batch_size=batch_size, shuffle=False)

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)

        history: Dict[str, List[float]] = {
            "train_loss": [],
            "val_loss": [],
            "recon_loss": [],
            "physics_loss": [],
        }

        for epoch in range(1, epochs + 1):
            # --- Train ---
            self.model.train()
            epoch_loss = 0.0
            epoch_recon = 0.0
            epoch_phys = 0.0
            n_batches = 0

            for (batch,) in train_loader:
                batch = batch.to(self.device)
                x_hat, z = self.model(batch)

                recon = self.reconstruction_criterion(x_hat, batch)
                phys = self._compute_physics_loss(x_hat, batch)
                loss = PhysicsLoss.combined_loss(recon, phys, lambda_physics=self.config.physics_lambda)

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

                epoch_loss += loss.item()
                epoch_recon += recon.item()
                epoch_phys += phys.item()
                n_batches += 1

            avg_loss = epoch_loss / max(n_batches, 1)
            avg_recon = epoch_recon / max(n_batches, 1)
            avg_phys = epoch_phys / max(n_batches, 1)
            history["train_loss"].append(avg_loss)
            history["recon_loss"].append(avg_recon)
            history["physics_loss"].append(avg_phys)

            # --- Validate ---
            val_loss_value = 0.0
            if val_loader is not None:
                self.model.eval()
                val_total = 0.0
                val_n = 0
                with torch.no_grad():
                    for (vb,) in val_loader:
                        vb = vb.to(self.device)
                        vx_hat, _ = self.model(vb)
                        vr = self.reconstruction_criterion(vx_hat, vb)
                        vp = self._compute_physics_loss(vx_hat, vb)
                        vl = PhysicsLoss.combined_loss(vr, vp, lambda_physics=self.config.physics_lambda)
                        val_total += vl.item()
                        val_n += 1
                val_loss_value = val_total / max(val_n, 1)
            history["val_loss"].append(val_loss_value)

            if epoch == 1 or epoch % 10 == 0 or epoch == epochs:
                logger.info(
                    "Epoch %3d/%d  train=%.6f  recon=%.6f  phys=%.6f  val=%.6f",
                    epoch, epochs, avg_loss, avg_recon, avg_phys, val_loss_value,
                )

        # --- Fit anomaly detector on training latent space ---
        train_loader_no_shuffle = self._numpy_to_dataloader(
            train_data, batch_size=batch_size, shuffle=False
        )
        latents, errors = self._extract_latents_and_errors(train_loader_no_shuffle)
        self.detector.fit(latents, errors)

        logger.info("Training complete. Detector fitted on %d samples.", len(latents))
        return history

    # ------------------------------------------------------------------
    # Evaluation
    # ------------------------------------------------------------------

    def evaluate(
        self,
        test_data: np.ndarray,
        batch_size: int = 64,
    ) -> AnomalyReport:
        """Run inference on test data and return an anomaly report.

        Parameters
        ----------
        test_data : ndarray
            Shape (n_windows, seq_len, n_sensors) or (n_samples, n_sensors).

        Returns
        -------
        AnomalyReport
        """
        loader = self._numpy_to_dataloader(test_data, batch_size=batch_size, shuffle=False)
        latents, errors = self._extract_latents_and_errors(loader)

        result = self.detector.detect(latents, errors)

        # Per-sensor MSE
        self.model.eval()
        all_sensor_mse: List[np.ndarray] = []
        with torch.no_grad():
            for (batch,) in loader:
                batch = batch.to(self.device)
                x_hat, _ = self.model(batch)
                sensor_mse = ((batch - x_hat) ** 2).mean(dim=1)  # (batch, n_sensors)
                all_sensor_mse.append(sensor_mse.cpu().numpy())
        per_sensor = np.concatenate(all_sensor_mse, axis=0).mean(axis=0).tolist()

        return self.generate_report(result, per_sensor)

    # ------------------------------------------------------------------
    # Real-time detection
    # ------------------------------------------------------------------

    def detect_anomalies(
        self,
        live_data: np.ndarray,
        environmental_data: Optional[Dict[str, np.ndarray]] = None,
        batch_size: int = 64,
    ) -> AnomalyResult:
        """Detect anomalies in live data with optional confounder filtering.

        Parameters
        ----------
        live_data : ndarray
            Shape (n_windows, seq_len, n_sensors) or (n_samples, n_sensors).
        environmental_data : dict, optional
            Environmental context for confounder filtering.

        Returns
        -------
        AnomalyResult
        """
        loader = self._numpy_to_dataloader(live_data, batch_size=batch_size, shuffle=False)
        latents, errors = self._extract_latents_and_errors(loader)

        result = self.detector.detect(latents, errors)

        if environmental_data is not None:
            result = self.confounder_filter.filter_anomalies(result, environmental_data)

        return result

    # ------------------------------------------------------------------
    # Reporting
    # ------------------------------------------------------------------

    def generate_report(
        self,
        result: AnomalyResult,
        per_sensor_mse: Optional[List[float]] = None,
    ) -> AnomalyReport:
        """Generate a JSON-serializable anomaly report with per-sensor attribution.

        Parameters
        ----------
        result : AnomalyResult
        per_sensor_mse : list of float, optional
            Mean reconstruction error per sensor.

        Returns
        -------
        AnomalyReport
        """
        flagged = np.where(result.flags)[0].tolist()
        return AnomalyReport(
            n_samples=len(result.scores),
            n_anomalies=int(result.flags.sum()),
            anomaly_rate=float(result.flags.mean()),
            threshold=result.threshold,
            mean_score=float(result.scores.mean()),
            max_score=float(result.scores.max()) if len(result.scores) > 0 else 0.0,
            per_sensor_mse=per_sensor_mse or [],
            flagged_indices=flagged,
            attributions=result.attributions,
        )

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def save(self, path: str | pathlib.Path) -> None:
        """Persist model weights, detector state, and config to disk.

        Creates a directory at ``path`` containing:
        - ``model.pt`` : autoencoder weights
        - ``detector.pkl`` : fitted One-Class SVM + scaler
        - ``config.json`` : pipeline configuration
        """
        path = pathlib.Path(path)
        path.mkdir(parents=True, exist_ok=True)

        torch.save(self.model.state_dict(), path / "model.pt")

        with open(path / "detector.pkl", "wb") as f:
            pickle.dump(
                {
                    "svm": self.detector.svm,
                    "scaler": self.detector.scaler,
                    "threshold": self.detector.threshold,
                    "nu": self.detector.nu,
                    "kernel": self.detector.kernel,
                    "anomaly_percentile": self.detector.anomaly_percentile,
                },
                f,
            )

        with open(path / "config.json", "w") as f:
            json.dump(
                {
                    "n_sensors": self.n_sensors,
                    "domain": self.domain,
                    **asdict(self.config),
                },
                f,
                indent=2,
            )

        logger.info("Saved anomaly pipeline to %s", path)

    @classmethod
    def load(
        cls,
        path: str | pathlib.Path,
        physics_metadata: Optional[Dict[str, Any]] = None,
        device: Optional[str] = None,
    ) -> "AnomalyTrainer":
        """Load a previously saved pipeline.

        Parameters
        ----------
        path : str or Path
        physics_metadata : dict, optional
        device : str, optional

        Returns
        -------
        AnomalyTrainer
        """
        path = pathlib.Path(path)

        with open(path / "config.json") as f:
            cfg_dict = json.load(f)

        n_sensors = cfg_dict.pop("n_sensors")
        domain = cfg_dict.pop("domain", None)
        config = AnomalyConfig(**cfg_dict)

        trainer = cls(
            n_sensors=n_sensors,
            config=config,
            physics_metadata=physics_metadata,
            domain=domain,
            device=device,
        )

        state_dict = torch.load(path / "model.pt", map_location=trainer.device, weights_only=True)
        trainer.model.load_state_dict(state_dict)

        with open(path / "detector.pkl", "rb") as f:
            det_state = pickle.load(f)  # noqa: S301 — trusted internal artifact

        trainer.detector.svm = det_state["svm"]
        trainer.detector.scaler = det_state["scaler"]
        trainer.detector.threshold = det_state["threshold"]
        trainer.detector.nu = det_state["nu"]
        trainer.detector.kernel = det_state["kernel"]
        trainer.detector.anomaly_percentile = det_state["anomaly_percentile"]
        trainer.detector._is_fitted = True

        logger.info("Loaded anomaly pipeline from %s", path)
        return trainer
