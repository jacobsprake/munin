"""
Vendor-Specific Protocol Quirks

Handles vendor-specific protocol variations, endianness, scaling factors, etc.
"""
from typing import Dict, Optional, Tuple
from enum import Enum


class Endianness(str, Enum):
    """Byte order."""
    BIG_ENDIAN = "big_endian"
    LITTLE_ENDIAN = "little_endian"


class VendorQuirk:
    """Vendor-specific protocol quirk."""
    def __init__(
        self,
        vendor: str,
        protocol: str,
        quirk_type: str,
        description: str,
        fix_function: Optional[callable] = None
    ):
        self.vendor = vendor
        self.protocol = protocol
        self.quirk_type = quirk_type
        self.description = description
        self.fix_function = fix_function


# Vendor-specific quirks database
VENDOR_QUIRKS: Dict[str, Dict[str, VendorQuirk]] = {
    'Siemens': {
        'modbus_endianness': VendorQuirk(
            vendor='Siemens',
            protocol='modbus',
            quirk_type='endianness',
            description='Siemens Modbus uses big-endian for 32-bit values',
            fix_function=lambda x: x  # Would swap bytes in production
        ),
        'modbus_scaling': VendorQuirk(
            vendor='Siemens',
            protocol='modbus',
            quirk_type='scaling',
            description='Siemens Modbus registers scaled by 10 (value * 0.1)',
            fix_function=lambda x: x * 0.1
        ),
    },
    'Schneider': {
        'modbus_endianness': VendorQuirk(
            vendor='Schneider',
            protocol='modbus',
            quirk_type='endianness',
            description='Schneider Modbus uses little-endian for 32-bit values',
            fix_function=lambda x: x
        ),
        'modbus_address_offset': VendorQuirk(
            vendor='Schneider',
            protocol='modbus',
            quirk_type='address_offset',
            description='Schneider Modbus uses 1-based addressing (add 1)',
            fix_function=lambda x: x + 1
        ),
    },
    'ABB': {
        'dnp3_quality_mapping': VendorQuirk(
            vendor='ABB',
            protocol='dnp3',
            quirk_type='quality_mapping',
            description='ABB DNP3 uses custom quality bit mapping',
            fix_function=None  # Would map quality bits
        ),
    },
    'Honeywell': {
        'bacnet_property_naming': VendorQuirk(
            vendor='Honeywell',
            protocol='bacnet',
            quirk_type='property_naming',
            description='Honeywell BACnet uses non-standard property names',
            fix_function=None  # Would map property names
        ),
    },
}


def apply_vendor_quirk(
    vendor: str,
    protocol: str,
    quirk_type: str,
    value: any
) -> any:
    """Apply vendor-specific quirk fix."""
    vendor_quirks = VENDOR_QUIRKS.get(vendor, {})
    quirk_key = f'{protocol}_{quirk_type}'
    quirk = vendor_quirks.get(quirk_key)
    
    if quirk and quirk.fix_function:
        return quirk.fix_function(value)
    
    return value


def detect_protocol_version(
    protocol: str,
    frame_data: Dict
) -> Optional[str]:
    """Detect protocol version via heuristics."""
    if protocol == 'modbus':
        # Check for Modbus RTU vs TCP
        if 'transaction_id' in frame_data:
            return 'modbus_tcp'
        else:
            return 'modbus_rtu'
    
    elif protocol == 'dnp3':
        # Check DNP3 version from frame
        app_layer_version = frame_data.get('app_layer_version', 2)
        if app_layer_version == 2:
            return 'dnp3_v2'
        else:
            return 'dnp3_v3'
    
    elif protocol == 'bacnet':
        # Check BACnet version
        pdu_type = frame_data.get('pdu_type')
        if pdu_type == 'confirmed_request':
            return 'bacnet_ip'
        else:
            return 'bacnet_ms_tp'
    
    return None


def classify_malformed_frame(
    protocol: str,
    frame_data: Dict,
    error: Exception
) -> Dict:
    """Classify malformed frame error."""
    error_str = str(error).lower()
    
    if 'timeout' in error_str or 'connection' in error_str:
        return {
            'type': 'network_error',
            'severity': 'medium',
            'recoverable': True,
            'suggestion': 'Check network connectivity, retry with backoff'
        }
    elif 'partial' in error_str or 'incomplete' in error_str:
        return {
            'type': 'partial_frame',
            'severity': 'low',
            'recoverable': True,
            'suggestion': 'Frame may be corrupted, retry read'
        }
    elif 'checksum' in error_str or 'crc' in error_str:
        return {
            'type': 'checksum_error',
            'severity': 'high',
            'recoverable': True,
            'suggestion': 'Frame corrupted in transit, retry'
        }
    elif 'address' in error_str or 'range' in error_str:
        return {
            'type': 'misconfigured_device',
            'severity': 'high',
            'recoverable': False,
            'suggestion': 'Check device address configuration'
        }
    else:
        return {
            'type': 'unknown_error',
            'severity': 'medium',
            'recoverable': True,
            'suggestion': 'Review error details and retry'
        }
