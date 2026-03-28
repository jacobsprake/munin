"""
Munin Intelligence Stack - Layer 2: Physics-Informed Anomaly Detection.

Provides LSTM-Autoencoder based anomaly detection with physics-informed
loss functions for SCADA/infrastructure monitoring.
"""

from .lstm_autoencoder import LSTMAutoencoder
from .physics_loss import PhysicsLoss
from .detector import AnomalyDetector, ConfounderFilter
from .trainer import AnomalyTrainer, AnomalyConfig

__all__ = [
    "LSTMAutoencoder",
    "PhysicsLoss",
    "AnomalyDetector",
    "ConfounderFilter",
    "AnomalyTrainer",
    "AnomalyConfig",
]
