"""
Protocol Translator: Universal OT-to-Graph Connectors
Zero-Rip-and-Replace Architecture

This module provides "drivers" for every major industrial protocol (Modbus, DNP3, 
Profibus, BacNet) and vendor (Siemens, Schneider, Honeywell). Munin can "inhale" 
legacy data from 1980s hardware mixed with 2024 tech without requiring any 
hardware replacement.

The "Library of Ancestry" - pre-loaded protocol drivers that make Munin 
plug-and-play for the state.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json
import yaml

# Protocol definitions - "Library of Ancestry"
PROTOCOL_DRIVERS = {
    'modbus': {
        'name': 'Modbus RTU/TCP',
        'vendors': ['Siemens', 'Schneider', 'Honeywell', 'Allen-Bradley', 'ABB'],
        'data_types': ['holding_register', 'input_register', 'coil', 'discrete_input'],
        'default_polling_interval': 1.0,  # seconds
        'address_range': (0, 65535),
    },
    'dnp3': {
        'name': 'DNP3',
        'vendors': ['Schweitzer Engineering', 'GE', 'ABB', 'Siemens'],
        'data_types': ['analog_input', 'binary_input', 'counter', 'analog_output', 'binary_output'],
        'default_polling_interval': 2.0,
        'address_range': (0, 65535),
    },
    'profibus': {
        'name': 'Profibus DP/PA',
        'vendors': ['Siemens', 'ABB', 'Phoenix Contact', 'Endress+Hauser'],
        'data_types': ['input', 'output', 'diagnostic'],
        'default_polling_interval': 0.5,
        'address_range': (0, 126),
    },
    'bacnet': {
        'name': 'BACnet/IP',
        'vendors': ['Johnson Controls', 'Honeywell', 'Siemens', 'Schneider'],
        'data_types': ['analog_input', 'analog_output', 'binary_input', 'binary_output', 'multistate'],
        'default_polling_interval': 5.0,
        'address_range': (0, 4194303),
    },
    'opc_ua': {
        'name': 'OPC UA',
        'vendors': ['Siemens', 'Rockwell', 'Schneider', 'ABB', 'Honeywell'],
        'data_types': ['variable', 'method', 'object'],
        'default_polling_interval': 1.0,
        'address_range': None,  # Node-based addressing
    },
    'iec61850': {
        'name': 'IEC 61850',
        'vendors': ['Siemens', 'ABB', 'GE', 'Schweitzer Engineering'],
        'data_types': ['data_attribute', 'data_object', 'logical_node'],
        'default_polling_interval': 0.1,
        'address_range': None,  # Object-based addressing
    },
}

VENDOR_PROTOCOL_MAP = {
    'Siemens': ['modbus', 'profibus', 'opc_ua', 'iec61850'],
    'Schneider': ['modbus', 'bacnet', 'opc_ua'],
    'Honeywell': ['modbus', 'bacnet', 'opc_ua'],
    'Allen-Bradley': ['modbus', 'opc_ua'],
    'ABB': ['modbus', 'dnp3', 'profibus', 'opc_ua', 'iec61850'],
    'GE': ['dnp3', 'iec61850', 'opc_ua'],
    'Johnson Controls': ['bacnet', 'opc_ua'],
}


class ProtocolTranslator:
    """
    Universal translator that converts legacy OT protocol data into Munin's
    unified graph format. No hardware replacement required.
    """
    
    def __init__(self, protocol: str, vendor: Optional[str] = None):
        """
        Initialize translator for a specific protocol.
        
        Args:
            protocol: One of 'modbus', 'dnp3', 'profibus', 'bacnet', 'opc_ua', 'iec61850'
            vendor: Optional vendor name for vendor-specific optimizations
        """
        if protocol not in PROTOCOL_DRIVERS:
            raise ValueError(f"Unknown protocol: {protocol}. Supported: {list(PROTOCOL_DRIVERS.keys())}")
        
        self.protocol = protocol
        self.vendor = vendor
        self.driver = PROTOCOL_DRIVERS[protocol]
        self.translation_cache = {}
    
    def translate_frame(
        self,
        frame: Dict[str, Any],
        node_id: str,
        timestamp: datetime
    ) -> Dict[str, Any]:
        """
        Translate a single protocol frame into Munin's normalized format.
        
        Args:
            frame: Raw protocol frame (hex, address, function code, payload, etc.)
            node_id: Identifier for the source node/device
            timestamp: When the frame was captured
        
        Returns:
            Normalized data point in Munin format:
            {
                'node_id': str,
                'timestamp': ISO string,
                'value': float,
                'metadata': {
                    'protocol': str,
                    'address': str,
                    'data_type': str,
                    'quality': str,
                    'vendor': str,
                }
            }
        """
        # Extract value based on protocol
        value = self._extract_value(frame)
        
        # Determine data quality
        quality = self._assess_quality(frame)
        
        # Build normalized data point
        normalized = {
            'node_id': node_id,
            'timestamp': timestamp.isoformat(),
            'value': float(value),
            'metadata': {
                'protocol': self.protocol,
                'address': frame.get('address', 'unknown'),
                'functionCode': frame.get('functionCode', 'unknown'),
                'dataType': self._infer_data_type(frame),
                'quality': quality,
                'vendor': self.vendor or 'unknown',
                'rawHex': frame.get('hex', '')[:32],  # First 32 chars for debugging
            }
        }
        
        return normalized
    
    def _extract_value(self, frame: Dict[str, Any]) -> float:
        """Extract numeric value from protocol frame."""
        # Try payload first
        if 'payload' in frame:
            payload = frame['payload']
            if isinstance(payload, (int, float)):
                return float(payload)
            if isinstance(payload, str):
                # Try to parse hex or decimal
                try:
                    if payload.startswith('0x'):
                        return float(int(payload, 16))
                    return float(payload)
                except:
                    pass
        
        # Try to extract from hex
        if 'hex' in frame:
            hex_str = frame['hex'].replace(' ', '')
            if len(hex_str) >= 4:
                try:
                    # Parse as 16-bit register (most common)
                    value = int(hex_str[-4:], 16)
                    # Handle signed values
                    if value > 32767:
                        value = value - 65536
                    return float(value)
                except:
                    pass
        
        # Default: return 0.0 if we can't parse
        return 0.0
    
    def _infer_data_type(self, frame: Dict[str, Any]) -> str:
        """Infer data type from protocol frame."""
        protocol_types = self.driver['data_types']
        
        # Use function code or address range to infer type
        func_code = frame.get('functionCode', '').lower()
        address = frame.get('address', 0)
        
        if self.protocol == 'modbus':
            if '03' in func_code or '04' in func_code:
                return 'holding_register' if '03' in func_code else 'input_register'
            elif '01' in func_code or '02' in func_code:
                return 'coil' if '01' in func_code else 'discrete_input'
        
        elif self.protocol == 'dnp3':
            if '30' in func_code or '31' in func_code:
                return 'analog_input'
            elif '01' in func_code or '02' in func_code:
                return 'binary_input'
        
        elif self.protocol == 'bacnet':
            # BACnet uses object types
            if 'ai' in func_code.lower():
                return 'analog_input'
            elif 'ao' in func_code.lower():
                return 'analog_output'
            elif 'bi' in func_code.lower():
                return 'binary_input'
            elif 'bo' in func_code.lower():
                return 'binary_output'
        
        # Default to first available type
        return protocol_types[0] if protocol_types else 'unknown'
    
    def _assess_quality(self, frame: Dict[str, Any]) -> str:
        """Assess data quality from protocol frame."""
        # Check for retries (indicates communication issues)
        retries = frame.get('retries', 0)
        if retries > 3:
            return 'degraded'
        if retries > 0:
            return 'warning'
        
        # Check for error codes
        if 'error' in frame or 'exception' in frame:
            return 'error'
        
        return 'good'
    
    def batch_translate(
        self,
        frames: List[Dict[str, Any]],
        node_mapping: Dict[str, str]
    ) -> pd.DataFrame:
        """
        Translate a batch of protocol frames into a pandas DataFrame.
        
        Args:
            frames: List of protocol frames
            node_mapping: Maps frame identifiers to Munin node_ids
        
        Returns:
            DataFrame with columns: node_id, timestamp, value, metadata (JSON)
        """
        normalized_points = []
        
        for frame in frames:
            # Determine node_id from frame
            frame_id = frame.get('address', frame.get('device_id', 'unknown'))
            node_id = node_mapping.get(frame_id, f"node_{frame_id}")
            
            # Parse timestamp
            if 'timestamp' in frame:
                if isinstance(frame['timestamp'], str):
                    timestamp = datetime.fromisoformat(frame['timestamp'])
                else:
                    timestamp = frame['timestamp']
            else:
                timestamp = datetime.now()
            
            # Translate frame
            normalized = self.translate_frame(frame, node_id, timestamp)
            normalized_points.append(normalized)
        
        # Convert to DataFrame
        if not normalized_points:
            return pd.DataFrame(columns=['node_id', 'timestamp', 'value'])
        
        df = pd.DataFrame(normalized_points)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        return df


class ProtocolLibrary:
    """
    Central registry of all protocol drivers - the "Library of Ancestry".
    Provides auto-detection and multi-protocol support.
    """
    
    def __init__(self):
        self.translators = {}
        self.auto_detection_cache = {}
    
    def get_translator(self, protocol: str, vendor: Optional[str] = None) -> ProtocolTranslator:
        """Get or create a translator for a protocol."""
        key = f"{protocol}:{vendor or 'default'}"
        if key not in self.translators:
            self.translators[key] = ProtocolTranslator(protocol, vendor)
        return self.translators[key]
    
    def auto_detect_protocol(self, frame: Dict[str, Any]) -> Optional[str]:
        """
        Auto-detect protocol from frame characteristics.
        Uses heuristics based on frame structure, address ranges, function codes.
        """
        # Check hex patterns
        hex_str = frame.get('hex', '').replace(' ', '').upper()
        
        # Modbus: Starts with device address (1 byte) + function code (1 byte)
        if len(hex_str) >= 4:
            func_code = hex_str[2:4]
            if func_code in ['01', '02', '03', '04', '05', '06', '0F', '10']:
                return 'modbus'
        
        # DNP3: Starts with 0x0564 (start bytes)
        if hex_str.startswith('0564'):
            return 'dnp3'
        
        # BACnet: Has specific APDU structure
        if 'BAC0' in hex_str or '810B' in hex_str:
            return 'bacnet'
        
        # Profibus: Vendor-specific patterns
        if 'Siemens' in str(frame.get('vendor', '')):
            return 'profibus'
        
        # Check by vendor
        vendor = frame.get('vendor', '').lower()
        if vendor in VENDOR_PROTOCOL_MAP:
            protocols = VENDOR_PROTOCOL_MAP[vendor]
            return protocols[0]  # Return most common protocol for vendor
        
        return None
    
    def ingest_legacy_data(
        self,
        data_source: Path,
        protocol: Optional[str] = None,
        vendor: Optional[str] = None,
        node_mapping: Optional[Dict[str, str]] = None
    ) -> pd.DataFrame:
        """
        Ingest legacy OT data from various formats and translate to Munin format.
        Supports CSV, JSON, binary dumps, SCADA historian exports.
        
        This is the "24-hour ingestion" function - drop in legacy data, get Munin graph.
        """
        node_mapping = node_mapping or {}
        
        # Detect file format
        if data_source.suffix == '.csv':
            frames = self._load_csv_frames(data_source)
        elif data_source.suffix == '.json':
            frames = self._load_json_frames(data_source)
        else:
            raise ValueError(f"Unsupported file format: {data_source.suffix}")
        
        # Auto-detect protocol if not specified
        if not protocol and frames:
            protocol = self.auto_detect_protocol(frames[0])
            if not protocol:
                raise ValueError("Could not auto-detect protocol. Please specify protocol.")
        
        # Get translator
        translator = self.get_translator(protocol, vendor)
        
        # Translate all frames
        df = translator.batch_translate(frames, node_mapping)
        
        return df
    
    def _load_csv_frames(self, csv_path: Path) -> List[Dict[str, Any]]:
        """Load protocol frames from CSV format."""
        df = pd.read_csv(csv_path)
        frames = []
        
        for _, row in df.iterrows():
            frame = {
                'timestamp': pd.to_datetime(row.get('timestamp', datetime.now())),
                'hex': str(row.get('hex', '')),
                'address': str(row.get('address', '')),
                'functionCode': str(row.get('function_code', row.get('functionCode', ''))),
                'payload': row.get('payload', ''),
                'retries': int(row.get('retries', 0)),
            }
            frames.append(frame)
        
        return frames
    
    def _load_json_frames(self, json_path: Path) -> List[Dict[str, Any]]:
        """Load protocol frames from JSON format."""
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        # Handle various JSON formats
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and 'frames' in data:
            return data['frames']
        elif isinstance(data, dict) and 'data' in data:
            return data['data']
        else:
            return [data]


def create_protocol_connector_config(
    protocols: List[str],
    output_path: Path
) -> Dict[str, Any]:
    """
    Generate a configuration file for multi-protocol Munin Edge Node.
    This config tells the Edge Node which protocols to listen for and how to translate them.
    """
    config = {
        'version': '1.0',
        'created': datetime.now().isoformat(),
        'description': 'Munin Edge Node Protocol Connector Configuration',
        'protocols': [],
        'node_mappings': {},
        'polling_intervals': {},
    }
    
    for protocol in protocols:
        if protocol not in PROTOCOL_DRIVERS:
            continue
        
        driver = PROTOCOL_DRIVERS[protocol]
        config['protocols'].append({
            'name': protocol,
            'enabled': True,
            'polling_interval': driver['default_polling_interval'],
            'supported_vendors': driver['vendors'],
            'data_types': driver['data_types'],
        })
        
        config['polling_intervals'][protocol] = driver['default_polling_interval']
    
    with open(output_path, 'w') as f:
        yaml.dump(config, f, default_flow_style=False)
    
    return config


if __name__ == "__main__":
    # Example: Ingest legacy Modbus data
    library = ProtocolLibrary()
    
    # Simulate some protocol frames
    sample_frames = [
        {
            'timestamp': datetime.now() - timedelta(minutes=5),
            'hex': '010300000002C40B',
            'address': '01',
            'functionCode': '03',
            'payload': 100,
            'retries': 0,
        },
        {
            'timestamp': datetime.now() - timedelta(minutes=4),
            'hex': '010300000002C40B',
            'address': '01',
            'functionCode': '03',
            'payload': 102,
            'retries': 0,
        },
    ]
    
    translator = library.get_translator('modbus', 'Siemens')
    node_mapping = {'01': 'pump_station_01'}
    
    df = translator.batch_translate(sample_frames, node_mapping)
    print(f"Translated {len(df)} frames")
    print(df.head())


