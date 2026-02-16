"""
Multi-Modal Physical Verification

Supports multiple signal modalities per asset (acoustic, RF, vibration, thermal).
"""
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import numpy as np


class SignalModality(Enum):
    """Types of physical signal modalities."""
    ACOUSTIC = "acoustic"
    RF = "rf"
    VIBRATION = "vibration"
    THERMAL = "thermal"
    MAGNETIC = "magnetic"
    OPTICAL = "optical"


@dataclass
class MultiModalFingerprint:
    """Fingerprint combining multiple signal modalities."""
    sensor_id: str
    asset_type: str
    modalities: Dict[SignalModality, Dict]  # Modality -> fingerprint data
    created_at: str
    last_updated: str
    enrollment_metadata: Dict


class MultiModalPhysicalVerification:
    """Multi-modal physical verification engine."""
    
    def __init__(self):
        self.fingerprints: Dict[str, MultiModalFingerprint] = {}
        self.re_enrollment_schedule_days: int = 90  # Re-enroll every 90 days
    
    def enroll_fingerprint(
        self,
        sensor_id: str,
        asset_type: str,
        modality_data: Dict[SignalModality, Dict],
        metadata: Optional[Dict] = None
    ) -> MultiModalFingerprint:
        """Enroll baseline fingerprint with multiple modalities."""
        fingerprint = MultiModalFingerprint(
            sensor_id=sensor_id,
            asset_type=asset_type,
            modalities=modality_data,
            created_at=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            enrollment_metadata=metadata or {}
        )
        
        self.fingerprints[sensor_id] = fingerprint
        return fingerprint
    
    def verify_multi_modal(
        self,
        sensor_id: str,
        current_signals: Dict[SignalModality, Dict],
        tolerance: float = 0.1
    ) -> Dict:
        """Verify current signals against multi-modal fingerprint."""
        fingerprint = self.fingerprints.get(sensor_id)
        if not fingerprint:
            return {
                'verified': False,
                'reason': f'No fingerprint for sensor {sensor_id}',
                'confidence': 0.0
            }
        
        modality_results = {}
        overall_confidence = 0.0
        
        for modality, expected_data in fingerprint.modalities.items():
            if modality not in current_signals:
                modality_results[modality.value] = {
                    'verified': False,
                    'reason': f'Missing {modality.value} signal',
                    'confidence': 0.0
                }
                continue
            
            current_data = current_signals[modality]
            result = self._verify_modality(modality, expected_data, current_data, tolerance)
            modality_results[modality.value] = result
            overall_confidence += result.get('confidence', 0.0)
        
        # Average confidence across modalities
        num_modalities = len(fingerprint.modalities)
        overall_confidence = overall_confidence / num_modalities if num_modalities > 0 else 0.0
        
        verified = overall_confidence > (1.0 - tolerance)
        
        return {
            'verified': verified,
            'confidence': overall_confidence,
            'modality_results': modality_results,
            'fingerprint_age_days': self._get_fingerprint_age_days(fingerprint),
            're_enrollment_needed': self._check_re_enrollment_needed(fingerprint)
        }
    
    def _verify_modality(
        self,
        modality: SignalModality,
        expected: Dict,
        current: Dict,
        tolerance: float
    ) -> Dict:
        """Verify a single modality."""
        if modality == SignalModality.ACOUSTIC:
            return self._verify_acoustic(expected, current, tolerance)
        elif modality == SignalModality.VIBRATION:
            return self._verify_vibration(expected, current, tolerance)
        elif modality == SignalModality.RF:
            return self._verify_rf(expected, current, tolerance)
        elif modality == SignalModality.THERMAL:
            return self._verify_thermal(expected, current, tolerance)
        else:
            return {'verified': False, 'reason': f'Unsupported modality {modality}', 'confidence': 0.0}
    
    def _verify_acoustic(self, expected: Dict, current: Dict, tolerance: float) -> Dict:
        """Verify acoustic signals."""
        expected_freq = expected.get('frequency_hz', 0)
        current_freq = current.get('frequency_hz', 0)
        freq_diff = abs(expected_freq - current_freq) / max(expected_freq, 1e-10)
        
        expected_amp = expected.get('amplitude', 0)
        current_amp = current.get('amplitude', 0)
        amp_diff = abs(expected_amp - current_amp) / max(expected_amp, 1e-10)
        
        confidence = 1.0 - min(1.0, (freq_diff + amp_diff) / 2.0)
        verified = confidence > (1.0 - tolerance)
        
        return {
            'verified': verified,
            'confidence': confidence,
            'frequency_match': freq_diff < tolerance,
            'amplitude_match': amp_diff < tolerance
        }
    
    def _verify_vibration(self, expected: Dict, current: Dict, tolerance: float) -> Dict:
        """Verify vibration signals."""
        # Similar to acoustic but with different parameters
        return self._verify_acoustic(expected, current, tolerance)
    
    def _verify_rf(self, expected: Dict, current: Dict, tolerance: float) -> Dict:
        """Verify RF signals."""
        expected_power = expected.get('power_dbm', 0)
        current_power = current.get('power_dbm', 0)
        power_diff = abs(expected_power - current_power) / max(abs(expected_power), 1.0)
        
        confidence = 1.0 - min(1.0, power_diff)
        verified = confidence > (1.0 - tolerance)
        
        return {
            'verified': verified,
            'confidence': confidence,
            'power_match': power_diff < tolerance
        }
    
    def _verify_thermal(self, expected: Dict, current: Dict, tolerance: float) -> Dict:
        """Verify thermal signals."""
        expected_temp = expected.get('temperature_c', 0)
        current_temp = current.get('temperature_c', 0)
        temp_diff = abs(expected_temp - current_temp) / max(abs(expected_temp), 1.0)
        
        confidence = 1.0 - min(1.0, temp_diff)
        verified = confidence > (1.0 - tolerance)
        
        return {
            'verified': verified,
            'confidence': confidence,
            'temperature_match': temp_diff < tolerance
        }
    
    def _get_fingerprint_age_days(self, fingerprint: MultiModalFingerprint) -> float:
        """Get age of fingerprint in days."""
        created = datetime.fromisoformat(fingerprint.created_at)
        now = datetime.now()
        return (now - created).total_seconds() / (24 * 3600)
    
    def _check_re_enrollment_needed(self, fingerprint: MultiModalFingerprint) -> bool:
        """Check if re-enrollment is needed based on age."""
        age_days = self._get_fingerprint_age_days(fingerprint)
        return age_days > self.re_enrollment_schedule_days
    
    def schedule_re_enrollment(self, sensor_id: str) -> bool:
        """Schedule re-enrollment for a sensor."""
        fingerprint = self.fingerprints.get(sensor_id)
        if not fingerprint:
            return False
        
        if self._check_re_enrollment_needed(fingerprint):
            # Mark for re-enrollment
            fingerprint.enrollment_metadata['re_enrollment_scheduled'] = True
            fingerprint.enrollment_metadata['re_enrollment_reason'] = 'Scheduled maintenance'
            return True
        
        return False
