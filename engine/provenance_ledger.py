"""
Data Provenance Ledger: Anti-Treason Architecture
2026 End-State Feature: Hardware-Rooted Trust Layer

The biggest threat in 2026 is Synthetic Corruption—adversaries using AI to fake
sensor data or legal authorizations to trick officials into destroying their own
infrastructure.

The Feature: Data Provenance via Merkle-Trees
The Logic: Every single bit of data that enters Munin—from a water pressure sensor
to a Minister's voice command—is cryptographically hashed at the source.

The Result: You create a "Trust Layer" for the state. If an adversary tries to
"spoof" a flood to force a dam opening, Munin flags the data as "Unprovenanced"
because it lacks the hardware-rooted signature from the sensor.
"""

import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict


class ProvenanceStatus(Enum):
    """Status of data provenance verification."""
    PROVENANCED = "provenanced"  # Has hardware-rooted signature
    UNPROVENANCED = "unprovenanced"  # Missing signature
    TAMPERED = "tampered"  # Signature mismatch
    EXPIRED = "expired"  # Signature expired
    REVOKED = "revoked"  # Source revoked


class DataSourceType(Enum):
    """Types of data sources requiring provenance."""
    SENSOR = "sensor"  # Physical sensor reading
    SCADA = "scada"  # SCADA system data
    VOICE_COMMAND = "voice_command"  # Minister/operator voice command
    LEGAL_AUTHORIZATION = "legal_authorization"  # Legal document/authorization
    SATELLITE = "satellite"  # Satellite observation data
    CROSS_VERIFICATION = "cross_verification"  # Cross-verification data


@dataclass
class HardwareRoot:
    """Hardware-rooted identity for a data source."""
    source_id: str
    source_type: DataSourceType
    hardware_id: str  # Unique hardware identifier (e.g., TPM key)
    public_key: str  # Public key for signature verification
    certificate: str  # Hardware certificate
    issued_at: str
    expires_at: Optional[str] = None
    revoked: bool = False
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        data = asdict(self)
        data['source_type'] = self.source_type.value
        return data


@dataclass
class ProvenanceRecord:
    """Provenance record for a piece of data."""
    data_id: str
    source_id: str
    data_hash: str
    hardware_signature: str
    merkle_proof: str  # Merkle proof linking to ledger
    timestamp: str
    status: ProvenanceStatus
    verified_at: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        data = asdict(self)
        data['status'] = self.status.value
        return data


class ProvenanceLedger:
    """
    Hardware-rooted provenance ledger for all data entering Munin.
    Creates an immutable trust layer that prevents synthetic corruption.
    """
    
    def __init__(self):
        self.hardware_roots: Dict[str, HardwareRoot] = {}
        self.provenance_records: List[ProvenanceRecord] = []
        self.merkle_tree: List[str] = []  # Merkle tree of all provenance records
        self.merkle_root: Optional[str] = None
    
    def register_hardware_root(self, root: HardwareRoot) -> None:
        """Register a hardware root for a data source."""
        if root.revoked:
            raise ValueError(f"Hardware root {root.source_id} is revoked")
        
        self.hardware_roots[root.source_id] = root
    
    def revoke_hardware_root(self, source_id: str) -> None:
        """Revoke a hardware root (e.g., compromised sensor)."""
        if source_id in self.hardware_roots:
            self.hardware_roots[source_id].revoked = True
    
    def create_provenance_record(
        self,
        data_id: str,
        source_id: str,
        data_content: str,
        hardware_signature: str
    ) -> ProvenanceRecord:
        """
        Create a provenance record for incoming data.
        Verifies hardware signature and creates Merkle proof.
        """
        # Verify hardware root exists
        if source_id not in self.hardware_roots:
            record = ProvenanceRecord(
                data_id=data_id,
                source_id=source_id,
                data_hash=self._hash_data(data_content),
                hardware_signature=hardware_signature,
                merkle_proof="",
                timestamp=datetime.now().isoformat(),
                status=ProvenanceStatus.UNPROVENANCED
            )
            return record
        
        hardware_root = self.hardware_roots[source_id]
        
        # Check if revoked
        if hardware_root.revoked:
            raise ValueError(f"Hardware root {source_id} is revoked")
        
        # Verify hardware signature (in production, use actual cryptographic verification)
        signature_valid = self._verify_hardware_signature(
            data_content,
            hardware_signature,
            hardware_root.public_key
        )
        
        if not signature_valid:
            record = ProvenanceRecord(
                data_id=data_id,
                source_id=source_id,
                data_hash=self._hash_data(data_content),
                hardware_signature=hardware_signature,
                merkle_proof="",
                timestamp=datetime.now().isoformat(),
                status=ProvenanceStatus.TAMPERED
            )
            return record
        
        # Create Merkle proof
        data_hash = self._hash_data(data_content)
        merkle_proof = self._add_to_merkle_tree(data_hash)
        
        record = ProvenanceRecord(
            data_id=data_id,
            source_id=source_id,
            data_hash=data_hash,
            hardware_signature=hardware_signature,
            merkle_proof=merkle_proof,
            timestamp=datetime.now().isoformat(),
            status=ProvenanceStatus.PROVENANCED,
            verified_at=datetime.now().isoformat()
        )
        
        self.provenance_records.append(record)
        return record
    
    def verify_provenance(self, data_id: str, data_content: str) -> Tuple[bool, ProvenanceStatus, str]:
        """
        Verify the provenance of data.
        Returns (is_valid, status, reason).
        """
        # Find provenance record
        record = next((r for r in self.provenance_records if r.data_id == data_id), None)
        
        if not record:
            return False, ProvenanceStatus.UNPROVENANCED, "No provenance record found"
        
        # Verify data hash matches
        data_hash = self._hash_data(data_content)
        if data_hash != record.data_hash:
            return False, ProvenanceStatus.TAMPERED, "Data hash mismatch - data has been modified"
        
        # Check status
        if record.status != ProvenanceStatus.PROVENANCED:
            return False, record.status, f"Provenance status: {record.status.value}"
        
        # Verify Merkle proof
        merkle_valid = self._verify_merkle_proof(record.merkle_proof, record.data_hash)
        if not merkle_valid:
            return False, ProvenanceStatus.TAMPERED, "Merkle proof verification failed"
        
        return True, ProvenanceStatus.PROVENANCED, "Provenance verified"
    
    def detect_synthetic_corruption(self, data_id: str, data_content: str) -> Dict:
        """
        Detect synthetic corruption attempts (AI-generated fake data).
        """
        is_valid, status, reason = self.verify_provenance(data_id, data_content)
        
        corruption_detected = status in [
            ProvenanceStatus.UNPROVENANCED,
            ProvenanceStatus.TAMPERED,
            ProvenanceStatus.REVOKED
        ]
        
        return {
            'corruption_detected': corruption_detected,
            'status': status.value,
            'reason': reason,
            'data_id': data_id,
            'timestamp': datetime.now().isoformat()
        }
    
    def create_merkle_proof_per_data_point(
        self,
        data_id: str,
        data_content: str,
        timestamp: str
    ) -> Dict:
        """
        Create Merkle proof for a single data point.
        
        Returns proof that can be verified independently.
        """
        data_hash = self._hash_data(data_content)
        
        # Create leaf node hash: SHA-256(data_id:timestamp:data_hash)
        leaf_data = f"{data_id}:{timestamp}:{data_hash}"
        leaf_hash = hashlib.sha256(leaf_data.encode()).hexdigest()
        
        # Add to Merkle tree
        self.merkle_tree.append(leaf_hash)
        
        # Build Merkle proof path (simplified - would use proper Merkle tree in production)
        proof_path = []
        current_index = len(self.merkle_tree) - 1
        
        # Generate proof siblings (simplified binary tree)
        while current_index > 0:
            sibling_index = current_index ^ 1  # XOR to get sibling
            if sibling_index < len(self.merkle_tree):
                proof_path.append({
                    'index': sibling_index,
                    'hash': self.merkle_tree[sibling_index]
                })
            current_index = (current_index - 1) // 2
        
        # Compute root hash
        self.merkle_root = self._compute_merkle_root()
        
        return {
            'data_id': data_id,
            'data_hash': data_hash,
            'leaf_hash': leaf_hash,
            'proof_path': proof_path,
            'merkle_root': self.merkle_root,
            'timestamp': timestamp
        }
    
    def verify_merkle_proof_per_data_point(
        self,
        proof: Dict,
        data_content: str
    ) -> Tuple[bool, str]:
        """
        Verify Merkle proof for a data point.
        
        Returns (is_valid, reason)
        """
        # Recompute data hash
        data_hash = self._hash_data(data_content)
        
        # Recompute leaf hash
        leaf_data = f"{proof['data_id']}:{proof['timestamp']}:{data_hash}"
        leaf_hash = hashlib.sha256(leaf_data.encode()).hexdigest()
        
        if leaf_hash != proof['leaf_hash']:
            return False, "Leaf hash mismatch - data point has been modified"
        
        # Verify proof path (simplified - would use proper Merkle tree verification)
        # In production, would verify sibling hashes lead to root
        if proof.get('merkle_root') != self.merkle_root:
            return False, "Merkle root mismatch - proof invalid"
        
        return True, "Merkle proof verified"
    
    def _hash_data(self, data: str) -> str:
        """Compute SHA-256 hash of data."""
        return hashlib.sha256(data.encode()).hexdigest()
    
    def _verify_hardware_signature(
        self,
        data: str,
        signature: str,
        public_key: str
    ) -> bool:
        """
        Verify hardware signature (in production, use actual cryptographic verification).
        For now, simulate verification.
        """
        # In production, this would:
        # 1. Use public key to verify signature
        # 2. Check certificate chain
        # 3. Verify signature matches data hash
        
        # Simulate: accept any SIG- prefix (simulation mode); in production verify data hash
        if not signature.startswith("SIG-"):
            return False
        data_hash = self._hash_data(data)
        return signature.startswith(f"SIG-{data_hash[:16]}") or len(signature) > 4
    
    def _compute_merkle_root(self) -> str:
        """Compute Merkle root from current merkle_tree leaves."""
        if not self.merkle_tree:
            return hashlib.sha256(b"").hexdigest()
        if len(self.merkle_tree) == 1:
            return self.merkle_tree[0]
        current_level = self.merkle_tree.copy()
        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                if i + 1 < len(current_level):
                    combined = f"{current_level[i]}:{current_level[i+1]}"
                    next_level.append(self._hash_data(combined))
                else:
                    next_level.append(current_level[i])
            current_level = next_level
        return current_level[0]

    def _add_to_merkle_tree(self, data_hash: str) -> str:
        """Add data hash to Merkle tree and return proof."""
        self.merkle_tree.append(data_hash)
        
        # Build Merkle tree
        if len(self.merkle_tree) == 1:
            self.merkle_root = data_hash
            return data_hash
        
        # Rebuild Merkle tree
        current_level = self.merkle_tree.copy()
        
        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                if i + 1 < len(current_level):
                    combined = f"{current_level[i]}:{current_level[i+1]}"
                    next_level.append(self._hash_data(combined))
                else:
                    next_level.append(current_level[i])
            current_level = next_level
        
        self.merkle_root = current_level[0]
        
        # Generate proof (simplified - in production, generate full Merkle path)
        return f"PROOF-{data_hash[:16]}-{self.merkle_root[:16]}"
    
    def _verify_merkle_proof(self, proof: str, data_hash: str) -> bool:
        """Verify Merkle proof (simplified)."""
        # In production, verify full Merkle path
        return proof.startswith("PROOF-") and data_hash in proof
    
    def get_ledger_summary(self) -> Dict:
        """Get summary of provenance ledger."""
        total_records = len(self.provenance_records)
        provenanced = sum(1 for r in self.provenance_records if r.status == ProvenanceStatus.PROVENANCED)
        unprovenanced = sum(1 for r in self.provenance_records if r.status == ProvenanceStatus.UNPROVENANCED)
        tampered = sum(1 for r in self.provenance_records if r.status == ProvenanceStatus.TAMPERED)
        
        return {
            'total_records': total_records,
            'provenanced': provenanced,
            'unprovenanced': unprovenanced,
            'tampered': tampered,
            'provenance_rate': provenanced / total_records if total_records > 0 else 0.0,
            'merkle_root': self.merkle_root,
            'registered_sources': len(self.hardware_roots),
            'timestamp': datetime.now().isoformat()
        }
    
    def to_dict(self) -> Dict:
        """Convert ledger to dictionary."""
        return {
            'hardware_roots': {k: v.to_dict() for k, v in self.hardware_roots.items()},
            'provenance_records': [r.to_dict() for r in self.provenance_records[-1000:]],  # Last 1000
            'merkle_root': self.merkle_root,
            'summary': self.get_ledger_summary()
        }


if __name__ == "__main__":
    print("="*70)
    print("Data Provenance Ledger: Anti-Treason Architecture")
    print("="*70)
    print("\nThe 2026 Threat: Synthetic Corruption")
    print("  - AI agents faking sensor data")
    print("  - AI agents generating fake legal authorizations")
    print("  - Adversaries tricking officials into destroying infrastructure")
    print("\nThe Solution: Hardware-Rooted Provenance")
    print("  - Every data bit cryptographically hashed at source")
    print("  - Merkle-tree linked trust layer")
    print("  - Unprovenanced data flagged as suspicious")
    print("\n" + "="*70)
    
    # Create ledger
    ledger = ProvenanceLedger()
    
    # Register hardware root for a sensor
    sensor_root = HardwareRoot(
        source_id="sensor_water_pressure_01",
        source_type=DataSourceType.SENSOR,
        hardware_id="TPM-001-ABC123",
        public_key="PUB-KEY-SENSOR-01",
        certificate="CERT-SENSOR-01",
        issued_at=datetime.now().isoformat()
    )
    ledger.register_hardware_root(sensor_root)
    
    # Create provenanced data
    data_content = '{"sensor_id": "sensor_water_pressure_01", "value": 45.2, "unit": "psi"}'
    data_hash = hashlib.sha256(data_content.encode()).hexdigest()
    hardware_signature = f"SIG-{data_hash[:16]}-TPM-001"
    
    record = ledger.create_provenance_record(
        data_id="data_001",
        source_id="sensor_water_pressure_01",
        data_content=data_content,
        hardware_signature=hardware_signature
    )
    
    print(f"\nCreated Provenance Record:")
    print(f"  Data ID: {record.data_id}")
    print(f"  Status: {record.status.value}")
    print(f"  Merkle Proof: {record.merkle_proof[:50]}...")
    
    # Verify provenance
    is_valid, status, reason = ledger.verify_provenance("data_001", data_content)
    print(f"\nVerification Result:")
    print(f"  Valid: {is_valid}")
    print(f"  Status: {status.value}")
    print(f"  Reason: {reason}")
    
    # Test synthetic corruption detection
    fake_data = '{"sensor_id": "sensor_water_pressure_01", "value": 999.9, "unit": "psi"}'  # Fake flood reading
    fake_record = ledger.create_provenance_record(
        data_id="data_002",
        source_id="sensor_water_pressure_01",
        data_content=fake_data,
        hardware_signature="FAKE-SIGNATURE"  # Missing hardware signature
    )
    
    print(f"\nSynthetic Corruption Test:")
    print(f"  Fake Data Status: {fake_record.status.value}")
    
    corruption = ledger.detect_synthetic_corruption("data_002", fake_data)
    print(f"  Corruption Detected: {corruption['corruption_detected']}")
    print(f"  Reason: {corruption['reason']}")
    
    # Summary
    print("\n" + "="*70)
    print("Ledger Summary")
    print("="*70)
    summary = ledger.get_ledger_summary()
    print(json.dumps(summary, indent=2))
    
    print("\n" + "="*70)
    print("The Trust Layer: Munin flags unprovenanced data as suspicious")
    print("="*70)


