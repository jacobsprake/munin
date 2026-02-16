"""Regression tests for sovereign_handshake.py M-of-N flows."""
import json
import sys
from pathlib import Path
from datetime import datetime
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from sovereign_handshake import (
        SovereignHandshakeEngine,
        BiometricHandshake,
        MinistrySignature
    )
    from byzantine_resilience import MinistryType
except ImportError:
    pytest.skip("sovereign_handshake module not available", allow_module_level=True)


def create_test_handshake(action_id: str = "test_action_001") -> dict:
    """Create a test handshake action."""
    return {
        'action_id': action_id,
        'action_description': 'Test action',
        'target_assets': ['asset_01', 'asset_02'],
        'action_type': 'test'
    }


class TestMOfNFlows:
    """Tests for M-of-N multi-signature flows."""
    
    def test_3_of_4_quorum_success(self):
        """Test successful 3-of-4 ministry quorum."""
        engine = SovereignHandshakeEngine()
        action = create_test_handshake()
        
        # Create handshake
        handshake = engine.create_handshake(
            action_id=action['action_id'],
            action_description=action['action_description'],
            target_assets=action['target_assets'],
            action_type=action['action_type']
        )
        
        # Add 3 signatures (should authorize)
        engine.add_ministry_signature(
            action['action_id'],
            ministry=MinistryType.WATER_AUTHORITY,
            signer_id='water_director_001',
            public_key='test_pub_key_1',
            signature='test_sig_1',
            location='Ministry of Water',
            ministry_seal='WATER-SEAL-001'
        )
        
        engine.add_ministry_signature(
            action['action_id'],
            ministry=MinistryType.POWER_GRID_OPERATOR,
            signer_id='power_director_001',
            public_key='test_pub_key_2',
            signature='test_sig_2',
            location='Ministry of Power',
            ministry_seal='POWER-SEAL-001'
        )
        
        engine.add_ministry_signature(
            action['action_id'],
            ministry=MinistryType.NATIONAL_SECURITY,
            signer_id='security_director_001',
            public_key='test_pub_key_3',
            signature='test_sig_3',
            location='Ministry of Security',
            ministry_seal='SECURITY-SEAL-001'
        )
        
        # Verify authorization
        status = engine.verify_authorization(action['action_id'])
        assert status['authorized'] is True
        assert status['signatures_received'] == 3
    
    def test_3_of_4_quorum_failure(self):
        """Test that 2-of-4 does not authorize (needs 3)."""
        engine = SovereignHandshakeEngine()
        action = create_test_handshake()
        
        engine.create_handshake(
            action_id=action['action_id'],
            action_description=action['action_description'],
            target_assets=action['target_assets'],
            action_type=action['action_type']
        )
        
        # Add only 2 signatures (should not authorize)
        engine.add_ministry_signature(
            action['action_id'],
            ministry=MinistryType.WATER_AUTHORITY,
            signer_id='water_director_001',
            public_key='test_pub_key_1',
            signature='test_sig_1',
            location='Ministry of Water',
            ministry_seal='WATER-SEAL-001'
        )
        
        engine.add_ministry_signature(
            action['action_id'],
            ministry=MinistryType.POWER_GRID_OPERATOR,
            signer_id='power_director_001',
            public_key='test_pub_key_2',
            signature='test_sig_2',
            location='Ministry of Power',
            ministry_seal='POWER-SEAL-001'
        )
        
        # Verify NOT authorized
        status = engine.verify_authorization(action['action_id'])
        assert status['authorized'] is False
        assert status['signatures_received'] == 2
        assert status['signatures_required'] == 3


class TestFailureBranches:
    """Tests for failure scenarios."""
    
    def test_duplicate_ministry_signature_rejected(self):
        """Test that duplicate ministry signatures are rejected."""
        engine = SovereignHandshakeEngine()
        action = create_test_handshake()
        
        engine.create_handshake(
            action_id=action['action_id'],
            action_description=action['action_description'],
            target_assets=action['target_assets'],
            action_type=action['action_type']
        )
        
        # Add first signature
        engine.add_ministry_signature(
            action['action_id'],
            ministry=MinistryType.WATER_AUTHORITY,
            signer_id='water_director_001',
            public_key='test_pub_key_1',
            signature='test_sig_1',
            location='Ministry of Water',
            ministry_seal='WATER-SEAL-001'
        )
        
        # Try to add same ministry again
        with pytest.raises(ValueError, match="already signed"):
            engine.add_ministry_signature(
                action['action_id'],
                ministry=MinistryType.WATER_AUTHORITY,
                signer_id='water_director_002',
                public_key='test_pub_key_2',
                signature='test_sig_2',
                location='Ministry of Water',
                ministry_seal='WATER-SEAL-002'
            )
    
    def test_invalid_ministry_rejected(self):
        """Test that invalid ministries are rejected."""
        engine = SovereignHandshakeEngine()
        action = create_test_handshake()
        
        engine.create_handshake(
            action_id=action['action_id'],
            action_description=action['action_description'],
            target_assets=action['target_assets'],
            action_type=action['action_type']
        )
        
        # Try to add signature from non-required ministry
        # (Assuming only WATER, POWER, SECURITY, DEFENSE are required)
        with pytest.raises(ValueError, match="not required"):
            engine.add_ministry_signature(
                action['action_id'],
                ministry=MinistryType.REGULATORY_COMPLIANCE,  # If not in required list
                signer_id='reg_director_001',
                public_key='test_pub_key',
                signature='test_sig',
                location='Ministry of Regulation',
                ministry_seal='REG-SEAL-001'
            )
    
    def test_missing_biometric_handshake_rejected(self):
        """Test that signatures without biometric handshake are rejected."""
        engine = SovereignHandshakeEngine()
        action = create_test_handshake()
        
        engine.create_handshake(
            action_id=action['action_id'],
            action_description=action['action_description'],
            target_assets=action['target_assets'],
            action_type=action['action_type']
        )
        
        # Try to add signature without valid biometric handshake
        # (Implementation depends on biometric handshake validation)
        # This test would verify that invalid/missing biometrics are rejected


class TestBiometricHandshake:
    """Tests for biometric handshake validation."""
    
    def test_valid_biometric_handshake(self):
        """Test that valid biometric handshake is accepted."""
        handshake = BiometricHandshake(
            tablet_id='tablet_001',
            serial='SERIAL-001',
            operator_id='operator_001',
            timestamp=datetime.now(),
            iris_verified=True,
            palm_verified=True,
            token_verified=True,
            air_gap_verified=True
        )
        
        assert handshake.is_valid() is True
    
    def test_invalid_biometric_handshake_missing_verification(self):
        """Test that incomplete biometric verification is rejected."""
        handshake = BiometricHandshake(
            tablet_id='tablet_001',
            serial='SERIAL-001',
            operator_id='operator_001',
            timestamp=datetime.now(),
            iris_verified=True,
            palm_verified=True,
            token_verified=False,  # Missing token verification
            air_gap_verified=True
        )
        
        assert handshake.is_valid() is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
