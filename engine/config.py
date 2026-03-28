"""Unified configuration for the Munin engine pipeline.

Centralizes all tunable parameters for graph inference, sensor health,
evidence windows, and incident simulation.

Determinism: All randomness is controlled via explicit RNG streams with
documented seed derivation for reproducibility.
"""
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional
import json
from pathlib import Path
import random
import numpy as np

# Engine version - increment when config schema changes
ENGINE_CONFIG_VERSION = "1.0.0"


@dataclass
class GraphInferenceConfig:
    """Configuration for dependency graph inference."""
    # Correlation thresholds
    min_correlation: float = 0.5  # Minimum |correlation| to create edge
    min_stability: float = 0.3  # Minimum stability score (1 - std/mean)
    
    # Lag detection
    max_lag_seconds: int = 300  # Maximum lag to test (±300s)
    
    # Edge selection
    top_k_edges_per_node: int = 3  # Maximum edges per source node
    
    # Sample requirements
    min_samples_per_pair: int = 10  # Minimum samples for correlation
    
    # Stability computation
    stability_window_hours: int = 24  # Window size for stability
    stability_num_windows: int = 5  # Number of overlapping windows


@dataclass
class SensorHealthConfig:
    """Configuration for sensor health detection."""
    # Missingness threshold
    max_missing_ratio: float = 0.1  # 10% missing data threshold
    
    # Stuck-at detection
    min_coefficient_of_variation: float = 0.01  # CV threshold for stuck-at
    
    # Drift detection
    drift_mean_diff_multiplier: float = 2.0  # Mean diff > 2 * pooled_std
    
    # Observability weights
    missingness_weight: float = 0.4
    noise_weight: float = 0.3
    drift_weight: float = 0.2
    skew_weight: float = 0.1


@dataclass
class EvidenceConfig:
    """Configuration for evidence window generation."""
    window_size_hours: int = 24  # 24-hour evidence windows
    min_samples_per_window: int = 10  # Minimum samples to include window
    min_window_correlation: float = 0.3  # Minimum correlation to include window


@dataclass
class IncidentSimulationConfig:
    """Configuration for incident simulation."""
    default_time_horizon_minutes: int = 120  # Default cascade simulation horizon
    confidence_interval_percentile: float = 0.95  # 95% confidence bands


@dataclass
class AnomalyDetectionConfig:
    """Layer 2: Physics-Informed Anomaly Detection."""
    hidden_dim: int = 128
    latent_dim: int = 32
    n_layers: int = 2
    dropout: float = 0.1
    window_size: int = 60  # samples per window
    physics_lambda: float = 0.1
    svm_nu: float = 0.05
    anomaly_percentile: float = 95.0
    epochs: int = 100
    learning_rate: float = 1e-3


@dataclass
class CascadePredictionConfig:
    """Layer 3: GNN Cascade Prediction (PI-GN-JODE)."""
    node_dim: int = 16
    edge_dim: int = 8
    hidden_dim: int = 64
    gnn_layers: int = 3
    ode_hidden_dim: int = 64
    dropout: float = 0.1
    n_mc_samples: int = 100
    epochs: int = 200
    learning_rate: float = 1e-3


@dataclass
class DigitalTwinConfig:
    """Layer 4: Enhanced Digital Twin with Data Assimilation."""
    ensemble_size: int = 50
    assimilation_interval_seconds: int = 60
    divergence_threshold: float = 3.0
    scenario_batch_size: int = 1000
    adversarial_scenarios: int = 100
    simulation_dt: float = 1.0  # seconds


@dataclass
class RLResponseConfig:
    """Layer 5: RL Response Optimisation."""
    strategic_lr: float = 3e-4
    tactical_lr: float = 3e-4
    resource_lr: float = 3e-4
    gamma: float = 0.99
    ppo_clip: float = 0.2
    n_episodes: int = 10000
    eval_episodes: int = 100


@dataclass
class FederatedConfig:
    """Layer 6: Federated Sovereign Training."""
    n_rounds: int = 100
    local_epochs: int = 5
    learning_rate: float = 0.01
    epsilon_per_round: float = 1.0
    delta: float = 1e-5
    max_grad_norm: float = 1.0
    compression_ratio: float = 0.1
    min_participants: int = 3
    byzantine_tolerance: int = 1


@dataclass
class GovernanceConfig:
    """Layer 7: Model Governance & Continuous Learning."""
    drift_threshold_kl: float = 0.15
    drift_threshold_psi: float = 0.2
    revalidation_interval_days: int = 90
    min_precision: float = 0.95
    min_recall: float = 0.90
    max_fpr: float = 0.05
    feedback_retrain_threshold: int = 50  # incidents before retrain


@dataclass
class RNGConfig:
    """Random number generator configuration for deterministic execution."""
    base_seed: int = 42  # Base seed for entire pipeline
    ingest_seed_offset: int = 0  # Offset for ingest stage RNG
    graph_seed_offset: int = 1000  # Offset for graph inference RNG
    incidents_seed_offset: int = 2000  # Offset for incident simulation RNG
    synthetic_seed_offset: int = 3000  # Offset for synthetic data generation
    
    def get_ingest_seed(self) -> int:
        """Get seed for ingest stage."""
        return self.base_seed + self.ingest_seed_offset
    
    def get_graph_seed(self) -> int:
        """Get seed for graph inference stage."""
        return self.base_seed + self.graph_seed_offset
    
    def get_incidents_seed(self) -> int:
        """Get seed for incident simulation stage."""
        return self.base_seed + self.incidents_seed_offset
    
    def get_synthetic_seed(self) -> int:
        """Get seed for synthetic data generation."""
        return self.base_seed + self.synthetic_seed_offset
    
    def initialize_rng_streams(self):
        """Initialize all RNG streams with configured seeds."""
        random.seed(self.base_seed)
        np.random.seed(self.base_seed)
        
        # Document seed derivation
        # Ingest: base_seed + ingest_seed_offset
        # Graph: base_seed + graph_seed_offset  
        # Incidents: base_seed + incidents_seed_offset
        # Synthetic: base_seed + synthetic_seed_offset


@dataclass
class EngineConfig:
    """Complete engine configuration."""
    version: str = ENGINE_CONFIG_VERSION
    graph: GraphInferenceConfig = None
    sensor_health: SensorHealthConfig = None
    evidence: EvidenceConfig = None
    incidents: IncidentSimulationConfig = None
    rng: RNGConfig = None
    # Intelligence layers (Layers 2-7)
    anomaly: AnomalyDetectionConfig = None
    cascade: CascadePredictionConfig = None
    digital_twin: DigitalTwinConfig = None
    rl_response: RLResponseConfig = None
    federated: FederatedConfig = None
    governance: GovernanceConfig = None

    def __post_init__(self):
        """Initialize default configs if not provided."""
        if self.graph is None:
            self.graph = GraphInferenceConfig()
        if self.sensor_health is None:
            self.sensor_health = SensorHealthConfig()
        if self.evidence is None:
            self.evidence = EvidenceConfig()
        if self.incidents is None:
            self.incidents = IncidentSimulationConfig()
        if self.rng is None:
            self.rng = RNGConfig()
        if self.anomaly is None:
            self.anomaly = AnomalyDetectionConfig()
        if self.cascade is None:
            self.cascade = CascadePredictionConfig()
        if self.digital_twin is None:
            self.digital_twin = DigitalTwinConfig()
        if self.rl_response is None:
            self.rl_response = RLResponseConfig()
        if self.federated is None:
            self.federated = FederatedConfig()
        if self.governance is None:
            self.governance = GovernanceConfig()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'version': self.version,
            'graph': asdict(self.graph),
            'sensor_health': asdict(self.sensor_health),
            'evidence': asdict(self.evidence),
            'incidents': asdict(self.incidents),
            'rng': asdict(self.rng),
            'anomaly': asdict(self.anomaly),
            'cascade': asdict(self.cascade),
            'digital_twin': asdict(self.digital_twin),
            'rl_response': asdict(self.rl_response),
            'federated': asdict(self.federated),
            'governance': asdict(self.governance),
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EngineConfig':
        """Load from dictionary."""
        config = cls(version=data.get('version', ENGINE_CONFIG_VERSION))
        if 'graph' in data:
            config.graph = GraphInferenceConfig(**data['graph'])
        if 'sensor_health' in data:
            config.sensor_health = SensorHealthConfig(**data['sensor_health'])
        if 'evidence' in data:
            config.evidence = EvidenceConfig(**data['evidence'])
        if 'incidents' in data:
            config.incidents = IncidentSimulationConfig(**data['incidents'])
        if 'rng' in data:
            config.rng = RNGConfig(**data['rng'])
        if 'anomaly' in data:
            config.anomaly = AnomalyDetectionConfig(**data['anomaly'])
        if 'cascade' in data:
            config.cascade = CascadePredictionConfig(**data['cascade'])
        if 'digital_twin' in data:
            config.digital_twin = DigitalTwinConfig(**data['digital_twin'])
        if 'rl_response' in data:
            config.rl_response = RLResponseConfig(**data['rl_response'])
        if 'federated' in data:
            config.federated = FederatedConfig(**data['federated'])
        if 'governance' in data:
            config.governance = GovernanceConfig(**data['governance'])
        return config
    
    def save(self, path: Path):
        """Save configuration to JSON file."""
        with open(path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def load(cls, path: Path) -> 'EngineConfig':
        """Load configuration from JSON file."""
        with open(path, 'r') as f:
            data = json.load(f)
        return cls.from_dict(data)


# Global default config instance
default_config = EngineConfig()


def get_config(config_path: Path = None) -> EngineConfig:
    """Get engine configuration, loading from file if provided."""
    if config_path and config_path.exists():
        return EngineConfig.load(config_path)
    return default_config
