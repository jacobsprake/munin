"""Tests for provenance ledger detecting synthetic corruption."""
import pytest
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from provenance_ledger import (
    ProvenanceLedger,
    HardwareRoot,
    DataSourceType,
    ProvenanceStatus
)
from datetime import datetime


class TestSyntheticCorruptionDetection:
    """Tests for detecting synthetic corruption attempts."""
    
    def test_unprovenanced_data_detected(self):
        """Test that unprovenanced data is detected."""
        ledger = ProvenanceLedger()
        
        # Register hardware root
        root = HardwareRoot(
            source_id="sensor_01",
            source_type=DataSourceType.SENSOR,
            hardware_id="TPM-001",
            public_key="PUB-KEY-01",
            certificate="CERT-01",
            issued_at=datetime.now().isoformat()
        )
        ledger.register_hardware_root(root)
        
        # Create provenanced data
        real_data = '{"value": 45.2}'
        record = ledger.create_provenance_record(
            data_id="data_001",
            source_id="sensor_01",
            data_content=real_data,
            hardware_signature="SIG-REAL"
        )
        
        assert record.status == ProvenanceStatus.PROVENANCED
        
        # Try to verify unprovenanced data
        fake_data = '{"value": 999.9}'  # Fake flood reading
        is_valid, status, reason = ledger.verify_provenance("fake_data", fake_data)
        
        assert not is_valid
        assert status == ProvenanceStatus.UNPROVENANCED
    
    def test_tampered_data_detected(self):
        """Test that tampered data is detected."""
        ledger = ProvenanceLedger()
        
        root = HardwareRoot(
            source_id="sensor_01",
            source_type=DataSourceType.SENSOR,
            hardware_id="TPM-001",
            public_key="PUB-KEY-01",
            certificate="CERT-01",
            issued_at=datetime.now().isoformat()
        )
        ledger.register_hardware_root(root)
        
        # Create provenanced data
        original_data = '{"value": 45.2}'
        record = ledger.create_provenance_record(
            data_id="data_001",
            source_id="sensor_01",
            data_content=original_data,
            hardware_signature="SIG-REAL"
        )
        
        # Try to verify tampered data
        tampered_data = '{"value": 999.9}'  # Modified value
        is_valid, status, reason = ledger.verify_provenance("data_001", tampered_data)
        
        assert not is_valid
        assert status == ProvenanceStatus.TAMPERED
        assert "hash mismatch" in reason.lower()
    
    def test_synthetic_corruption_detection(self):
        """Test synthetic corruption detection."""
        ledger = ProvenanceLedger()
        
        root = HardwareRoot(
            source_id="sensor_01",
            source_type=DataSourceType.SENSOR,
            hardware_id="TPM-001",
            public_key="PUB-KEY-01",
            certificate="CERT-01",
            issued_at=datetime.now().isoformat()
        )
        ledger.register_hardware_root(root)
        
        # Create fake data without proper hardware signature
        fake_data = '{"value": 999.9}'  # AI-generated fake flood reading
        fake_record = ledger.create_provenance_record(
            data_id="fake_data",
            source_id="sensor_01",
            data_content=fake_data,
            hardware_signature="FAKE-SIGNATURE"  # Invalid signature
        )
        
        # Detect synthetic corruption
        corruption = ledger.detect_synthetic_corruption("fake_data", fake_data)
        
        assert corruption['corruption_detected'] is True
        assert corruption['status'] in ['unprovenanced', 'tampered', 'revoked']
    
    def test_merkle_proof_per_data_point(self):
        """Test Merkle proof generation and verification per data point."""
        ledger = ProvenanceLedger()
        
        data_content = '{"sensor_id": "sensor_01", "value": 45.2}'
        timestamp = datetime.now().isoformat()
        
        # Create Merkle proof
        proof = ledger.create_merkle_proof_per_data_point(
            data_id="data_001",
            data_content=data_content,
            timestamp=timestamp
        )
        
        assert 'data_hash' in proof
        assert 'leaf_hash' in proof
        assert 'proof_path' in proof
        assert 'merkle_root' in proof
        
        # Verify proof
        is_valid, reason = ledger.verify_merkle_proof_per_data_point(proof, data_content)
        
        assert is_valid
        
        # Try with tampered data
        tampered_data = '{"sensor_id": "sensor_01", "value": 999.9}'
        is_valid_tampered, reason_tampered = ledger.verify_merkle_proof_per_data_point(proof, tampered_data)
        
        assert not is_valid_tampered
        assert "modified" in reason_tampered.lower()
    
    def test_revoked_hardware_root_detected(self):
        """Test that data from revoked hardware roots is detected."""
        ledger = ProvenanceLedger()
        
        root = HardwareRoot(
            source_id="sensor_01",
            source_type=DataSourceType.SENSOR,
            hardware_id="TPM-001",
            public_key="PUB-KEY-01",
            certificate="CERT-01",
            issued_at=datetime.now().isoformat()
        )
        ledger.register_hardware_root(root)
        
        # Revoke hardware root
        ledger.revoke_hardware_root("sensor_01")
        
        # Try to create provenance record with revoked root
        with pytest.raises(ValueError, match="revoked"):
            ledger.create_provenance_record(
                data_id="data_001",
                source_id="sensor_01",
                data_content='{"value": 45.2}',
                hardware_signature="SIG"
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
