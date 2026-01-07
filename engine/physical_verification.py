"""
Return to Atoms: RF & Acoustic Verification
Physical Truth in a World of Digital Lies

Digital data can be faked (Deepfakes for SCADA). Physics cannot.

The Solution: Out-of-Band Physical Fingerprinting. Use Munin to listen to the Electrical Noise (RF) 
or Acoustics of a pump or substation.

The Narrative: "The digital signal says the pump is at 50% RPM, but Munin's acoustic sensor detects 
a 60Hz vibration, meaning the sensor has been hijacked. We verify the bits against the atoms."

Why they want it: This is the ultimate defense against "Stuxnet-style" attacks. You are providing 
Physical Truth in a world of digital lies.
"""

import json
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime


class PhysicalSignalType(Enum):
    """Types of physical signals that can be measured."""
    ACOUSTIC = "acoustic"  # Sound/vibration
    RF_EMISSION = "rf_emission"  # Radio frequency emissions
    MAGNETIC_FIELD = "magnetic_field"  # Magnetic field strength
    THERMAL = "thermal"  # Infrared/thermal signature
    VIBRATION = "vibration"  # Mechanical vibration


class VerificationResult(Enum):
    """Result of physical verification."""
    VERIFIED = "verified"  # Physical signal matches digital reading
    MISMATCH = "mismatch"  # Physical signal contradicts digital reading
    INCONCLUSIVE = "inconclusive"  # Cannot determine
    SENSOR_FAULT = "sensor_fault"  # Physical sensor appears faulty
    TAMPERING_DETECTED = "tampering_detected"  # Evidence of tampering


@dataclass
class PhysicalSignal:
    """Measurement of a physical signal."""
    signal_type: PhysicalSignalType
    timestamp: str
    frequency_hz: float  # Dominant frequency
    amplitude: float  # Signal amplitude
    harmonics: List[float]  # Harmonic frequencies
    noise_level: float  # Background noise
    sensor_id: str
    location: str


@dataclass
class DigitalReading:
    """Digital reading from SCADA/OT system."""
    timestamp: str
    parameter: str  # e.g., "rpm", "pressure", "flow_rate"
    value: float
    unit: str
    source: str  # e.g., "scada", "plc", "sensor"
    sensor_id: str


@dataclass
class PhysicalVerification:
    """Result of comparing physical signal to digital reading."""
    asset_id: str
    digital_reading: DigitalReading
    physical_signal: PhysicalSignal
    verification_result: VerificationResult
    confidence: float  # 0.0 to 1.0
    discrepancy: Optional[float]  # Difference between physical and digital
    reasoning: str
    timestamp: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()


class PhysicalVerificationEngine:
    """
    Physical Verification Engine: Return to Atoms
    
    Verifies digital SCADA readings against physical signals (RF, acoustic, vibration).
    This provides defense against Stuxnet-style attacks where digital sensors are compromised.
    """
    
    def __init__(self):
        # Expected frequency mappings for different asset types
        self.expected_frequencies: Dict[str, Dict[str, float]] = {
            "pump": {
                "rpm_to_hz": 1.0 / 60.0,  # RPM to Hz conversion
                "expected_harmonics": [1.0, 2.0, 3.0],  # Multiples of base frequency
            },
            "turbine": {
                "rpm_to_hz": 1.0 / 60.0,
                "expected_harmonics": [1.0, 2.0, 3.0, 4.0],
            },
            "generator": {
                "rpm_to_hz": 1.0 / 60.0,
                "expected_harmonics": [1.0, 2.0],  # 50Hz or 60Hz grid frequency
            },
            "compressor": {
                "rpm_to_hz": 1.0 / 60.0,
                "expected_harmonics": [1.0, 2.0, 3.0],
            },
        }
        
        self.verification_history: List[PhysicalVerification] = []
    
    def verify_digital_reading(
        self,
        asset_id: str,
        asset_type: str,
        digital_reading: DigitalReading,
        physical_signal: PhysicalSignal
    ) -> PhysicalVerification:
        """
        Verify a digital reading against a physical signal.
        
        Returns PhysicalVerification with result indicating if digital matches physical reality.
        """
        # Get expected frequency mapping for this asset type
        freq_map = self.expected_frequencies.get(asset_type, {})
        
        # Convert digital reading to expected frequency
        expected_freq = None
        if digital_reading.parameter == "rpm":
            rpm_to_hz = freq_map.get("rpm_to_hz", 1.0 / 60.0)
            expected_freq = digital_reading.value * rpm_to_hz
        elif digital_reading.parameter == "frequency":
            expected_freq = digital_reading.value
        
        # Compare physical signal frequency to expected frequency
        verification_result = VerificationResult.INCONCLUSIVE
        confidence = 0.0
        discrepancy = None
        reasoning_parts = []
        
        if expected_freq is not None:
            # Calculate frequency difference
            freq_diff = abs(physical_signal.frequency_hz - expected_freq)
            freq_tolerance = expected_freq * 0.05  # 5% tolerance
            
            if freq_diff <= freq_tolerance:
                # Frequencies match - digital reading is likely correct
                verification_result = VerificationResult.VERIFIED
                confidence = 1.0 - (freq_diff / expected_freq)
                reasoning_parts.append(f"Physical frequency ({physical_signal.frequency_hz:.2f} Hz) matches expected ({expected_freq:.2f} Hz)")
            else:
                # Frequencies don't match - digital reading may be compromised
                verification_result = VerificationResult.MISMATCH
                discrepancy = freq_diff
                confidence = 0.8  # High confidence in mismatch
                reasoning_parts.append(
                    f"DISCREPANCY: Physical frequency ({physical_signal.frequency_hz:.2f} Hz) does not match "
                    f"digital reading ({expected_freq:.2f} Hz). Difference: {freq_diff:.2f} Hz. "
                    f"Possible sensor tampering or SCADA compromise."
                )
        
        # Check for expected harmonics
        if physical_signal.harmonics:
            expected_harmonics = freq_map.get("expected_harmonics", [])
            if expected_harmonics:
                # Check if physical signal has expected harmonic structure
                base_freq = physical_signal.frequency_hz
                harmonic_match = True
                for harmonic_mult in expected_harmonics:
                    expected_harmonic = base_freq * harmonic_mult
                    # Check if this harmonic exists in the signal
                    found_harmonic = any(
                        abs(h - expected_harmonic) < expected_harmonic * 0.1
                        for h in physical_signal.harmonics
                    )
                    if not found_harmonic and harmonic_mult <= 2.0:  # First two harmonics are critical
                        harmonic_match = False
                        break
                
                if not harmonic_match:
                    if verification_result == VerificationResult.VERIFIED:
                        verification_result = VerificationResult.INCONCLUSIVE
                        confidence = 0.5
                    reasoning_parts.append("Harmonic structure does not match expected pattern")
        
        # Check noise level (high noise may indicate tampering or sensor fault)
        if physical_signal.noise_level > physical_signal.amplitude * 0.5:
            if verification_result == VerificationResult.VERIFIED:
                verification_result = VerificationResult.SENSOR_FAULT
                confidence = 0.6
            reasoning_parts.append("High noise-to-signal ratio detected - possible sensor fault")
        
        reasoning = "; ".join(reasoning_parts) if reasoning_parts else "No physical verification available"
        
        verification = PhysicalVerification(
            asset_id=asset_id,
            digital_reading=digital_reading,
            physical_signal=physical_signal,
            verification_result=verification_result,
            confidence=confidence,
            discrepancy=discrepancy,
            reasoning=reasoning
        )
        
        self.verification_history.append(verification)
        return verification
    
    def detect_tampering(self, asset_id: str, recent_verifications: List[PhysicalVerification]) -> Dict:
        """
        Detect patterns indicating tampering across multiple verifications.
        """
        if len(recent_verifications) < 3:
            return {
                'tampering_detected': False,
                'confidence': 0.0,
                'reasoning': 'Insufficient data for tampering detection'
            }
        
        # Count mismatches
        mismatch_count = sum(
            1 for v in recent_verifications
            if v.verification_result == VerificationResult.MISMATCH
        )
        
        mismatch_rate = mismatch_count / len(recent_verifications)
        
        # If >50% of recent verifications show mismatch, likely tampering
        if mismatch_rate > 0.5:
            return {
                'tampering_detected': True,
                'confidence': min(1.0, mismatch_rate),
                'reasoning': f'{mismatch_count}/{len(recent_verifications)} recent verifications show mismatch. '
                           f'High probability of sensor tampering or SCADA compromise.',
                'mismatch_rate': mismatch_rate,
                'affected_asset': asset_id
            }
        
        return {
            'tampering_detected': False,
            'confidence': 1.0 - mismatch_rate,
            'reasoning': 'No consistent pattern of tampering detected'
        }
    
    def get_verification_summary(self) -> Dict:
        """Get summary of physical verifications."""
        total = len(self.verification_history)
        if total == 0:
            return {'total': 0}
        
        verified = sum(1 for v in self.verification_history if v.verification_result == VerificationResult.VERIFIED)
        mismatches = sum(1 for v in self.verification_history if v.verification_result == VerificationResult.MISMATCH)
        tampering = sum(1 for v in self.verification_history if v.verification_result == VerificationResult.TAMPERING_DETECTED)
        
        return {
            'total_verifications': total,
            'verified': verified,
            'mismatches': mismatches,
            'tampering_detected': tampering,
            'verification_rate': verified / total if total > 0 else 0.0,
            'mismatch_rate': mismatches / total if total > 0 else 0.0,
            'tampering_rate': tampering / total if total > 0 else 0.0
        }


if __name__ == "__main__":
    # Example: Physical verification detecting sensor tampering
    engine = PhysicalVerificationEngine()
    
    # Simulate digital reading saying pump is at 50% RPM (1500 RPM = 25 Hz)
    digital_reading = DigitalReading(
        timestamp=datetime.now().isoformat(),
        parameter="rpm",
        value=1500.0,
        unit="rpm",
        source="scada",
        sensor_id="scada_pump_01"
    )
    
    # But physical acoustic sensor detects 60 Hz (3600 RPM) - sensor has been hijacked!
    physical_signal = PhysicalSignal(
        signal_type=PhysicalSignalType.ACOUSTIC,
        timestamp=datetime.now().isoformat(),
        frequency_hz=60.0,  # Actual physical frequency
        amplitude=0.8,
        harmonics=[60.0, 120.0, 180.0],
        noise_level=0.1,
        sensor_id="acoustic_sensor_01",
        location="pump_housing"
    )
    
    verification = engine.verify_digital_reading(
        asset_id="pump_alpha",
        asset_type="pump",
        digital_reading=digital_reading,
        physical_signal=physical_signal
    )
    
    print("="*60)
    print("Return to Atoms: Physical Verification")
    print("="*60)
    print(f"\nAsset: pump_alpha")
    print(f"Digital Reading: {digital_reading.value} {digital_reading.unit} ({digital_reading.value * 1/60:.2f} Hz expected)")
    print(f"Physical Signal: {physical_signal.frequency_hz} Hz (acoustic)")
    print(f"\nVerification Result: {verification.verification_result.value}")
    print(f"Confidence: {verification.confidence:.1%}")
    print(f"Discrepancy: {verification.discrepancy:.2f} Hz" if verification.discrepancy else "No discrepancy")
    print(f"\nReasoning: {verification.reasoning}")
    
    print("\n" + "="*60)
    print("Narrative:")
    print("="*60)
    print("The digital signal says the pump is at 50% RPM (1500 RPM = 25 Hz),")
    print("but Munin's acoustic sensor detects a 60 Hz vibration (3600 RPM),")
    print("meaning the sensor has been hijacked. We verify the bits against the atoms.")
    
    print("\n" + "="*60)
    print("Summary:")
    print("="*60)
    summary = engine.get_verification_summary()
    print(f"Total Verifications: {summary['total_verifications']}")
    print(f"Mismatches Detected: {summary['mismatches']}")
    print(f"Mismatch Rate: {summary['mismatch_rate']:.1%}")

