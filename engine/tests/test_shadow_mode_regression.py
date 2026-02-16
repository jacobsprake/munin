"""Automated shadow-mode regression tests asserting monotonic improvements."""
import pytest
import json
from pathlib import Path
from datetime import datetime
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from shadow_simulation import ShadowModeEngine
from shadow_replay import ShadowReplayHarness


class TestShadowModeRegression:
    """Regression tests for shadow mode improvements."""
    
    def test_monotonic_improvement_ratio(self):
        """Test that improvement ratios improve or stay stable over time."""
        engine = ShadowModeEngine(shadow_mode_duration_days=365)
        
        # Simulate multiple incidents
        incidents = [
            {
                'id': f'incident_{i}',
                'type': 'flood',
                'impacted_nodes': ['pump_01', 'pump_02']
            }
            for i in range(10)
        ]
        
        improvement_ratios = []
        
        for incident in incidents:
            # Record human action (simulated)
            human_action = engine.record_human_action(
                action_type='coordination',
                description=f'Human response to {incident["id"]}',
                target_nodes=incident['impacted_nodes'],
                duration_seconds=14400,  # 4 hours
                outcome='success'
            )
            
            # Generate Munin prediction
            munin_prediction = engine.generate_munin_prediction(
                incident['id'],
                incident,
                {'nodes': [], 'edges': []},
                {'windows': []}
            )
            
            # Compare
            comparison = engine.compare_human_vs_munin(
                incident['id'],
                human_action,
                munin_prediction
            )
            
            improvement_ratios.append(comparison.improvement_ratio)
        
        # Check monotonicity: later incidents should have equal or better ratios
        # (In practice, this tests that the system doesn't degrade)
        for i in range(1, len(improvement_ratios)):
            # Allow small variance but should not significantly degrade
            assert improvement_ratios[i] >= improvement_ratios[i-1] * 0.9, \
                f"Improvement ratio degraded: {improvement_ratios[i-1]} -> {improvement_ratios[i]}"
    
    def test_time_saved_consistency(self):
        """Test that time saved is consistent across similar incidents."""
        engine = ShadowModeEngine(shadow_mode_duration_days=365)
        
        # Simulate similar incidents
        incidents = [
            {
                'id': f'incident_flood_{i}',
                'type': 'flood',
                'impacted_nodes': ['pump_01']
            }
            for i in range(5)
        ]
        
        time_saved_values = []
        
        for incident in incidents:
            human_action = engine.record_human_action(
                action_type='coordination',
                description='Similar flood response',
                target_nodes=incident['impacted_nodes'],
                duration_seconds=14400,
                outcome='success'
            )
            
            munin_prediction = engine.generate_munin_prediction(
                incident['id'],
                incident,
                {'nodes': [], 'edges': []},
                {'windows': []}
            )
            
            comparison = engine.compare_human_vs_munin(
                incident['id'],
                human_action,
                munin_prediction
            )
            
            time_saved_values.append(comparison.time_saved_seconds)
        
        # Similar incidents should have similar time saved (within 20% variance)
        avg_time_saved = sum(time_saved_values) / len(time_saved_values)
        for time_saved in time_saved_values:
            assert abs(time_saved - avg_time_saved) / avg_time_saved < 0.2, \
                f"Time saved inconsistent: {time_saved} vs avg {avg_time_saved}"
    
    def test_damage_prevented_positive(self):
        """Test that damage prevented estimates are always positive."""
        engine = ShadowModeEngine(shadow_mode_duration_days=365)
        
        incident = {
            'id': 'incident_test',
            'type': 'flood',
            'impacted_nodes': ['pump_01']
        }
        
        human_action = engine.record_human_action(
            action_type='coordination',
            description='Test response',
            target_nodes=incident['impacted_nodes'],
            duration_seconds=14400,
            outcome='success'
        )
        
        munin_prediction = engine.generate_munin_prediction(
            incident['id'],
            incident,
            {'nodes': [], 'edges': []},
            {'windows': []}
        )
        
        comparison = engine.compare_human_vs_munin(
            incident['id'],
            human_action,
            munin_prediction
        )
        
        # Damage prevented should be positive (Munin is faster)
        assert comparison.damage_prevented_estimate >= 0, \
            f"Damage prevented should be positive, got {comparison.damage_prevented_estimate}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
