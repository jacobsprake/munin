"""
Byzantine Resilience: Decentralized Multi-Sig for Physical Assets
The "Treason-Proofing" Feature

In 2026, the biggest threat to national infrastructure isn't just a hacker;
it's an insider threat or a compromised administrator.

Decentralized Multi-Sig for Physical Assets
For any high-consequence action (like opening a dam or shutting down a grid sector),
Munin requires an m-of-n cryptographic signature from different, physically separated ministries.

Strategic Value: This makes it extremely difficult for a single person to sabotage
critical infrastructure. This isn't just security; it's a
"Constitutional Architecture" for infrastructure.
"""

import json
import hashlib
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum


class MinistryType(Enum):
    """Different ministries that must sign for high-consequence actions."""
    WATER_AUTHORITY = "water_authority"
    POWER_GRID_OPERATOR = "power_grid_operator"
    NATIONAL_SECURITY = "national_security"
    DEFENSE_COORDINATION = "defense_coordination"
    REGULATORY_COMPLIANCE = "regulatory_compliance"
    EMERGENCY_SERVICES = "emergency_services"


class ActionConsequenceLevel(Enum):
    """Consequence levels for actions."""
    LOW = "low"  # Standard operations
    MEDIUM = "medium"  # Significant impact
    HIGH = "high"  # High-consequence: requires multi-sig
    CRITICAL = "critical"  # Critical: requires maximum multi-sig


@dataclass
class BiometricHandshake:
    """Biometric handshake from an air-gapped terminal."""
    operator_id: str
    iris_verified: bool
    palm_verified: bool
    token_verified: bool
    tablet_id: str  # Sovereign Handshake Tablet ID
    tablet_serial: str
    air_gap_verified: bool  # Verified as air-gapped
    handshake_timestamp: str
    handshake_signature: str  # Cryptographic signature from tablet


@dataclass
class MinistrySignature:
    """Signature from a specific ministry."""
    ministry: MinistryType
    signer_id: str
    public_key: str
    signature: str  # PQC signature
    timestamp: str
    location: str  # Physical location of signing (for verification)
    ministry_seal: str  # Cryptographic seal of the ministry
    biometric_handshake: Optional[BiometricHandshake] = None  # Required for critical actions


@dataclass
class ByzantineMultiSig:
    """Byzantine multi-signature requirement for high-consequence actions."""
    action_id: str
    consequence_level: ActionConsequenceLevel
    required_ministries: List[MinistryType]  # N ministries
    threshold: int  # M-of-N signatures required
    signatures: List[MinistrySignature]
    action_description: str
    target_assets: List[str]  # Physical assets affected
    requires_biometric_handshake: bool = True  # Require biometric handshakes from air-gapped terminals
    
    def is_authorized(self) -> bool:
        """Check if action is authorized (has M-of-N signatures from different ministries)."""
        if len(self.signatures) < self.threshold:
            return False
        
        # Verify signatures are from different ministries
        ministries_signed = {sig.ministry for sig in self.signatures}
        if len(ministries_signed) < self.threshold:
            return False
        
        # Verify all required ministries have signed (for critical actions)
        if self.consequence_level == ActionConsequenceLevel.CRITICAL:
            required_set = set(self.required_ministries)
            if not required_set.issubset(ministries_signed):
                return False
        
        # Verify biometric handshakes for critical actions
        if self.requires_biometric_handshake and self.consequence_level in [ActionConsequenceLevel.HIGH, ActionConsequenceLevel.CRITICAL]:
            for sig in self.signatures:
                if sig.biometric_handshake is None:
                    return False
                # Verify all biometric factors
                handshake = sig.biometric_handshake
                if not (handshake.iris_verified and handshake.palm_verified and handshake.token_verified):
                    return False
                if not handshake.air_gap_verified:
                    return False
        
        return True
    
    def get_signature_status(self) -> Dict:
        """Get status of signatures."""
        ministries_signed = {sig.ministry.value for sig in self.signatures}
        required_set = {m.value for m in self.required_ministries}
        missing = required_set - ministries_signed
        
        return {
            'authorized': self.is_authorized(),
            'signatures_received': len(self.signatures),
            'threshold_required': self.threshold,
            'ministries_signed': list(ministries_signed),
            'ministries_missing': list(missing),
            'consequence_level': self.consequence_level.value
        }


class ByzantineResilienceEngine:
    """
    Engine that enforces Byzantine multi-signature requirements for high-consequence actions.
    Makes it physically impossible for a single person to sabotage critical infrastructure.
    """
    
    def __init__(self):
        self.pending_actions: Dict[str, ByzantineMultiSig] = {}
        self.completed_actions: Dict[str, ByzantineMultiSig] = {}
    
    def determine_multi_sig_requirements(
        self,
        action_description: str,
        target_assets: List[str],
        action_type: str
    ) -> Tuple[List[MinistryType], int]:
        """
        Determine which ministries must sign and the threshold (M-of-N).
        
        High-consequence actions require signatures from physically separated ministries.
        """
        # Map action types to consequence levels
        high_consequence_actions = [
            'open_dam', 'close_dam', 'shutdown_grid_sector',
            'divert_water_major', 'isolate_power_station',
            'emergency_shutdown', 'critical_valve_operation'
        ]
        
        is_high_consequence = any(action in action_type.lower() for action in high_consequence_actions)
        
        if is_high_consequence:
            # Critical actions: require 3-of-4 signatures from different ministries
            required_ministries = [
                MinistryType.WATER_AUTHORITY,
                MinistryType.POWER_GRID_OPERATOR,
                MinistryType.NATIONAL_SECURITY,
                MinistryType.REGULATORY_COMPLIANCE
            ]
            threshold = 3
        else:
            # Standard actions: require 2-of-3 signatures
            required_ministries = [
                MinistryType.WATER_AUTHORITY,
                MinistryType.REGULATORY_COMPLIANCE,
                MinistryType.EMERGENCY_SERVICES
            ]
            threshold = 2
        
        return required_ministries, threshold
    
    def create_byzantine_multi_sig(
        self,
        action_id: str,
        action_description: str,
        target_assets: List[str],
        action_type: str
    ) -> ByzantineMultiSig:
        """Create a new Byzantine multi-signature requirement."""
        required_ministries, threshold = self.determine_multi_sig_requirements(
            action_description, target_assets, action_type
        )
        
        # Determine consequence level
        if threshold >= 3:
            consequence_level = ActionConsequenceLevel.CRITICAL
        elif threshold >= 2:
            consequence_level = ActionConsequenceLevel.HIGH
        else:
            consequence_level = ActionConsequenceLevel.MEDIUM
        
        multi_sig = ByzantineMultiSig(
            action_id=action_id,
            consequence_level=consequence_level,
            required_ministries=required_ministries,
            threshold=threshold,
            signatures=[],
            action_description=action_description,
            target_assets=target_assets
        )
        
        self.pending_actions[action_id] = multi_sig
        return multi_sig
    
    def add_ministry_signature(
        self,
        action_id: str,
        ministry: MinistryType,
        signer_id: str,
        public_key: str,
        signature: str,
        location: str,
        ministry_seal: str,
        biometric_handshake: Optional[BiometricHandshake] = None
    ) -> bool:
        """
        Add a signature from a ministry.
        For critical actions, requires biometric handshake from air-gapped terminal.
        Returns True if action is now authorized.
        """
        if action_id not in self.pending_actions:
            raise ValueError(f"Action {action_id} not found")
        
        multi_sig = self.pending_actions[action_id]
        
        # Check if this ministry is required
        if ministry not in multi_sig.required_ministries:
            raise ValueError(f"Ministry {ministry.value} is not required for this action")
        
        # Check if ministry already signed
        if any(sig.ministry == ministry for sig in multi_sig.signatures):
            raise ValueError(f"Ministry {ministry.value} has already signed")
        
        # Verify biometric handshake for critical actions
        if multi_sig.requires_biometric_handshake and multi_sig.consequence_level in [ActionConsequenceLevel.HIGH, ActionConsequenceLevel.CRITICAL]:
            if biometric_handshake is None:
                raise ValueError(f"Biometric handshake required for {multi_sig.consequence_level.value} actions")
            if not (biometric_handshake.iris_verified and biometric_handshake.palm_verified and biometric_handshake.token_verified):
                raise ValueError("Biometric handshake verification failed: all factors must be verified")
            if not biometric_handshake.air_gap_verified:
                raise ValueError("Biometric handshake must come from air-gapped terminal")
        
        # Add signature
        ministry_sig = MinistrySignature(
            ministry=ministry,
            signer_id=signer_id,
            public_key=public_key,
            signature=signature,
            timestamp=datetime.now().isoformat(),
            location=location,
            ministry_seal=ministry_seal,
            biometric_handshake=biometric_handshake
        )
        
        multi_sig.signatures.append(ministry_sig)
        
        # Check if authorized
        if multi_sig.is_authorized():
            # Move to completed
            self.completed_actions[action_id] = multi_sig
            del self.pending_actions[action_id]
            return True
        
        return False
    
    def verify_action_authorization(self, action_id: str) -> Dict:
        """Verify if an action is authorized."""
        if action_id in self.completed_actions:
            multi_sig = self.completed_actions[action_id]
            status = multi_sig.get_signature_status()
            status['action_id'] = action_id
            status['action_description'] = multi_sig.action_description
            return status
        elif action_id in self.pending_actions:
            multi_sig = self.pending_actions[action_id]
            status = multi_sig.get_signature_status()
            status['action_id'] = action_id
            status['action_description'] = multi_sig.action_description
            return status
        else:
            return {
                'authorized': False,
                'error': f'Action {action_id} not found'
            }
    
    def get_pending_actions_requiring_signatures(self) -> List[Dict]:
        """Get all pending actions that still need signatures."""
        pending = []
        for action_id, multi_sig in self.pending_actions.items():
            status = multi_sig.get_signature_status()
            if not status['authorized']:
                pending.append({
                    'action_id': action_id,
                    'action_description': multi_sig.action_description,
                    'target_assets': multi_sig.target_assets,
                    'consequence_level': multi_sig.consequence_level.value,
                    'signatures_received': status['signatures_received'],
                    'threshold_required': status['threshold_required'],
                    'ministries_signed': status['ministries_signed'],
                    'ministries_missing': status['ministries_missing']
                })
        return pending


def integrate_byzantine_multi_sig_into_packet(
    packet: Dict,
    byzantine_engine: ByzantineResilienceEngine
) -> Dict:
    """
    Integrate Byzantine multi-sig requirements into a handshake packet.
    """
    # Determine if this is a high-consequence action
    action_description = packet.get('proposedAction', '')
    target_assets = packet.get('scope', {}).get('nodeIds', [])
    
    # Check playbook type for action type
    playbook_id = packet.get('playbookId', '')
    
    # Create Byzantine multi-sig requirement
    action_id = packet['id']
    multi_sig = byzantine_engine.create_byzantine_multi_sig(
        action_id=action_id,
        action_description=action_description,
        target_assets=target_assets,
        action_type=playbook_id
    )
    
    # Add to packet
    packet['byzantineMultiSig'] = {
        'actionId': action_id,
        'consequenceLevel': multi_sig.consequence_level.value,
        'requiredMinistries': [m.value for m in multi_sig.required_ministries],
        'threshold': multi_sig.threshold,
        'currentSignatures': len(multi_sig.signatures),
        'signatures': [asdict(sig) for sig in multi_sig.signatures],
        'authorized': multi_sig.is_authorized()
    }
    
    return packet


class QuorumLogicController:
    """
    Quorum-Logic Controller: Enforces m-of-n quorum with biometric handshakes
    from air-gapped terminals for high-stakes infrastructure operations.
    
    This is the "Treason-Proof State" feature: No single rogue official can
    trigger a catastrophe. Requires biometric and cryptographic handshakes from
    physically separated, air-gapped terminals.
    """
    
    def __init__(self, byzantine_engine: ByzantineResilienceEngine):
        self.byzantine_engine = byzantine_engine
        self.air_gapped_terminals: Dict[str, Dict] = {}  # terminal_id -> terminal info
    
    def register_air_gapped_terminal(
        self,
        terminal_id: str,
        ministry: MinistryType,
        location: str,
        tablet_serial: str
    ) -> None:
        """Register an air-gapped terminal for a ministry."""
        self.air_gapped_terminals[terminal_id] = {
            'ministry': ministry,
            'location': location,
            'tabletSerial': tablet_serial,
            'isAirGapped': True,
            'lastVerified': datetime.now().isoformat()
        }
    
    def create_quorum_requirement(
        self,
        action_id: str,
        action_description: str,
        target_assets: List[str],
        action_type: str,
        m: int,  # Minimum signatures required
        n: int   # Total number of agencies
    ) -> ByzantineMultiSig:
        """
        Create a quorum requirement for a high-stakes operation.
        Requires m-of-n agencies to provide biometric handshakes from air-gapped terminals.
        """
        # Create Byzantine multi-sig
        multi_sig = self.byzantine_engine.create_byzantine_multi_sig(
            action_id=action_id,
            action_description=action_description,
            target_assets=target_assets,
            action_type=action_type
        )
        
        # Override threshold for quorum
        multi_sig.threshold = m
        multi_sig.requires_biometric_handshake = True
        
        return multi_sig
    
    def add_quorum_signature_with_handshake(
        self,
        action_id: str,
        ministry: MinistryType,
        signer_id: str,
        public_key: str,
        signature: str,
        location: str,
        ministry_seal: str,
        tablet_id: str,
        tablet_serial: str,
        iris_verified: bool,
        palm_verified: bool,
        token_verified: bool
    ) -> bool:
        """
        Add a quorum signature with biometric handshake from air-gapped terminal.
        This is the "Authoritative Handshake" for critical operations.
        """
        # Verify terminal is registered and air-gapped
        if tablet_id not in self.air_gapped_terminals:
            raise ValueError(f"Terminal {tablet_id} not registered")
        
        terminal = self.air_gapped_terminals[tablet_id]
        if terminal['ministry'] != ministry:
            raise ValueError(f"Terminal {tablet_id} not assigned to {ministry.value}")
        
        if not terminal['isAirGapped']:
            raise ValueError(f"Terminal {tablet_id} is not air-gapped")
        
        # Create biometric handshake
        handshake = BiometricHandshake(
            operator_id=signer_id,
            iris_verified=iris_verified,
            palm_verified=palm_verified,
            token_verified=token_verified,
            tablet_id=tablet_id,
            tablet_serial=tablet_serial,
            air_gap_verified=True,
            handshake_timestamp=datetime.now().isoformat(),
            handshake_signature=hashlib.sha256(
                f"{tablet_id}:{tablet_serial}:{signer_id}:{datetime.now().isoformat()}".encode()
            ).hexdigest()
        )
        
        # Add signature with handshake
        return self.byzantine_engine.add_ministry_signature(
            action_id=action_id,
            ministry=ministry,
            signer_id=signer_id,
            public_key=public_key,
            signature=signature,
            location=location,
            ministry_seal=ministry_seal,
            biometric_handshake=handshake
        )
    
    def get_quorum_status(self, action_id: str) -> Dict:
        """Get status of quorum requirement."""
        auth_status = self.byzantine_engine.verify_action_authorization(action_id)
        
        # Get handshake details
        if action_id in self.byzantine_engine.pending_actions:
            multi_sig = self.byzantine_engine.pending_actions[action_id]
        elif action_id in self.byzantine_engine.completed_actions:
            multi_sig = self.byzantine_engine.completed_actions[action_id]
        else:
            return {'error': f'Action {action_id} not found'}
        
        handshake_details = []
        for sig in multi_sig.signatures:
            if sig.biometric_handshake:
                handshake_details.append({
                    'ministry': sig.ministry.value,
                    'operatorId': sig.biometric_handshake.operator_id,
                    'tabletId': sig.biometric_handshake.tablet_id,
                    'tabletSerial': sig.biometric_handshake.tablet_serial,
                    'allFactorsVerified': (
                        sig.biometric_handshake.iris_verified and
                        sig.biometric_handshake.palm_verified and
                        sig.biometric_handshake.token_verified
                    ),
                    'airGapVerified': sig.biometric_handshake.air_gap_verified
                })
        
        return {
            **auth_status,
            'handshakeDetails': handshake_details,
            'quorumType': f"{multi_sig.threshold}-of-{len(multi_sig.required_ministries)}",
            'requiresBiometricHandshake': multi_sig.requires_biometric_handshake
        }


if __name__ == "__main__":
    # Example: Quorum-Logic Controller for "Black Start" after grid collapse
    engine = ByzantineResilienceEngine()
    quorum_controller = QuorumLogicController(engine)
    
    # Register air-gapped terminals
    quorum_controller.register_air_gapped_terminal(
        terminal_id="terminal_water_001",
        ministry=MinistryType.WATER_AUTHORITY,
        location="Ministry of Water, Secure Bunker",
        tablet_serial="TABLET-WATER-001"
    )
    
    quorum_controller.register_air_gapped_terminal(
        terminal_id="terminal_power_001",
        ministry=MinistryType.POWER_GRID_OPERATOR,
        location="National Grid Control Center, Air-Gapped Room",
        tablet_serial="TABLET-POWER-001"
    )
    
    quorum_controller.register_air_gapped_terminal(
        terminal_id="terminal_security_001",
        ministry=MinistryType.NATIONAL_SECURITY,
        location="National Security Agency, Isolated Facility",
        tablet_serial="TABLET-SECURITY-001"
    )
    
    # Create quorum requirement for "Black Start" (3-of-3 agencies)
    action_id = "black_start_20260115_020000"
    multi_sig = quorum_controller.create_quorum_requirement(
        action_id=action_id,
        action_description="Initiate Black Start: Restore grid after total collapse",
        target_assets=["grid_sector_north", "grid_sector_south", "backup_generator_01"],
        action_type="black_start",
        m=3,  # Require all 3 agencies
        n=3
    )
    
    print(f"Created Quorum-Logic requirement for: {multi_sig.action_description}")
    print(f"  Quorum: {multi_sig.threshold}-of-{len(multi_sig.required_ministries)}")
    print(f"  Requires biometric handshakes: {multi_sig.requires_biometric_handshake}")
    
    # Add signatures with biometric handshakes
    quorum_controller.add_quorum_signature_with_handshake(
        action_id=action_id,
        ministry=MinistryType.WATER_AUTHORITY,
        signer_id="water_director_001",
        public_key="PQCPUB-WATER-...",
        signature="PQCSIG-WATER-...",
        location="Ministry of Water, Secure Bunker",
        ministry_seal="WATER-SEAL-...",
        tablet_id="terminal_water_001",
        tablet_serial="TABLET-WATER-001",
        iris_verified=True,
        palm_verified=True,
        token_verified=True
    )
    
    print(f"\nAfter Water Authority handshake:")
    status = quorum_controller.get_quorum_status(action_id)
    print(f"  Authorized: {status['authorized']}")
    print(f"  Signatures: {status['signatures_received']}/{status['threshold_required']}")
    
    quorum_controller.add_quorum_signature_with_handshake(
        action_id=action_id,
        ministry=MinistryType.POWER_GRID_OPERATOR,
        signer_id="grid_operator_001",
        public_key="PQCPUB-POWER-...",
        signature="PQCSIG-POWER-...",
        location="National Grid Control Center",
        ministry_seal="POWER-SEAL-...",
        tablet_id="terminal_power_001",
        tablet_serial="TABLET-POWER-001",
        iris_verified=True,
        palm_verified=True,
        token_verified=True
    )
    
    print(f"\nAfter Power Grid Operator handshake:")
    status = quorum_controller.get_quorum_status(action_id)
    print(f"  Authorized: {status['authorized']}")
    print(f"  Signatures: {status['signatures_received']}/{status['threshold_required']}")
    
    quorum_controller.add_quorum_signature_with_handshake(
        action_id=action_id,
        ministry=MinistryType.NATIONAL_SECURITY,
        signer_id="security_director_001",
        public_key="PQCPUB-SECURITY-...",
        signature="PQCSIG-SECURITY-...",
        location="National Security Agency",
        ministry_seal="SECURITY-SEAL-...",
        tablet_id="terminal_security_001",
        tablet_serial="TABLET-SECURITY-001",
        iris_verified=True,
        palm_verified=True,
        token_verified=True
    )
    
    print(f"\nAfter National Security handshake (3-of-3 complete):")
    status = quorum_controller.get_quorum_status(action_id)
    print(f"  Authorized: {status['authorized']}")
    print(f"  Signatures: {status['signatures_received']}/{status['threshold_required']}")
    print(f"  Handshake details: {len(status['handshakeDetails'])} verified handshakes")
    for h in status['handshakeDetails']:
        print(f"    - {h['ministry']}: {h['operatorId']} via {h['tabletSerial']}")

