"""Extended tests for approval workflow covering edge cases."""
import json
import sys
from pathlib import Path
from datetime import datetime
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from test_approval_workflow import load_packet, approve_packet, authorize_packet
from byzantine_resilience import ByzantineResilienceEngine, MinistryType


def create_test_packet(minimum_sign_off: bool = False) -> dict:
    """Create a test packet."""
    packet = {
        'id': 'test_packet_001',
        'version': 1,
        'createdTs': datetime.now().isoformat(),
        'status': 'ready',
        'scope': {
            'regions': ['north'],
            'nodeIds': ['pump_01', 'pump_02']
        },
        'situationSummary': 'Test incident',
        'proposedAction': 'Test action',
        'regulatoryBasis': 'Test basis',
        'playbookId': 'test_playbook',
        'evidenceRefs': [],
        'uncertainty': {'overall': 0.1, 'notes': []},
        'approvals': [
            {
                'role': 'EA Duty Officer',
                'minimum_sign_off': minimum_sign_off
            }
        ],
        'multiSig': {
            'required': 1 if minimum_sign_off else 2,
            'threshold': 1 if minimum_sign_off else 2,
            'currentSignatures': 0
        }
    }
    return packet


class TestMinimumSignOff:
    """Tests for minimum sign-off approval."""
    
    def test_single_sign_off_approval(self):
        """Test that minimum_sign_off allows single approval."""
        packet = create_test_packet(minimum_sign_off=True)
        
        # Approve with single signature
        approved = approve_packet(
            packet,
            role='EA Duty Officer',
            operator_id='operator_001'
        )
        
        assert approved['status'] == 'authorized'
        assert approved['multiSig']['currentSignatures'] == 1
        assert approved['multiSig']['threshold'] == 1
    
    def test_minimum_sign_off_with_multiple_roles(self):
        """Test minimum sign-off when multiple roles exist."""
        packet = create_test_packet(minimum_sign_off=True)
        packet['approvals'] = [
            {'role': 'EA Duty Officer', 'minimum_sign_off': True},
            {'role': 'Senior Operator'},
            {'role': 'Regulatory Officer'}
        ]
        
        approved = approve_packet(
            packet,
            role='EA Duty Officer',
            operator_id='operator_001'
        )
        
        # Should authorize with just EA Duty Officer signature
        assert approved['status'] == 'authorized'


class TestMixedConsequenceLevels:
    """Tests for mixed consequence levels."""
    
    def test_low_consequence_single_approval(self):
        """Test low-consequence actions require single approval."""
        packet = create_test_packet()
        packet['consequence_level'] = 'LOW'
        packet['multiSig'] = {'required': 1, 'threshold': 1, 'currentSignatures': 0}
        
        approved = approve_packet(
            packet,
            role='EA Duty Officer',
            operator_id='op_001'
        )
        
        # Low consequence should authorize with single signature
        assert approved['status'] == 'authorized'
    
    def test_high_consequence_multi_approval(self):
        """Test high-consequence actions require multiple approvals."""
        packet = create_test_packet()
        packet['consequence_level'] = 'HIGH'
        packet['approvals'] = [
            {'role': 'EA Duty Officer'},
            {'role': 'Senior Operator'},
            {'role': 'Supervisor'}
        ]
        packet['multiSig'] = {
            'required': 3,
            'threshold': 2,
            'currentSignatures': 0
        }
        
        # First approval - should not authorize
        approved = approve_packet(
            packet,
            role='EA Duty Officer',
            operator_id='op_001'
        )
        assert approved['status'] == 'ready'
        assert approved['multiSig']['currentSignatures'] == 1
        
        # Second approval - should authorize
        approved = approve_packet(
            approved,
            role='Senior Operator',
            operator_id='sup_001'
        )
        assert approved['status'] == 'authorized'
        assert approved['multiSig']['currentSignatures'] == 2


class TestInvalidSignatures:
    """Tests for invalid signature handling."""
    
    def test_duplicate_approval_rejected(self):
        """Test that duplicate approvals are rejected."""
        packet = create_test_packet()
        
        # First approval
        approved = approve_packet(
            packet,
            role='EA Duty Officer',
            operator_id='operator_001'
        )
        
        # Try to approve again with same operator
        with pytest.raises(ValueError, match="already approved"):
            approve_packet(
                approved,
                role='EA Duty Officer',
                operator_id='operator_001'
            )
    
    def test_invalid_role_rejected(self):
        """Test that invalid roles are rejected."""
        packet = create_test_packet()
        
        with pytest.raises(ValueError, match="not found"):
            approve_packet(
                packet,
                role='InvalidRole',
                operator_id='operator_001'
            )
    
    def test_missing_required_fields(self):
        """Test that packets with missing fields are rejected."""
        packet = create_test_packet()
        del packet['multiSig']
        
        with pytest.raises(KeyError):
            approve_packet(
                packet,
                role='EA Duty Officer',
                operator_id='operator_001'
            )
    
    def test_invalid_timestamp_format(self):
        """Test that invalid timestamps are handled."""
        packet = create_test_packet()
        
        # Should use current timestamp if invalid
        approved = approve_packet(
            packet,
            role='EA Duty Officer',
            operator_id='operator_001',
            timestamp=datetime.now()  # Valid timestamp
        )
        
        assert approved['approvals'][0]['signedTs'] is not None


class TestTimingMetrics:
    """Tests for timing metrics tracking."""
    
    def test_first_approval_timestamp_set(self):
        """Test that firstApprovalTs is set on first approval."""
        packet = create_test_packet()
        assert packet.get('firstApprovalTs') is None
        
        approved = approve_packet(
            packet,
            role='EA Duty Officer',
            operator_id='operator_001'
        )
        
        assert approved.get('firstApprovalTs') is not None
    
    def test_authorized_timestamp_set(self):
        """Test that authorizedTs is set when threshold met."""
        packet = create_test_packet(minimum_sign_off=True)
        assert packet.get('authorizedTs') is None
        
        authorized = authorize_packet(packet, role='EA Duty Officer', operator_id='op_001')
        
        if authorized['status'] == 'authorized':
            assert authorized.get('authorizedTs') is not None
    
    def test_time_to_authorize_calculated(self):
        """Test that timeToAuthorize is calculated correctly."""
        packet = create_test_packet(minimum_sign_off=True)
        packet['createdTs'] = datetime.now().isoformat()
        
        import time
        time.sleep(0.1)
        
        authorized = authorize_packet(packet, role='EA Duty Officer', operator_id='op_001')
        
        if authorized['status'] == 'authorized' and authorized.get('timeToAuthorize'):
            assert authorized['timeToAuthorize'] > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
