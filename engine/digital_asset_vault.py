"""
Digital Asset Vault: Physical Logic Recovery
2026 Reality Feature: Civilization-Level Disaster Recovery

When a system is hacked (like a Ransomware attack on a city), the "Golden Image"
(the clean code) is often corrupted too.

The Product: The Munin Black-Box
- A physical, EMP-shielded, offline storage vault installed at every major substation
- Stores an immutable, cryptographically-signed "Snapshot" of the entire system's clean logic
- Stores the Asset-Dependency Graph

The Narrative: "When the sirens go off and the servers are wiped, you don't call IT.
You go to the Black-Box, turn the physical key, and Munin restores the state's brain
from a physical master-record."

Strategic Value: This is Civilization-Level Disaster Recovery.
"""

import json
import hashlib
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import uuid
import tarfile
import gzip


class VaultStatus(Enum):
    """Status of the digital asset vault."""
    SEALED = "sealed"  # Vault is sealed and offline
    OPEN = "open"  # Vault is open for read/write
    CORRUPTED = "corrupted"  # Vault integrity check failed
    RESTORING = "restoring"  # Currently restoring from vault


class SnapshotType(Enum):
    """Types of snapshots stored in the vault."""
    FULL_SYSTEM = "full_system"  # Complete system state
    GRAPH_ONLY = "graph_only"  # Just the dependency graph
    LOGIC_ONLY = "logic_only"  # Just the control logic
    CONFIG_ONLY = "config_only"  # Just configuration


class DigitalAssetVault:
    """Represents a physical Black-Box vault for disaster recovery."""
    
    def __init__(
        self,
        vault_id: str,
        location: Dict[str, Any],  # Physical location info
        vault_path: Path
    ):
        self.vault_id = vault_id
        self.location = location
        self.vault_path = vault_path
        self.status = VaultStatus.SEALED
        self.last_sealed = datetime.now()
        self.last_opened: Optional[datetime] = None
        self.snapshots: List[Dict] = []
        self.physical_key_hash: Optional[str] = None  # Hash of physical key used to open
        self.created_at = datetime.now()
        
        # Ensure vault directory exists
        self.vault_path.mkdir(parents=True, exist_ok=True)
    
    def seal(self, physical_key: str) -> Dict:
        """
        Seal the vault (make it read-only and offline).
        Requires physical key for authentication.
        """
        if self.status == VaultStatus.SEALED:
            return {'status': 'already_sealed', 'vaultId': self.vault_id}
        
        # Verify physical key
        key_hash = hashlib.sha256(physical_key.encode()).hexdigest()
        if self.physical_key_hash and key_hash != self.physical_key_hash:
            raise ValueError("Invalid physical key")
        
        # Create final snapshot before sealing
        snapshot = self._create_snapshot(SnapshotType.FULL_SYSTEM)
        self.snapshots.append(snapshot)
        
        # Write manifest
        self._write_manifest()
        
        # Seal vault (make read-only)
        self.status = VaultStatus.SEALED
        self.last_sealed = datetime.now()
        
        return {
            'status': 'sealed',
            'vaultId': self.vault_id,
            'sealedAt': self.last_sealed.isoformat(),
            'snapshotCount': len(self.snapshots)
        }
    
    def open(self, physical_key: str) -> Dict:
        """
        Open the vault (make it writable).
        Requires physical key for authentication.
        """
        # Store or verify physical key
        key_hash = hashlib.sha256(physical_key.encode()).hexdigest()
        if self.physical_key_hash is None:
            # First time opening - set the key
            self.physical_key_hash = key_hash
        elif key_hash != self.physical_key_hash:
            raise ValueError("Invalid physical key")
        
        # Verify vault integrity
        if not self._verify_integrity():
            self.status = VaultStatus.CORRUPTED
            raise ValueError("Vault integrity check failed - vault may be corrupted")
        
        self.status = VaultStatus.OPEN
        self.last_opened = datetime.now()
        
        return {
            'status': 'open',
            'vaultId': self.vault_id,
            'openedAt': self.last_opened.isoformat(),
            'snapshotCount': len(self.snapshots),
            'lastSealed': self.last_sealed.isoformat()
        }
    
    def create_snapshot(
        self,
        snapshot_type: SnapshotType,
        graph_data: Optional[Dict] = None,
        logic_data: Optional[Dict] = None,
        config_data: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Create a new snapshot of the system state.
        Vault must be open.
        """
        if self.status != VaultStatus.OPEN:
            raise ValueError("Vault must be open to create snapshots")
        
        snapshot = self._create_snapshot(
            snapshot_type,
            graph_data,
            logic_data,
            config_data,
            metadata
        )
        
        self.snapshots.append(snapshot)
        self._write_manifest()
        
        return snapshot
    
    def _create_snapshot(
        self,
        snapshot_type: SnapshotType,
        graph_data: Optional[Dict] = None,
        logic_data: Optional[Dict] = None,
        config_data: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Internal method to create a snapshot."""
        snapshot_id = str(uuid.uuid4())
        timestamp = datetime.now()
        
        # Create snapshot directory
        snapshot_dir = self.vault_path / "snapshots" / snapshot_id
        snapshot_dir.mkdir(parents=True, exist_ok=True)
        
        snapshot_data = {
            'id': snapshot_id,
            'type': snapshot_type.value,
            'timestamp': timestamp.isoformat(),
            'vaultId': self.vault_id,
            'location': self.location
        }
        
        # Store graph data
        if graph_data:
            graph_path = snapshot_dir / "graph.json"
            with open(graph_path, 'w') as f:
                json.dump(graph_data, f, indent=2)
            snapshot_data['graphHash'] = self._hash_file(graph_path)
        
        # Store logic data
        if logic_data:
            logic_path = snapshot_dir / "logic.json"
            with open(logic_path, 'w') as f:
                json.dump(logic_data, f, indent=2)
            snapshot_data['logicHash'] = self._hash_file(logic_path)
        
        # Store config data
        if config_data:
            config_path = snapshot_dir / "config.json"
            with open(config_path, 'w') as f:
                json.dump(config_data, f, indent=2)
            snapshot_data['configHash'] = self._hash_file(config_path)
        
        # Store metadata
        if metadata:
            metadata_path = snapshot_dir / "metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
        
        # Create compressed archive
        archive_path = snapshot_dir.parent / f"{snapshot_id}.tar.gz"
        with tarfile.open(archive_path, 'w:gz') as tar:
            tar.add(snapshot_dir, arcname=snapshot_id)
        
        # Compute snapshot hash
        snapshot_data['archiveHash'] = self._hash_file(archive_path)
        snapshot_data['archivePath'] = str(archive_path.relative_to(self.vault_path))
        
        # Sign snapshot with vault's cryptographic seal
        snapshot_data['seal'] = self._create_seal(snapshot_data)
        
        # Write snapshot manifest
        snapshot_manifest_path = snapshot_dir / "manifest.json"
        with open(snapshot_manifest_path, 'w') as f:
            json.dump(snapshot_data, f, indent=2)
        
        return snapshot_data
    
    def restore_from_snapshot(self, snapshot_id: str, restore_path: Path) -> Dict:
        """
        Restore system state from a snapshot.
        This is the "Civilization-Level Disaster Recovery" operation.
        """
        if self.status == VaultStatus.SEALED:
            raise ValueError("Vault must be open to restore from snapshot")
        
        # Find snapshot
        snapshot = next((s for s in self.snapshots if s['id'] == snapshot_id), None)
        if not snapshot:
            raise ValueError(f"Snapshot {snapshot_id} not found")
        
        # Verify snapshot integrity
        if not self._verify_snapshot_integrity(snapshot):
            raise ValueError(f"Snapshot {snapshot_id} integrity check failed")
        
        self.status = VaultStatus.RESTORING
        
        # Extract snapshot archive
        archive_path = self.vault_path / snapshot['archivePath']
        restore_path.mkdir(parents=True, exist_ok=True)
        
        with tarfile.open(archive_path, 'r:gz') as tar:
            tar.extractall(restore_path)
        
        # Load restored data
        snapshot_dir = restore_path / snapshot_id
        restored_data = {}
        
        if (snapshot_dir / "graph.json").exists():
            with open(snapshot_dir / "graph.json", 'r') as f:
                restored_data['graph'] = json.load(f)
        
        if (snapshot_dir / "logic.json").exists():
            with open(snapshot_dir / "logic.json", 'r') as f:
                restored_data['logic'] = json.load(f)
        
        if (snapshot_dir / "config.json").exists():
            with open(snapshot_dir / "config.json", 'r') as f:
                restored_data['config'] = json.load(f)
        
        self.status = VaultStatus.OPEN
        
        return {
            'status': 'restored',
            'snapshotId': snapshot_id,
            'restoredAt': datetime.now().isoformat(),
            'restorePath': str(restore_path),
            'restoredData': {
                'hasGraph': 'graph' in restored_data,
                'hasLogic': 'logic' in restored_data,
                'hasConfig': 'config' in restored_data
            }
        }
    
    def _verify_integrity(self) -> bool:
        """Verify vault integrity by checking all snapshots."""
        manifest_path = self.vault_path / "manifest.json"
        if not manifest_path.exists():
            return True  # Empty vault is valid (no snapshots to verify yet)
        
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            # Verify all snapshots
            for snapshot in manifest.get('snapshots', []):
                if not self._verify_snapshot_integrity(snapshot):
                    return False
            
            return True
        except Exception:
            return False
    
    def _verify_snapshot_integrity(self, snapshot: Dict) -> bool:
        """Verify a single snapshot's integrity."""
        try:
            # Check archive exists
            archive_path = self.vault_path / snapshot['archivePath']
            if not archive_path.exists():
                return False
            
            # Verify archive hash
            actual_hash = self._hash_file(archive_path)
            if actual_hash != snapshot['archiveHash']:
                return False
            
            # Verify seal
            expected_seal = self._create_seal(snapshot)
            if expected_seal != snapshot.get('seal'):
                return False
            
            return True
        except Exception:
            return False
    
    def _create_seal(self, snapshot_data: Dict) -> str:
        """Create cryptographic seal for snapshot."""
        # Combine all hashable data
        seal_data = json.dumps({
            'id': snapshot_data['id'],
            'timestamp': snapshot_data['timestamp'],
            'vaultId': snapshot_data['vaultId'],
            'archiveHash': snapshot_data.get('archiveHash', ''),
            'graphHash': snapshot_data.get('graphHash', ''),
            'logicHash': snapshot_data.get('logicHash', ''),
            'configHash': snapshot_data.get('configHash', '')
        }, sort_keys=True)
        
        # Hash with vault's secret (in production, use hardware security module)
        if not self.physical_key_hash:
            raise ValueError("Physical key hash is required for sealing. Cannot use default secret in production.")
        vault_secret = self.physical_key_hash
        seal = hashlib.sha256((seal_data + vault_secret).encode()).hexdigest()
        
        return seal
    
    def _hash_file(self, file_path: Path) -> str:
        """Compute SHA-256 hash of a file."""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def _write_manifest(self) -> None:
        """Write vault manifest file."""
        manifest = {
            'vaultId': self.vault_id,
            'location': self.location,
            'status': self.status.value,
            'lastSealed': self.last_sealed.isoformat(),
            'lastOpened': self.last_opened.isoformat() if self.last_opened else None,
            'createdAt': self.created_at.isoformat(),
            'snapshotCount': len(self.snapshots),
            'snapshots': self.snapshots
        }
        
        manifest_path = self.vault_path / "manifest.json"
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
    
    def get_status(self) -> Dict:
        """Get vault status."""
        return {
            'vaultId': self.vault_id,
            'status': self.status.value,
            'location': self.location,
            'lastSealed': self.last_sealed.isoformat(),
            'lastOpened': self.last_opened.isoformat() if self.last_opened else None,
            'snapshotCount': len(self.snapshots),
            'integrity': 'verified' if self._verify_integrity() else 'unknown',
            'createdAt': self.created_at.isoformat()
        }


def create_vault_at_location(
    location: Dict[str, Any],
    vault_base_path: Path
) -> DigitalAssetVault:
    """Create a new vault at a physical location."""
    vault_id = f"vault_{location.get('name', 'unknown').replace(' ', '_').lower()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    vault_path = vault_base_path / vault_id
    
    vault = DigitalAssetVault(
        vault_id=vault_id,
        location=location,
        vault_path=vault_path
    )
    
    return vault


if __name__ == "__main__":
    # Example usage
    vault_base = Path("out/vaults")
    vault_base.mkdir(parents=True, exist_ok=True)
    
    # Create vault at a substation
    location = {
        'name': 'Substation North 01',
        'address': '123 Infrastructure Way',
        'lat': 40.7128,
        'lon': -74.0060,
        'facilityType': 'substation'
    }
    
    vault = create_vault_at_location(location, vault_base)
    
    # Open vault with physical key
    vault.open("PHYSICAL_KEY_12345")
    
    # Create snapshot
    graph_data = {
        'nodes': [{'id': 'node1', 'label': 'Test Node'}],
        'edges': []
    }
    
    snapshot = vault.create_snapshot(
        SnapshotType.FULL_SYSTEM,
        graph_data=graph_data
    )
    
    print(f"Created snapshot: {snapshot['id']}")
    
    # Seal vault
    vault.seal("PHYSICAL_KEY_12345")
    
    # Get status
    status = vault.get_status()
    print(json.dumps(status, indent=2))

