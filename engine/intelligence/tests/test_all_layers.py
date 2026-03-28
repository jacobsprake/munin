"""Integration tests for Munin Intelligence Stack (Layers 2-7).

Tests each layer can be imported, instantiated, and run basic operations.
Requires: pip install torch scikit-learn scipy
"""
import json
import sys
import tempfile
from pathlib import Path

import numpy as np
import pytest

# Ensure engine is on path
ENGINE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ENGINE_DIR))


# ─── Layer 2: Anomaly Detection ───

class TestLayer2AnomalyDetection:

    def test_lstm_autoencoder_forward(self):
        import torch
        from intelligence.anomaly.lstm_autoencoder import LSTMAutoencoder

        model = LSTMAutoencoder(n_sensors=8, hidden_dim=32, latent_dim=16)
        x = torch.randn(4, 30, 8)  # batch=4, seq=30, sensors=8
        reconstructed, latent = model(x)
        assert reconstructed.shape == x.shape
        assert latent.shape == (4, 16)

    def test_physics_loss_hydraulic(self):
        import torch
        from intelligence.anomaly.physics_loss import PhysicsLoss

        loss_fn = PhysicsLoss()
        predicted = torch.randn(4, 30, 8)
        targets = torch.randn(4, 30, 8)
        metadata = {
            'inflow_indices': torch.tensor([0, 1]),
            'outflow_indices': torch.tensor([2, 3]),
            'storage_indices': torch.tensor([4, 5]),
        }
        loss = loss_fn.hydraulic_loss(predicted, targets, metadata)
        assert loss.dim() == 0  # scalar
        assert loss.item() >= 0

    def test_physics_loss_electrical(self):
        import torch
        from intelligence.anomaly.physics_loss import PhysicsLoss

        loss_fn = PhysicsLoss()
        predicted = torch.randn(4, 30, 8)
        targets = torch.randn(4, 30, 8)
        metadata = {
            'node_groups': [[0, 1], [2, 3], [4, 5], [6, 7]],
            'generation_indices': torch.tensor([0, 2]),
            'load_indices': torch.tensor([1, 3]),
        }
        loss = loss_fn.electrical_loss(predicted, targets, metadata)
        assert loss.item() >= 0

    def test_physics_loss_telecom(self):
        import torch
        from intelligence.anomaly.physics_loss import PhysicsLoss

        loss_fn = PhysicsLoss()
        predicted = torch.randn(4, 30, 8)
        targets = torch.randn(4, 30, 8)
        metadata = {
            'signal_indices': torch.tensor([0, 1, 2, 3]),
            'tx_power_indices': torch.tensor([4, 5, 6, 7]),
            'distance': torch.rand(4),
            'attenuation_coeff': 0.2,
            'bandwidth_indices': torch.tensor([0, 1, 2, 3]),
            'capacity': torch.ones(4) * 10.0,
        }
        loss = loss_fn.telecom_loss(predicted, targets, metadata)
        assert loss.item() >= 0

    def test_anomaly_detector_fit_and_score(self):
        from intelligence.anomaly.detector import AnomalyDetector

        detector = AnomalyDetector()
        latent = np.random.randn(100, 16).astype(np.float32)
        errors = np.random.rand(100).astype(np.float32)
        detector.fit(latent, errors)

        scores = detector.score(latent, errors)
        assert len(scores) == 100

        result = detector.detect(latent, errors)
        assert len(result.flags) == 100
        assert len(result.scores) == 100

    def test_confounder_filter(self):
        from intelligence.anomaly.detector import ConfounderFilter, AnomalyResult

        cf = ConfounderFilter()
        anomaly_result = AnomalyResult(
            scores=np.array([0.1, 0.9, 0.3, 0.95, 0.2]),
            flags=np.array([False, True, False, True, False]),
            threshold=0.5,
        )
        env_data = {
            'temperature': np.array([0.2, 0.8, 0.2, 0.9, 0.1]),
            'demand_cycle': np.array([0.5, 0.9, 0.5, 0.95, 0.4]),
        }
        filtered = cf.filter_anomalies(anomaly_result, env_data)
        assert isinstance(filtered, AnomalyResult)
        assert len(filtered.flags) == 5

    def test_trainer_end_to_end(self):
        from intelligence.anomaly.trainer import AnomalyTrainer, AnomalyConfig
        from intelligence.anomaly.detector import AnomalyResult

        config = AnomalyConfig(
            hidden_dim=32, latent_dim=8, window_size=20
        )
        trainer = AnomalyTrainer(n_sensors=4, config=config)
        data = np.random.randn(200, 4).astype(np.float32)

        history = trainer.train(data, data, epochs=3)
        assert 'train_loss' in history
        assert len(history['train_loss']) == 3

        results = trainer.detect_anomalies(data)
        assert isinstance(results, AnomalyResult)
        assert hasattr(results, 'scores')

    def test_trainer_save_load(self):
        from intelligence.anomaly.trainer import AnomalyTrainer, AnomalyConfig

        config = AnomalyConfig(hidden_dim=32, latent_dim=8, window_size=20)
        trainer = AnomalyTrainer(n_sensors=4, config=config)
        data = np.random.randn(200, 4).astype(np.float32)
        trainer.train(data, data, epochs=2)

        with tempfile.TemporaryDirectory() as tmpdir:
            trainer.save(Path(tmpdir))
            loaded = AnomalyTrainer.load(Path(tmpdir))
            results = loaded.detect_anomalies(data)
            assert hasattr(results, 'scores')
            assert hasattr(results, 'flags')


# ─── Layer 3: GNN Cascade Prediction ───

class TestLayer3CascadePrediction:

    def _make_graph(self):
        import torch
        from intelligence.cascade.predictor import GraphData
        n_nodes = 10
        node_features = torch.randn(n_nodes, 16)
        # Simple chain: 0→1→2→...→9
        src = list(range(9))
        dst = list(range(1, 10))
        edge_index = torch.tensor([src, dst], dtype=torch.long)
        edge_features = torch.randn(9, 8)
        return GraphData(
            node_features=node_features,
            edge_index=edge_index,
            edge_features=edge_features,
            node_ids=[f"node_{i}" for i in range(n_nodes)],
            capacities=torch.ones(n_nodes),
        )

    def test_gnn_encoder_forward(self):
        import torch
        from intelligence.cascade.gnn_encoder import EdgeConditionedGNN

        gnn = EdgeConditionedGNN(node_dim=16, edge_dim=8, hidden_dim=32, n_layers=2)
        node_features = torch.randn(10, 16)
        edge_index = torch.tensor([[0, 1, 2], [1, 2, 3]], dtype=torch.long)
        edge_features = torch.randn(3, 8)

        out = gnn(node_features, edge_index, edge_features)
        assert out.shape == (10, 32)

    def test_neural_ode_forward(self):
        import torch
        from intelligence.cascade.neural_ode import NeuralODE

        ode = NeuralODE(state_dim=32, hidden_dim=64)
        h0 = torch.randn(10, 32)
        trajectory = ode(h0, t_span=(0.0, 1.0), n_steps=10)
        assert trajectory.shape == (11, 10, 32)

    def test_jump_process(self):
        import torch
        from intelligence.cascade.jump_process import JumpProcess

        jp = JumpProcess(state_dim=32, hidden_dim=64)
        states = torch.randn(10, 32)
        capacities = torch.ones(10)
        edge_index = torch.tensor([[0, 1], [1, 2]], dtype=torch.long)
        edge_features = torch.randn(2, 8)

        jumps = jp.detect_jumps(states, capacities)
        assert jumps.shape == (10,)

    def test_cascade_predictor(self):
        from intelligence.cascade.predictor import CascadePredictor, CascadeConfig

        cfg = CascadeConfig(node_dim=16, edge_dim=8, hidden_dim=32, gnn_layers=2)
        predictor = CascadePredictor(cfg)
        graph = self._make_graph()

        pred = predictor.predict_cascade(graph, failure_nodes=["node_0"])
        assert hasattr(pred, 'affected_nodes')
        assert hasattr(pred, 'time_to_impact')
        assert hasattr(pred, 'cascade_paths')

    def test_cascade_uncertainty(self):
        from intelligence.cascade.predictor import CascadePredictor, CascadeConfig

        cfg = CascadeConfig(node_dim=16, edge_dim=8, hidden_dim=32, gnn_layers=2, n_mc_samples=5)
        predictor = CascadePredictor(cfg)
        graph = self._make_graph()

        pred = predictor.predict_with_uncertainty(graph, failure_nodes=["node_0"], n_samples=5)
        assert pred.uncertainty is not None
        assert pred.confidence_interval is not None


# ─── Layer 4: Enhanced Digital Twin ───

class TestLayer4DigitalTwin:

    def test_hydraulic_engine(self):
        from intelligence.twin.physics.hydraulic import HydraulicEngine, HydraulicNode, HydraulicConnection

        nodes = [
            HydraulicNode(id="reservoir", type="reservoir", capacity=1000.0, current_level=500.0, current_flow=10.0),
            HydraulicNode(id="pump", type="pump", capacity=100.0, current_level=50.0, current_flow=5.0),
        ]
        conns = [
            HydraulicConnection(source_id="reservoir", target_id="pump", pipe_diameter=0.5, length=100.0, roughness_coeff=130.0),
        ]
        engine = HydraulicEngine(nodes, conns)
        engine.step(1.0)
        state = engine.get_state()
        assert "reservoir" in state
        assert "pump" in state

    def test_electrical_engine(self):
        from intelligence.twin.physics.electrical import ElectricalEngine, PowerNode, PowerConnection

        nodes = [
            PowerNode(id="gen", type="generator", capacity_mw=100.0, current_load_mw=50.0, voltage_pu=1.0),
            PowerNode(id="sub", type="substation", capacity_mw=80.0, current_load_mw=40.0, voltage_pu=1.0),
        ]
        conns = [PowerConnection(source_id="gen", target_id="sub", reactance_pu=0.01, capacity_mw=100.0)]
        engine = ElectricalEngine(nodes, conns)
        engine.step(1.0)
        state = engine.get_state()
        assert "gen" in state

    def test_telecom_engine(self):
        from intelligence.twin.physics.telecom import TelecomEngine, TelecomNode, TelecomConnection

        nodes = [
            TelecomNode(id="tower_a", type="tower", bandwidth_gbps=10.0, current_load_gbps=3.0, signal_strength_dbm=-30.0),
            TelecomNode(id="tower_b", type="tower", bandwidth_gbps=10.0, current_load_gbps=2.0, signal_strength_dbm=-40.0),
        ]
        conns = [TelecomConnection(source_id="tower_a", target_id="tower_b", bandwidth_gbps=10.0, link_type="fiber")]
        engine = TelecomEngine(nodes, conns)
        engine.step(1.0)
        state = engine.get_state()
        assert "tower_a" in state

    def test_cross_sector_coupling(self):
        from intelligence.twin.physics.coupling import CrossSectorCoupling

        coupling = CrossSectorCoupling()
        assert coupling is not None

    def test_kalman_filter(self):
        from intelligence.twin.kalman_filter import EnsembleKalmanFilter

        ekf = EnsembleKalmanFilter(state_dim=4, obs_dim=2, ensemble_size=20)

        def model_fn(state):
            return state + np.random.randn(*state.shape) * 0.01

        ekf.predict(model_fn)
        obs = np.array([1.0, 2.0])
        obs_noise = np.eye(2) * 0.1
        ekf.update(obs, obs_noise)

        mean, cov = ekf.get_state_estimate()
        assert mean.shape == (4,)
        assert cov.shape == (4, 4)

    def _make_nation_config(self):
        from intelligence.twin.twin_manager import NationConfig
        from intelligence.twin.physics.hydraulic import HydraulicNode, HydraulicConnection
        from intelligence.twin.physics.electrical import PowerNode, PowerConnection
        from intelligence.twin.physics.telecom import TelecomNode, TelecomConnection

        return NationConfig(
            hydraulic_nodes=[
                HydraulicNode(id="reservoir", type="reservoir", capacity=1000.0, current_level=500.0, current_flow=10.0),
                HydraulicNode(id="pump", type="pump", capacity=100.0, current_level=50.0, current_flow=5.0),
            ],
            hydraulic_connections=[
                HydraulicConnection(source_id="reservoir", target_id="pump", pipe_diameter=0.5, length=100.0, roughness_coeff=130.0),
            ],
            power_nodes=[
                PowerNode(id="gen", type="generator", capacity_mw=100.0, current_load_mw=50.0),
                PowerNode(id="sub", type="substation", capacity_mw=80.0, current_load_mw=40.0),
            ],
            power_connections=[
                PowerConnection(source_id="gen", target_id="sub", reactance_pu=0.01, capacity_mw=100.0),
            ],
            telecom_nodes=[
                TelecomNode(id="tower_a", type="tower", bandwidth_gbps=10.0, current_load_gbps=3.0),
                TelecomNode(id="tower_b", type="tower", bandwidth_gbps=10.0, current_load_gbps=2.0),
            ],
            telecom_connections=[
                TelecomConnection(source_id="tower_a", target_id="tower_b", bandwidth_gbps=10.0, link_type="fiber"),
            ],
        )

    def test_scenario_generator(self):
        from intelligence.twin.twin_manager import DigitalTwinManager
        from intelligence.twin.scenario_generator import ScenarioGenerator

        twin = DigitalTwinManager(self._make_nation_config())
        gen = ScenarioGenerator(twin)
        scenarios = gen.generate_random(n_scenarios=5)
        assert len(scenarios) == 5
        assert all(hasattr(s, 'initial_failure') for s in scenarios)

    def test_twin_manager(self):
        from intelligence.twin.twin_manager import DigitalTwinManager

        twin = DigitalTwinManager(self._make_nation_config())
        twin.step(1.0)
        state = twin.get_full_state()
        assert isinstance(state, dict)
        assert len(state) > 0


# ─── Layer 5: RL Response Optimisation ───

class TestLayer5RL:

    def test_environment_reset_step(self):
        from intelligence.rl.environment import ResponseEnvironment

        env = ResponseEnvironment()
        state = env.reset()
        assert isinstance(state, np.ndarray)

        action = np.zeros(env.action_dim, dtype=np.float32)
        next_state, reward, done, info = env.step(action)
        assert isinstance(reward, float)

    def test_strategic_agent(self):
        from intelligence.rl.agents import StrategicAgent

        agent = StrategicAgent(state_dim=20, n_playbooks=5, n_ministries=4)
        state = np.random.randn(20).astype(np.float32)
        action, log_prob, value = agent.select_action(state)
        assert isinstance(action, np.ndarray)
        assert action.shape == (2,)

    def test_reward_function(self):
        from intelligence.rl.reward import compute_reward

        reward = compute_reward(
            authorization_latency_minutes=10.0,
            cascade_affected_count=3,
            all_signatures_obtained=True,
            audit_trail_complete=True,
        )
        assert isinstance(reward, float)
        assert reward < 0  # latency + damage penalties


# ─── Layer 6: Federated Learning ───

class TestLayer6Federated:

    def test_differential_privacy(self):
        from intelligence.federated.privacy import DifferentialPrivacy

        dp = DifferentialPrivacy(epsilon=1.0, delta=1e-5, max_grad_norm=1.0)
        gradients = {'w': np.random.randn(10, 5)}
        noisy = dp.add_noise(gradients, sensitivity=1.0)
        assert 'w' in noisy
        assert noisy['w'].shape == (10, 5)

    def test_byzantine_filter(self):
        from intelligence.federated.privacy import ByzantineFilter

        bf = ByzantineFilter(tolerance=1)
        updates = [
            {'w': np.random.randn(5)},
            {'w': np.random.randn(5)},
            {'w': np.random.randn(5) * 100},  # outlier
        ]
        filtered = bf.filter_updates(updates)
        assert isinstance(filtered, list)
        assert len(filtered) >= 1
        assert 'w' in filtered[0]

    def test_federated_config(self):
        from intelligence.federated.config import FederatedConfig

        config = FederatedConfig()
        assert config.n_rounds == 100
        assert config.epsilon_per_round == 1.0


# ─── Layer 7: Model Governance ───

class TestLayer7Governance:

    def test_model_card_generation(self):
        from intelligence.governance.model_card import ModelCard, ModelCardGenerator

        gen = ModelCardGenerator()
        card = gen.generate(
            model=None,
            training_history={'epochs': 10},
            eval_results={'precision_recall_auc': 0.95},
            config={'version': '1.0'},
        )
        assert card.name is not None
        md = card.to_markdown()
        assert '# Model Card' in md or 'Model Card' in md

    def test_drift_detector(self):
        from intelligence.governance.drift_detector import DriftDetector

        ref = np.random.randn(500, 4)
        detector = DriftDetector(ref)

        # No drift (same distribution)
        result = detector.detect_drift(np.random.randn(500, 4), method='ks')
        assert hasattr(result, 'is_drifted')
        assert hasattr(result, 'statistic')

        # Drift (shifted distribution)
        shifted = np.random.randn(500, 4) + 5.0
        result = detector.detect_drift(shifted, method='ks')
        assert result.is_drifted == True

    def test_revalidation(self):
        from intelligence.governance.revalidation import ModelRevalidator

        thresholds = {'precision': 0.8, 'recall': 0.8, 'fpr': 0.1}
        validator = ModelRevalidator(
            adversarial_suite=None,
            performance_thresholds=thresholds,
        )
        assert validator is not None

    def test_feedback_collector(self):
        from intelligence.governance.feedback import FeedbackCollector

        collector = FeedbackCollector()
        collector.record_incident(
            incident_id="inc_001",
            munin_prediction={'affected': ['node_a']},
            actual_outcome={'affected': ['node_a', 'node_b']},
        )
        summary = collector.get_feedback_summary()
        assert summary['incidents']['total'] == 1

    def test_audit_trail(self):
        from intelligence.governance.audit_trail import MLAuditTrail

        with tempfile.TemporaryDirectory() as tmpdir:
            audit = MLAuditTrail(Path(tmpdir))
            audit.log_training(
                model_name="test_model",
                version="0.1",
                config={'lr': 0.001},
                data_sources=['synthetic'],
                metrics={'loss': 0.01},
            )
            lineage = audit.get_lineage("test_model")
            assert len(lineage) == 1

            valid = audit.verify_chain()
            assert valid is True


# ─── Config Integration ───

class TestConfigIntegration:

    def test_engine_config_has_intelligence_layers(self):
        from config import EngineConfig

        cfg = EngineConfig()
        assert cfg.anomaly is not None
        assert cfg.cascade is not None
        assert cfg.digital_twin is not None
        assert cfg.rl_response is not None
        assert cfg.federated is not None
        assert cfg.governance is not None

    def test_engine_config_serialization(self):
        from config import EngineConfig

        cfg = EngineConfig()
        d = cfg.to_dict()
        assert 'anomaly' in d
        assert 'cascade' in d
        assert 'digital_twin' in d
        assert 'rl_response' in d
        assert 'federated' in d
        assert 'governance' in d

        loaded = EngineConfig.from_dict(d)
        assert loaded.anomaly.hidden_dim == cfg.anomaly.hidden_dim
        assert loaded.cascade.gnn_layers == cfg.cascade.gnn_layers


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
