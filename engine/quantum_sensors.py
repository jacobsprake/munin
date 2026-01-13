"""
Quantum-Resistant Edge Sensors: Munin-Q Edge Sensors
2026 Reality Feature: Future-Proof Sovereignty

By 2026, standard encryption is vulnerable to the "Store Now, Decrypt Later" threat
from quantum computers.

The Product: Munin-Q Edge Sensors
- Retrofit sensors for water/power that use Post-Quantum Cryptography (PQC) at the hardware level
- Encrypt data using algorithms like Kyber or Dilithium before it ever leaves the pump or wire

The Signal: You are selling "Future-Proof Sovereignty."
You are the only one protecting the state's data from the quantum threats of the 2030s.
"""

import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import uuid


class PQCAlgorithm(Enum):
    """Post-Quantum Cryptography algorithms."""
    KYBER_768 = "KYBER-768"  # Key encapsulation (NIST FIPS 203)
    DILITHIUM_3 = "DILITHIUM-3"  # Digital signatures (NIST FIPS 204)
    FALCON_512 = "FALCON-512"  # Digital signatures (NIST FIPS 204 alternative)
    SPHINCS_PLUS = "SPHINCS-PLUS"  # Hash-based signatures


class SensorType(Enum):
    """Types of quantum-resistant sensors."""
    WATER_PRESSURE = "water_pressure"
    WATER_FLOW = "water_flow"
    POWER_VOLTAGE = "power_voltage"
    POWER_FREQUENCY = "power_frequency"
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"


class QuantumSensorStatus(Enum):
    """Status of a quantum sensor."""
    ACTIVE = "active"
    DEGRADED = "degraded"  # PQC still working but sensor degraded
    OFFLINE = "offline"
    PQC_FAILURE = "pqc_failure"  # PQC encryption failed


class MuninQSensor:
    """
    Represents a Munin-Q Edge Sensor with hardware-level PQC encryption.
    """
    
    def __init__(
        self,
        sensor_id: str,
        sensor_type: SensorType,
        location: Dict[str, Any],
        pqc_algorithm: PQCAlgorithm = PQCAlgorithm.KYBER_768,
        hardware_pqc: bool = True  # PQC at hardware level
    ):
        self.sensor_id = sensor_id
        self.sensor_type = sensor_type
        self.location = location
        self.pqc_algorithm = pqc_algorithm
        self.hardware_pqc = hardware_pqc
        self.status = QuantumSensorStatus.ACTIVE
        self.pqc_public_key: Optional[str] = None
        self.pqc_private_key: Optional[str] = None  # In production, stored in HSM
        self.last_reading: Optional[Dict] = None
        self.reading_count = 0
        self.pqc_failure_count = 0
        self.created_at = datetime.now()
        
        # Generate PQC key pair
        self._generate_pqc_keys()
    
    def _generate_pqc_keys(self) -> None:
        """
        Generate PQC key pair.
        In production, this would use actual PQC libraries (e.g., liboqs).
        """
        # Simulate PQC key generation
        key_material = f"{self.sensor_id}:{self.pqc_algorithm.value}:{datetime.now().isoformat()}"
        key_hash = hashlib.sha256(key_material.encode()).hexdigest()
        
        # In production, use actual PQC key generation
        # For demo, we'll create deterministic "keys"
        self.pqc_public_key = f"PQCPUB-{self.pqc_algorithm.value}-{key_hash[:32]}"
        self.pqc_private_key = f"PQCPRIV-{self.pqc_algorithm.value}-{key_hash[32:64]}"
    
    def encrypt_reading(self, reading_value: float, timestamp: datetime) -> Dict:
        """
        Encrypt a sensor reading using PQC before transmission.
        This happens at the hardware level - data never leaves unencrypted.
        """
        if self.status == QuantumSensorStatus.OFFLINE:
            raise ValueError("Sensor is offline")
        
        if self.status == QuantumSensorStatus.PQC_FAILURE:
            raise ValueError("PQC encryption failure - sensor requires maintenance")
        
        # Create reading data
        reading_data = {
            'sensorId': self.sensor_id,
            'sensorType': self.sensor_type.value,
            'value': reading_value,
            'timestamp': timestamp.isoformat(),
            'location': self.location
        }
        
        # Encrypt using PQC (in production, use actual PQC encryption)
        encrypted_data = self._pqc_encrypt(json.dumps(reading_data))
        
        if not encrypted_data:
            self.pqc_failure_count += 1
            if self.pqc_failure_count >= 3:
                self.status = QuantumSensorStatus.PQC_FAILURE
            raise ValueError("PQC encryption failed")
        
        # Reset failure count on success
        self.pqc_failure_count = 0
        
        encrypted_reading = {
            'id': str(uuid.uuid4()),
            'sensorId': self.sensor_id,
            'encryptedData': encrypted_data,
            'pqcAlgorithm': self.pqc_algorithm.value,
            'publicKey': self.pqc_public_key,
            'timestamp': timestamp.isoformat(),
            'hardwarePQC': self.hardware_pqc
        }
        
        self.last_reading = encrypted_reading
        self.reading_count += 1
        
        return encrypted_reading
    
    def _pqc_encrypt(self, plaintext: str) -> Optional[str]:
        """
        Encrypt data using PQC.
        In production, this would use actual PQC libraries.
        """
        try:
            # Simulate PQC encryption
            # In production: use liboqs or similar
            encryption_data = f"{plaintext}:{self.pqc_private_key}:{self.pqc_algorithm.value}"
            encrypted_hash = hashlib.sha256(encryption_data.encode()).hexdigest()
            
            # Format as encrypted data
            encrypted = f"PQC-ENC-{self.pqc_algorithm.value}-{encrypted_hash}"
            
            return encrypted
        except Exception:
            return None
    
    def decrypt_reading(self, encrypted_reading: Dict, private_key: str) -> Dict:
        """
        Decrypt a sensor reading (requires private key).
        In production, this would use actual PQC decryption.
        """
        if encrypted_reading.get('pqcAlgorithm') != self.pqc_algorithm.value:
            raise ValueError("PQC algorithm mismatch")
        
        if encrypted_reading.get('publicKey') != self.pqc_public_key:
            raise ValueError("Public key mismatch")
        
        # In production, use actual PQC decryption
        # For demo, we'll simulate decryption
        encrypted_data = encrypted_reading['encryptedData']
        
        # Verify format
        if not encrypted_data.startswith(f"PQC-ENC-{self.pqc_algorithm.value}-"):
            raise ValueError("Invalid encrypted data format")
        
        # In production, decrypt using PQC library
        # For demo, we'll extract the original data from metadata
        # (In real implementation, this would decrypt the actual ciphertext)
        
        # Return decrypted reading structure
        return {
            'sensorId': encrypted_reading['sensorId'],
            'value': 0.0,  # Would be decrypted from ciphertext
            'timestamp': encrypted_reading['timestamp'],
            'decrypted': True
        }
    
    def get_status(self) -> Dict:
        """Get sensor status."""
        return {
            'sensorId': self.sensor_id,
            'sensorType': self.sensor_type.value,
            'status': self.status.value,
            'pqcAlgorithm': self.pqc_algorithm.value,
            'hardwarePQC': self.hardware_pqc,
            'publicKey': self.pqc_public_key,
            'readingCount': self.reading_count,
            'pqcFailureCount': self.pqc_failure_count,
            'lastReading': self.last_reading['timestamp'] if self.last_reading else None,
            'createdAt': self.created_at.isoformat()
        }
    
    def to_dict(self) -> Dict:
        """Convert sensor to dictionary."""
        return {
            'sensorId': self.sensor_id,
            'sensorType': self.sensor_type.value,
            'location': self.location,
            'status': self.get_status(),
            'pqcPublicKey': self.pqc_public_key
        }


class QuantumSensorNetwork:
    """Manages a network of quantum-resistant sensors."""
    
    def __init__(self):
        self.sensors: Dict[str, MuninQSensor] = {}
        self.encrypted_readings: List[Dict] = []
        self.network_pqc_status = "quantum-resistant"
    
    def add_sensor(self, sensor: MuninQSensor) -> None:
        """Add a sensor to the network."""
        self.sensors[sensor.sensor_id] = sensor
    
    def remove_sensor(self, sensor_id: str) -> None:
        """Remove a sensor from the network."""
        if sensor_id in self.sensors:
            del self.sensors[sensor_id]
    
    def collect_reading(
        self,
        sensor_id: str,
        value: float,
        timestamp: Optional[datetime] = None
    ) -> Dict:
        """Collect an encrypted reading from a sensor."""
        if sensor_id not in self.sensors:
            raise ValueError(f"Sensor {sensor_id} not found")
        
        sensor = self.sensors[sensor_id]
        
        if timestamp is None:
            timestamp = datetime.now()
        
        encrypted_reading = sensor.encrypt_reading(value, timestamp)
        
        self.encrypted_readings.append(encrypted_reading)
        
        return encrypted_reading
    
    def get_network_status(self) -> Dict:
        """Get overall network status."""
        total_sensors = len(self.sensors)
        active_sensors = sum(
            1 for s in self.sensors.values()
            if s.status == QuantumSensorStatus.ACTIVE
        )
        
        return {
            'totalSensors': total_sensors,
            'activeSensors': active_sensors,
            'totalReadings': len(self.encrypted_readings),
            'pqcStatus': self.network_pqc_status,
            'pqcAlgorithms': list(set(
                s.pqc_algorithm.value for s in self.sensors.values()
            )),
            'timestamp': datetime.now().isoformat()
        }
    
    def to_dict(self) -> Dict:
        """Convert network to dictionary."""
        return {
            'sensors': [s.to_dict() for s in self.sensors.values()],
            'networkStatus': self.get_network_status(),
            'recentReadings': self.encrypted_readings[-100:]  # Last 100 readings
        }


def create_sensor_network_from_graph(
    graph_nodes: List[Dict],
    sensor_types: Optional[Dict[str, SensorType]] = None
) -> QuantumSensorNetwork:
    """
    Create a quantum sensor network from the infrastructure graph.
    Places Munin-Q sensors at each node.
    """
    network = QuantumSensorNetwork()
    
    for node in graph_nodes:
        # Determine sensor type from node kind
        node_kind = node.get('kind', '').lower()
        sensor_type = SensorType.WATER_PRESSURE  # Default
        
        if 'power' in node_kind or 'substation' in node_kind:
            sensor_type = SensorType.POWER_VOLTAGE
        elif 'water' in node_kind or 'pump' in node_kind:
            sensor_type = SensorType.WATER_PRESSURE
        elif 'temperature' in node_kind:
            sensor_type = SensorType.TEMPERATURE
        
        # Override if specified
        if sensor_types and node['id'] in sensor_types:
            sensor_type = sensor_types[node['id']]
        
        location = {
            'nodeId': node['id'],
            'label': node.get('label', ''),
            'lat': node.get('lat'),
            'lon': node.get('lon')
        }
        
        sensor = MuninQSensor(
            sensor_id=f"qsensor_{node['id']}",
            sensor_type=sensor_type,
            location=location,
            pqc_algorithm=PQCAlgorithm.KYBER_768,
            hardware_pqc=True
        )
        
        network.add_sensor(sensor)
    
    return network


if __name__ == "__main__":
    # Example usage
    network = QuantumSensorNetwork()
    
    # Create sensors
    sensor1 = MuninQSensor(
        sensor_id="qsensor_001",
        sensor_type=SensorType.WATER_PRESSURE,
        location={'nodeId': 'pump_01', 'lat': 40.7128, 'lon': -74.0060},
        pqc_algorithm=PQCAlgorithm.KYBER_768
    )
    
    sensor2 = MuninQSensor(
        sensor_id="qsensor_002",
        sensor_type=SensorType.POWER_VOLTAGE,
        location={'nodeId': 'substation_01', 'lat': 40.7130, 'lon': -74.0062},
        pqc_algorithm=PQCAlgorithm.DILITHIUM_3
    )
    
    network.add_sensor(sensor1)
    network.add_sensor(sensor2)
    
    # Collect encrypted readings
    reading1 = network.collect_reading("qsensor_001", 42.5)
    reading2 = network.collect_reading("qsensor_002", 120.0)
    
    print(f"Encrypted reading 1: {reading1['id']}")
    print(f"Encrypted reading 2: {reading2['id']}")
    print(f"\nNetwork status: {json.dumps(network.get_network_status(), indent=2)}")


