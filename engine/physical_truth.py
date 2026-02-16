"""
Unified Physical Truth Module
Integrates physics_ingest.py and physical_verification.py with shared fingerprints.

Provides a single interface for verifying digital SCADA readings against physical reality.
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict
import json

from physics_ingest import (
    PhysicsIngestEngine,
    SignalType,
    PhysicalSignal as PhysicsIngestSignal,
    SignalFingerprint,
    SignalVerification
)
from physical_verification import (
    PhysicalVerificationEngine,
    PhysicalSignalType,
    PhysicalSignal as PhysicalVerifSignal,
    DigitalReading,
    PhysicalVerification,
    VerificationResult
)


@dataclass
class UnifiedFingerprint:
    """Unified fingerprint combining physics ingest and physical verification data."""
    sensor_id: str
    asset_type: str  # 'pump', 'turbine', 'substation', etc.
    
    # Physics ingest fingerprint
    physics_ingest_fingerprint: Optional[SignalFingerprint] = None
    
    # Physical verification fingerprint
    expected_frequency_hz: Optional[float] = None
    expected_amplitude_range: Optional[Tuple[float, float]] = None
    expected_harmonics: Optional[List[float]] = None
    
    # Metadata
    created_at: str = None
    last_updated: str = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
        if self.last_updated is None:
            self.last_updated = datetime.now().isoformat()


class UnifiedPhysicalTruthEngine:
    """
    Unified engine combining physics ingest and physical verification.
    
    Provides single interface for:
    - Registering sensor fingerprints
    - Verifying digital vs physical signals
    - Detecting hardware hacks and sensor tampering
    """
    
    def __init__(self):
        self.physics_ingest = PhysicsIngestEngine()
        self.physical_verif = PhysicalVerificationEngine()
        self.unified_fingerprints: Dict[str, UnifiedFingerprint] = {}
    
    def register_unified_fingerprint(
        self,
        sensor_id: str,
        asset_type: str,
        physics_ingest_fingerprint: Optional[SignalFingerprint] = None,
        expected_frequency_hz: Optional[float] = None,
        expected_amplitude_range: Optional[Tuple[float, float]] = None,
        expected_harmonics: Optional[List[float]] = None
    ) -> UnifiedFingerprint:
        """Register a unified fingerprint for a sensor."""
        fingerprint = UnifiedFingerprint(
            sensor_id=sensor_id,
            asset_type=asset_type,
            physics_ingest_fingerprint=physics_ingest_fingerprint,
            expected_frequency_hz=expected_frequency_hz,
            expected_amplitude_range=expected_amplitude_range,
            expected_harmonics=expected_harmonics
        )
        
        self.unified_fingerprints[sensor_id] = fingerprint
        
        # Also register with sub-engines if data provided
        if physics_ingest_fingerprint:
            self.physics_ingest.signal_fingerprints[sensor_id] = physics_ingest_fingerprint
        
        return fingerprint
    
    def verify_digital_vs_physical(
        self,
        sensor_id: str,
        digital_reading: Dict,
        physical_signal_data: Dict
    ) -> Dict:
        """
        Verify digital reading against physical signal using unified fingerprints.
        
        Args:
            sensor_id: Sensor identifier
            digital_reading: {'parameter': str, 'value': float, 'unit': str, 'timestamp': str}
            physical_signal_data: {'signal_type': str, 'frequency_hz': float, 'amplitude': float, ...}
        
        Returns:
            Unified verification result
        """
        fingerprint = self.unified_fingerprints.get(sensor_id)
        if not fingerprint:
            return {
                'verified': False,
                'reason': f'No fingerprint registered for sensor {sensor_id}',
                'confidence': 0.0
            }
        
        # Use physics ingest verification
        physics_ingest_result = None
        if fingerprint.physics_ingest_fingerprint:
            try:
                import numpy as np
                # Convert physical signal data to numpy array for physics ingest
                # (simplified - would use actual signal data in production)
                signal_array = np.array([physical_signal_data.get('amplitude', 0.0)])
                
                physics_ingest_result = self.physics_ingest.verify_signal_against_fingerprint(
                    sensor_id=sensor_id,
                    digital_signal_value=digital_reading.get('value', 0.0),
                    physical_signal_data=signal_array
                )
            except Exception as e:
                pass  # Fallback to physical verification
        
        # Use physical verification
        physical_verif_result = None
        try:
            digital_reading_obj = DigitalReading(
                timestamp=digital_reading.get('timestamp', datetime.now().isoformat()),
                parameter=digital_reading.get('parameter', 'unknown'),
                value=digital_reading.get('value', 0.0),
                unit=digital_reading.get('unit', ''),
                source=digital_reading.get('source', 'scada'),
                sensor_id=sensor_id
            )
            
            physical_signal_obj = PhysicalVerifSignal(
                signal_type=PhysicalSignalType[physical_signal_data.get('signal_type', 'ACOUSTIC').upper()],
                timestamp=physical_signal_data.get('timestamp', datetime.now().isoformat()),
                frequency_hz=physical_signal_data.get('frequency_hz', 0.0),
                amplitude=physical_signal_data.get('amplitude', 0.0),
                harmonics=physical_signal_data.get('harmonics', []),
                noise_level=physical_signal_data.get('noise_level', 0.0),
                sensor_id=sensor_id,
                location=physical_signal_data.get('location', '')
            )
            
            physical_verif_result = self.physical_verif.verify_physical_signal(
                asset_id=sensor_id,
                digital_reading=digital_reading_obj,
                physical_signal=physical_signal_obj
            )
        except Exception as e:
            pass  # Fallback to physics ingest result
        
        # Combine results
        if physics_ingest_result and physical_verif_result:
            # Both available - use higher confidence
            if physics_ingest_result.confidence >= physical_verif_result.confidence:
                primary_result = physics_ingest_result
            else:
                primary_result = physical_verif_result
            
            return {
                'verified': primary_result.signals_match if hasattr(primary_result, 'signals_match') else \
                           (physical_verif_result.verification_result == VerificationResult.VERIFIED),
                'confidence': max(physics_ingest_result.confidence, physical_verif_result.confidence),
                'discrepancy_type': primary_result.discrepancy_type if hasattr(primary_result, 'discrepancy_type') else \
                                  (physical_verif_result.verification_result.value if physical_verif_result.verification_result != VerificationResult.VERIFIED else None),
                'reasoning': physical_verif_result.reasoning,
                'verification_time_ms': primary_result.verification_time_ms if hasattr(primary_result, 'verification_time_ms') else 0.0
            }
        elif physics_ingest_result:
            return {
                'verified': physics_ingest_result.signals_match,
                'confidence': physics_ingest_result.confidence,
                'discrepancy_type': physics_ingest_result.discrepancy_type,
                'reasoning': f'Physics ingest verification: {physics_ingest_result.discrepancy_type or "verified"}',
                'verification_time_ms': physics_ingest_result.verification_time_ms
            }
        elif physical_verif_result:
            return {
                'verified': physical_verif_result.verification_result == VerificationResult.VERIFIED,
                'confidence': physical_verif_result.confidence,
                'discrepancy_type': physical_verif_result.verification_result.value if physical_verif_result.verification_result != VerificationResult.VERIFIED else None,
                'reasoning': physical_verif_result.reasoning,
                'verification_time_ms': 0.0
            }
        else:
            return {
                'verified': False,
                'reason': 'Verification failed - no results from either engine',
                'confidence': 0.0
            }
    
    def detect_hardware_hack(
        self,
        sensor_id: str,
        digital_reading: Dict,
        physical_signal_data: Dict
    ) -> Tuple[bool, float, Optional[str]]:
        """
        Detect hardware hack by comparing digital vs physical signals.
        
        Returns:
            (is_hack, confidence, hack_type)
        """
        verification = self.verify_digital_vs_physical(sensor_id, digital_reading, physical_signal_data)
        
        is_hack = not verification.get('verified', False) and \
                 verification.get('discrepancy_type') in ['hardware_hack', 'tampering_detected']
        
        confidence = verification.get('confidence', 0.0)
        hack_type = verification.get('discrepancy_type') if is_hack else None
        
        return (is_hack, confidence, hack_type)
    
    def get_fingerprint(self, sensor_id: str) -> Optional[UnifiedFingerprint]:
        """Get unified fingerprint for a sensor."""
        return self.unified_fingerprints.get(sensor_id)
    
    def list_fingerprints(self) -> List[UnifiedFingerprint]:
        """List all registered fingerprints."""
        return list(self.unified_fingerprints.values())
    
    def save_fingerprints(self, output_path: str):
        """Save fingerprints to JSON file."""
        fingerprints_data = {
            'fingerprints': [
                {
                    'sensor_id': fp.sensor_id,
                    'asset_type': fp.asset_type,
                    'expected_frequency_hz': fp.expected_frequency_hz,
                    'expected_amplitude_range': fp.expected_amplitude_range,
                    'expected_harmonics': fp.expected_harmonics,
                    'created_at': fp.created_at,
                    'last_updated': fp.last_updated
                }
                for fp in self.unified_fingerprints.values()
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(fingerprints_data, f, indent=2)


# Global instance
_unified_engine: Optional[UnifiedPhysicalTruthEngine] = None

def get_unified_physical_truth_engine() -> UnifiedPhysicalTruthEngine:
    """Get global unified physical truth engine instance."""
    global _unified_engine
    if _unified_engine is None:
        _unified_engine = UnifiedPhysicalTruthEngine()
    return _unified_engine
