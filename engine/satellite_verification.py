"""
Space-Integrated Resilience: Earth Observation Cross-Verification
2026 End-State Feature: Satellite Shadowing

Terrestrial sensors can be physically destroyed or jammed. Munin integrates with
2026 commercial satellite constellations (like Starlink or Earth-imaging clusters)
to provide space-based truth verification.

The Feature: Earth Observation (EO) Cross-Verification
The Action: Integrate Munin with satellite constellations
The Narrative: "The ground sensor says the reservoir is full, but Munin's satellite-derived
InSAR (Interferometric Synthetic Aperture Radar) data shows no ground deformation.
We've detected a sensor-hack via space-based truth."
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict


class SatelliteConstellation(Enum):
    """Satellite constellations for Earth Observation."""
    STARLINK = "starlink"  # SpaceX Starlink
    PLANET_LABS = "planet_labs"  # Planet Labs SkySat/Dove
    MAXAR = "maxar"  # Maxar WorldView
    CAPELLA = "capella"  # Capella Space SAR
    ICEYE = "iceye"  # ICEYE SAR


class ObservationType(Enum):
    """Types of Earth Observation data."""
    OPTICAL = "optical"  # Visible/infrared imagery
    SAR = "sar"  # Synthetic Aperture Radar
    INSAR = "insar"  # Interferometric SAR (ground deformation)
    MULTISPECTRAL = "multispectral"  # Multispectral imagery
    THERMAL = "thermal"  # Thermal infrared
    HYPERSPECTRAL = "hyperspectral"  # Hyperspectral imagery


@dataclass
class SatelliteObservation:
    """Satellite observation data point."""
    observation_id: str
    constellation: SatelliteConstellation
    observation_type: ObservationType
    timestamp: str
    location: Dict[str, float]  # lat, lon
    data: Dict  # Observation-specific data
    resolution_meters: float
    confidence: float
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        data = asdict(self)
        data['constellation'] = self.constellation.value
        data['observation_type'] = self.observation_type.value
        return data


@dataclass
class CrossVerificationResult:
    """Result of cross-verifying ground sensor with satellite data."""
    sensor_id: str
    sensor_reading: float
    satellite_observation: SatelliteObservation
    discrepancy: float
    verification_status: str  # "verified", "mismatch", "inconclusive"
    confidence: float
    reasoning: str
    timestamp: str
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return asdict(self)


class SatelliteVerificationEngine:
    """
    Earth Observation cross-verification engine.
    Verifies ground sensor data against satellite observations to detect sensor hacks.
    """
    
    def __init__(self):
        self.observations: List[SatelliteObservation] = []
        self.verification_results: List[CrossVerificationResult] = []
        self.constellation_status: Dict[SatelliteConstellation, bool] = {
            const: True for const in SatelliteConstellation
        }
    
    def ingest_satellite_observation(self, observation: SatelliteObservation) -> None:
        """Ingest a satellite observation."""
        self.observations.append(observation)
        
        # Keep only last 10000 observations
        if len(self.observations) > 10000:
            self.observations = self.observations[-10000:]
    
    def cross_verify_sensor(
        self,
        sensor_id: str,
        sensor_reading: float,
        sensor_location: Dict[str, float],
        sensor_type: str,  # e.g., "water_level", "ground_deformation"
        timestamp: str
    ) -> CrossVerificationResult:
        """
        Cross-verify a ground sensor reading against satellite observations.
        """
        # Find relevant satellite observations
        relevant_observations = self._find_relevant_observations(
            sensor_location,
            sensor_type,
            timestamp
        )
        
        if not relevant_observations:
            return CrossVerificationResult(
                sensor_id=sensor_id,
                sensor_reading=sensor_reading,
                satellite_observation=None,  # No observation available
                discrepancy=0.0,
                verification_status="inconclusive",
                confidence=0.0,
                reasoning="No satellite observations available for cross-verification",
                timestamp=timestamp
            )
        
        # Use most recent observation
        latest_observation = max(relevant_observations, key=lambda o: o.timestamp)
        
        # Perform cross-verification based on sensor type
        if sensor_type == "water_level":
            result = self._verify_water_level(sensor_reading, latest_observation, sensor_location)
        elif sensor_type == "ground_deformation":
            result = self._verify_ground_deformation(sensor_reading, latest_observation, sensor_location)
        elif sensor_type == "temperature":
            result = self._verify_temperature(sensor_reading, latest_observation, sensor_location)
        else:
            result = self._verify_generic(sensor_reading, latest_observation, sensor_location)
        
        verification = CrossVerificationResult(
            sensor_id=sensor_id,
            sensor_reading=sensor_reading,
            satellite_observation=latest_observation,
            discrepancy=result['discrepancy'],
            verification_status=result['status'],
            confidence=result['confidence'],
            reasoning=result['reasoning'],
            timestamp=timestamp
        )
        
        self.verification_results.append(verification)
        return verification
    
    def _find_relevant_observations(
        self,
        location: Dict[str, float],
        sensor_type: str,
        timestamp: str
    ) -> List[SatelliteObservation]:
        """Find relevant satellite observations for a location and time."""
        target_time = datetime.fromisoformat(timestamp)
        time_window = timedelta(hours=24)  # 24-hour window
        
        relevant = []
        
        for obs in self.observations:
            # Check time window
            obs_time = datetime.fromisoformat(obs.timestamp)
            if abs((obs_time - target_time).total_seconds()) > time_window.total_seconds():
                continue
            
            # Check location proximity (within 1km)
            distance = self._calculate_distance(
                location['lat'], location['lon'],
                obs.location['lat'], obs.location['lon']
            )
            if distance > 1.0:  # 1km threshold
                continue
            
            # Check observation type relevance
            if sensor_type == "water_level" and obs.observation_type in [
                ObservationType.OPTICAL, ObservationType.SAR, ObservationType.MULTISPECTRAL
            ]:
                relevant.append(obs)
            elif sensor_type == "ground_deformation" and obs.observation_type == ObservationType.INSAR:
                relevant.append(obs)
            elif sensor_type == "temperature" and obs.observation_type == ObservationType.THERMAL:
                relevant.append(obs)
            else:
                relevant.append(obs)  # Generic match
        
        return relevant
    
    def _verify_water_level(
        self,
        sensor_reading: float,
        observation: SatelliteObservation,
        location: Dict[str, float]
    ) -> Dict:
        """Verify water level sensor against satellite observation."""
        # In production, this would:
        # 1. Extract water body area from satellite image
        # 2. Calculate water level from SAR/optical data
        # 3. Compare with sensor reading
        
        # Simulate: extract water level from observation data
        satellite_water_level = observation.data.get('water_level', None)
        
        if satellite_water_level is None:
            return {
                'status': 'inconclusive',
                'discrepancy': 0.0,
                'confidence': 0.0,
                'reasoning': 'Satellite observation does not contain water level data'
            }
        
        discrepancy = abs(sensor_reading - satellite_water_level)
        threshold = 0.1 * sensor_reading  # 10% threshold
        
        if discrepancy <= threshold:
            return {
                'status': 'verified',
                'discrepancy': discrepancy,
                'confidence': 0.9,
                'reasoning': f'Sensor reading ({sensor_reading:.2f}) matches satellite observation ({satellite_water_level:.2f})'
            }
        else:
            return {
                'status': 'mismatch',
                'discrepancy': discrepancy,
                'confidence': 0.85,
                'reasoning': f'DISCREPANCY: Sensor reading ({sensor_reading:.2f}) differs from satellite ({satellite_water_level:.2f}) by {discrepancy:.2f}. Possible sensor hack.'
            }
    
    def _verify_ground_deformation(
        self,
        sensor_reading: float,
        observation: SatelliteObservation,
        location: Dict[str, float]
    ) -> Dict:
        """Verify ground deformation sensor against InSAR data."""
        # InSAR provides ground deformation measurements
        if observation.observation_type != ObservationType.INSAR:
            return {
                'status': 'inconclusive',
                'discrepancy': 0.0,
                'confidence': 0.0,
                'reasoning': 'Observation is not InSAR data'
            }
        
        insar_deformation = observation.data.get('deformation_mm', None)
        
        if insar_deformation is None:
            return {
                'status': 'inconclusive',
                'discrepancy': 0.0,
                'confidence': 0.0,
                'reasoning': 'InSAR observation does not contain deformation data'
            }
        
        discrepancy = abs(sensor_reading - insar_deformation)
        threshold = 5.0  # 5mm threshold for deformation
        
        if discrepancy <= threshold:
            return {
                'status': 'verified',
                'discrepancy': discrepancy,
                'confidence': 0.95,  # InSAR is highly accurate
                'reasoning': f'Ground deformation sensor ({sensor_reading:.2f}mm) matches InSAR ({insar_deformation:.2f}mm)'
            }
        else:
            return {
                'status': 'mismatch',
                'discrepancy': discrepancy,
                'confidence': 0.90,
                'reasoning': f'DISCREPANCY: Sensor ({sensor_reading:.2f}mm) differs from InSAR ({insar_deformation:.2f}mm) by {discrepancy:.2f}mm. Possible sensor tampering.'
            }
    
    def _verify_temperature(
        self,
        sensor_reading: float,
        observation: SatelliteObservation,
        location: Dict[str, float]
    ) -> Dict:
        """Verify temperature sensor against thermal satellite data."""
        if observation.observation_type != ObservationType.THERMAL:
            return {
                'status': 'inconclusive',
                'discrepancy': 0.0,
                'confidence': 0.0,
                'reasoning': 'Observation is not thermal data'
            }
        
        satellite_temp = observation.data.get('temperature_c', None)
        
        if satellite_temp is None:
            return {
                'status': 'inconclusive',
                'discrepancy': 0.0,
                'confidence': 0.0,
                'reasoning': 'Thermal observation does not contain temperature data'
            }
        
        discrepancy = abs(sensor_reading - satellite_temp)
        threshold = 5.0  # 5°C threshold
        
        if discrepancy <= threshold:
            return {
                'status': 'verified',
                'discrepancy': discrepancy,
                'confidence': 0.8,
                'reasoning': f'Temperature sensor ({sensor_reading:.1f}°C) matches satellite ({satellite_temp:.1f}°C)'
            }
        else:
            return {
                'status': 'mismatch',
                'discrepancy': discrepancy,
                'confidence': 0.75,
                'reasoning': f'DISCREPANCY: Sensor ({sensor_reading:.1f}°C) differs from satellite ({satellite_temp:.1f}°C) by {discrepancy:.1f}°C'
            }
    
    def _verify_generic(
        self,
        sensor_reading: float,
        observation: SatelliteObservation,
        location: Dict[str, float]
    ) -> Dict:
        """Generic verification for unknown sensor types."""
        return {
            'status': 'inconclusive',
            'discrepancy': 0.0,
            'confidence': 0.0,
            'reasoning': 'Generic verification not implemented for this sensor type'
        }
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in kilometers (Haversine formula)."""
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371.0  # Earth radius in km
        
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        
        a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def detect_sensor_hack_via_satellite(
        self,
        sensor_id: str,
        sensor_reading: float,
        sensor_location: Dict[str, float],
        sensor_type: str
    ) -> Dict:
        """
        Detect sensor hack by comparing with satellite truth.
        This is the "space-based truth" capability.
        """
        verification = self.cross_verify_sensor(
            sensor_id=sensor_id,
            sensor_reading=sensor_reading,
            sensor_location=sensor_location,
            sensor_type=sensor_type,
            timestamp=datetime.now().isoformat()
        )
        
        hack_detected = verification.verification_status == "mismatch" and verification.confidence > 0.8
        
        return {
            'hack_detected': hack_detected,
            'verification': verification.to_dict(),
            'narrative': (
                f"The ground sensor says {sensor_type} is {sensor_reading:.2f}, "
                f"but Munin's satellite-derived {verification.satellite_observation.observation_type.value} data "
                f"shows {verification.satellite_observation.data.get('value', 'N/A')}. "
                f"We've detected a sensor-hack via space-based truth."
            ) if verification.satellite_observation else "No satellite data available"
        }
    
    def get_verification_summary(self) -> Dict:
        """Get summary of cross-verification results."""
        total = len(self.verification_results)
        if total == 0:
            return {'total': 0}
        
        verified = sum(1 for r in self.verification_results if r.verification_status == "verified")
        mismatches = sum(1 for r in self.verification_results if r.verification_status == "mismatch")
        inconclusive = sum(1 for r in self.verification_results if r.verification_status == "inconclusive")
        
        return {
            'total_verifications': total,
            'verified': verified,
            'mismatches': mismatches,
            'inconclusive': inconclusive,
            'verification_rate': verified / total if total > 0 else 0.0,
            'mismatch_rate': mismatches / total if total > 0 else 0.0,
            'average_confidence': sum(r.confidence for r in self.verification_results) / total if total > 0 else 0.0
        }


if __name__ == "__main__":
    print("="*70)
    print("Space-Integrated Resilience: Earth Observation Cross-Verification")
    print("="*70)
    print("\nThe 2026 Capability: Satellite Shadowing")
    print("  - Terrestrial sensors can be destroyed or jammed")
    print("  - Satellite constellations provide space-based truth")
    print("  - Cross-verification detects sensor hacks")
    print("\n" + "="*70)
    
    # Create verification engine
    engine = SatelliteVerificationEngine()
    
    # Simulate satellite observation (InSAR for ground deformation)
    insar_observation = SatelliteObservation(
        observation_id="insar_001",
        constellation=SatelliteConstellation.CAPELLA,
        observation_type=ObservationType.INSAR,
        timestamp=datetime.now().isoformat(),
        location={"lat": 40.7128, "lon": -74.0060},
        data={"deformation_mm": 2.5, "value": 2.5},
        resolution_meters=3.0,
        confidence=0.95
    )
    engine.ingest_satellite_observation(insar_observation)
    
    # Cross-verify ground sensor
    print("\nCross-Verifying Ground Sensor:")
    print("  Sensor: ground_deformation_sensor_01")
    print("  Location: 40.7128°N, 74.0060°W")
    print("  Reading: 2.3mm deformation")
    
    verification = engine.cross_verify_sensor(
        sensor_id="ground_deformation_sensor_01",
        sensor_reading=2.3,
        sensor_location={"lat": 40.7128, "lon": -74.0060},
        sensor_type="ground_deformation",
        timestamp=datetime.now().isoformat()
    )
    
    print(f"\nVerification Result:")
    print(f"  Status: {verification.verification_status}")
    print(f"  Confidence: {verification.confidence:.1%}")
    print(f"  Discrepancy: {verification.discrepancy:.2f}mm")
    print(f"  Reasoning: {verification.reasoning}")
    
    # Test sensor hack detection
    print("\n" + "="*70)
    print("Testing Sensor Hack Detection")
    print("="*70)
    
    # Fake sensor reading (hacked sensor reporting false data)
    hack_result = engine.detect_sensor_hack_via_satellite(
        sensor_id="ground_deformation_sensor_01",
        sensor_reading=15.0,  # Fake: sensor says 15mm, satellite says 2.5mm
        sensor_location={"lat": 40.7128, "lon": -74.0060},
        sensor_type="ground_deformation"
    )
    
    print(f"\nHack Detection Result:")
    print(f"  Hack Detected: {hack_result['hack_detected']}")
    print(f"  Narrative: {hack_result['narrative']}")
    
    # Summary
    print("\n" + "="*70)
    print("Verification Summary")
    print("="*70)
    summary = engine.get_verification_summary()
    print(json.dumps(summary, indent=2))
    
    print("\n" + "="*70)
    print("The Narrative: Space-based truth detects sensor hacks")
    print("="*70)

