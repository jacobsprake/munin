"""Protocol translator fixtures and emulators for end-to-end validation."""
import pytest
import json
from pathlib import Path
from datetime import datetime
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from protocol_translator import ProtocolTranslator, ProtocolLibrary, PROTOCOL_DRIVERS


class TestModbusTranslation:
    """Tests for Modbus protocol translation."""
    
    def test_modbus_holding_register(self):
        """Test Modbus holding register translation."""
        translator = ProtocolTranslator('modbus', vendor='Siemens')
        
        frame = {
            'device_address': 1,
            'function_code': 3,  # Read Holding Registers
            'start_address': 40001,
            'quantity': 2,
            'values': [1234, 5678],
            'timestamp': datetime.now().isoformat()
        }
        
        result = translator.translate_frame(
            frame=frame,
            node_id='pump_01',
            timestamp=datetime.now()
        )
        
        assert 'node_id' in result
        assert 'value' in result
        assert 'timestamp' in result
        assert result['source_protocol'] == 'modbus'
    
    def test_modbus_coil(self):
        """Test Modbus coil (binary) translation."""
        translator = ProtocolTranslator('modbus', vendor='Schneider')
        
        frame = {
            'device_address': 2,
            'function_code': 1,  # Read Coils
            'start_address': 1,
            'quantity': 1,
            'values': [True],
            'timestamp': datetime.now().isoformat()
        }
        
        result = translator.translate_frame(
            frame=frame,
            node_id='valve_01',
            timestamp=datetime.now()
        )
        
        assert result['value'] == 1.0  # Boolean converted to float


class TestDNP3Translation:
    """Tests for DNP3 protocol translation."""
    
    def test_dnp3_analog_input(self):
        """Test DNP3 analog input translation."""
        translator = ProtocolTranslator('dnp3', vendor='Schweitzer Engineering')
        
        frame = {
            'object_group': 30,  # Analog Input
            'object_variation': 1,
            'index': 0,
            'value': 123.45,
            'quality': 'GOOD',
            'timestamp': datetime.now().isoformat()
        }
        
        result = translator.translate_frame(
            frame=frame,
            node_id='substation_01',
            timestamp=datetime.now()
        )
        
        assert result['value'] == 123.45
        assert result['source_protocol'] == 'dnp3'
    
    def test_dnp3_binary_input(self):
        """Test DNP3 binary input translation."""
        translator = ProtocolTranslator('dnp3')
        
        frame = {
            'object_group': 1,  # Binary Input
            'object_variation': 2,
            'index': 5,
            'value': True,
            'quality': 'ONLINE',
            'timestamp': datetime.now().isoformat()
        }
        
        result = translator.translate_frame(
            frame=frame,
            node_id='breaker_01',
            timestamp=datetime.now()
        )
        
        assert result['value'] == 1.0


class TestOPCUATranslation:
    """Tests for OPC UA protocol translation."""
    
    def test_opc_ua_variable(self):
        """Test OPC UA variable translation."""
        translator = ProtocolTranslator('opc_ua', vendor='Siemens')
        
        frame = {
            'node_id': 'ns=2;s=PressureSensor1',
            'data_type': 'Double',
            'value': 45.67,
            'source_timestamp': datetime.now().isoformat(),
            'server_timestamp': datetime.now().isoformat(),
            'status_code': 'Good'
        }
        
        result = translator.translate_frame(
            frame=frame,
            node_id='pressure_sensor_01',
            timestamp=datetime.now()
        )
        
        assert result['value'] == 45.67
        assert result['source_protocol'] == 'opc_ua'


class TestBACnetTranslation:
    """Tests for BACnet protocol translation."""
    
    def test_bacnet_analog_input(self):
        """Test BACnet analog input translation."""
        translator = ProtocolTranslator('bacnet', vendor='Johnson Controls')
        
        frame = {
            'object_type': 'analog_input',
            'object_instance': 1,
            'property': 'present_value',
            'value': 23.5,
            'units': 'degrees_celsius',
            'timestamp': datetime.now().isoformat()
        }
        
        result = translator.translate_frame(
            frame=frame,
            node_id='temperature_sensor_01',
            timestamp=datetime.now()
        )
        
        assert result['value'] == 23.5
        assert result['source_protocol'] == 'bacnet'


class TestProtocolAutoDetection:
    """Tests for protocol auto-detection."""
    
    def test_auto_detect_modbus(self):
        """Test auto-detection of Modbus frames."""
        library = ProtocolLibrary()
        
        frame = {
            'hex': '01 03 00 00 00 02',
            'vendor': 'Siemens'
        }
        
        detected = library.auto_detect_protocol(frame)
        assert detected == 'modbus'
    
    def test_auto_detect_dnp3(self):
        """Test auto-detection of DNP3 frames."""
        library = ProtocolLibrary()
        
        frame = {
            'hex': '0564 01 C0 01 00 00',
            'vendor': 'Schweitzer Engineering'
        }
        
        detected = library.auto_detect_protocol(frame)
        assert detected == 'dnp3'
    
    def test_auto_detect_bacnet(self):
        """Test auto-detection of BACnet frames."""
        library = ProtocolLibrary()
        
        frame = {
            'hex': '81 0B 00 0C',
            'vendor': 'Johnson Controls'
        }
        
        detected = library.auto_detect_protocol(frame)
        assert detected == 'bacnet'


class TestNormalization:
    """Tests for protocol normalization."""
    
    def test_unified_output_format(self):
        """Test that all protocols produce unified output format."""
        library = ProtocolLibrary()
        
        protocols = ['modbus', 'dnp3', 'opc_ua', 'bacnet']
        
        for protocol in protocols:
            translator = library.get_translator(protocol)
            
            # Create sample frame
            frame = {
                'value': 100.0,
                'timestamp': datetime.now().isoformat()
            }
            
            result = translator.translate_frame(
                frame=frame,
                node_id='test_node',
                timestamp=datetime.now()
            )
            
            # Verify unified format
            assert 'node_id' in result
            assert 'value' in result
            assert 'timestamp' in result
            assert 'source_protocol' in result
            assert result['source_protocol'] == protocol


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
