"""
Carlisle Flood Monitoring Configuration
Configuration for River Eden system stations and thresholds.
"""
from dataclasses import dataclass
from typing import Dict, List
from datetime import datetime


@dataclass
class StationConfig:
    """Configuration for a monitoring station."""
    station_id: str  # EA station reference
    node_id: str  # Munin node identifier
    label: str  # Human-readable label
    river_name: str
    location: str
    flood_warning_threshold: float  # Level that triggers flood warning
    flood_alert_threshold: float  # Level that triggers flood alert
    critical_threshold: float  # Critical level requiring immediate action


@dataclass
class PlaybookTrigger:
    """Trigger condition for playbook activation."""
    condition: str  # e.g., "water_level > threshold"
    threshold: float
    node_id: str
    operator: str  # ">", "<", ">=", "<="
    unit: str


# Carlisle station configurations
CARLISLE_STATIONS = {
    'eden_sands_centre': StationConfig(
        station_id='762600',
        node_id='eden_sands_centre',
        label='River Eden at Sands Centre, Carlisle',
        river_name='Eden',
        location='Sands Centre, Carlisle',
        flood_warning_threshold=2.5,  # meters (example - adjust based on actual data)
        flood_alert_threshold=3.0,
        critical_threshold=3.5
    ),
    'petteril_botcherby': StationConfig(
        station_id='764070',
        node_id='petteril_botcherby',
        label='River Petteril at Botcherby Bridge, Carlisle',
        river_name='Petteril',
        location='Botcherby Bridge, Carlisle',
        flood_warning_threshold=1.8,  # meters (example - adjust based on actual data)
        flood_alert_threshold=2.2,
        critical_threshold=2.5
    ),
    'caldew_carlisle': StationConfig(
        station_id='764080',  # Example - need to verify actual station ID
        node_id='caldew_carlisle',
        label='River Caldew at Carlisle',
        river_name='Caldew',
        location='Carlisle',
        flood_warning_threshold=1.5,  # meters (example - adjust based on actual data)
        flood_alert_threshold=2.0,
        critical_threshold=2.5
    ),
    'rainfall_carlisle': StationConfig(
        station_id='RAINFALL_CARLISLE',  # Placeholder - will search for actual station
        node_id='rainfall_carlisle',
        label='Rainfall Monitoring - Carlisle Area',
        river_name='N/A',
        location='Carlisle Area',
        flood_warning_threshold=10.0,  # mm/hour
        flood_alert_threshold=15.0,
        critical_threshold=20.0
    )
}

# Playbook trigger conditions for flood gate coordination
FLOOD_GATE_TRIGGERS = [
    PlaybookTrigger(
        condition='eden_level > flood_warning_threshold',
        threshold=CARLISLE_STATIONS['eden_sands_centre'].flood_warning_threshold,
        node_id='eden_sands_centre',
        operator='>',
        unit='meters'
    ),
    PlaybookTrigger(
        condition='petteril_level > flood_warning_threshold',
        threshold=CARLISLE_STATIONS['petteril_botcherby'].flood_warning_threshold,
        node_id='petteril_botcherby',
        operator='>',
        unit='meters'
    ),
    PlaybookTrigger(
        condition='rainfall_rate > threshold',
        threshold=10.0,  # mm/hour
        node_id='rainfall_carlisle',
        operator='>',
        unit='mm/hour'
    )
]

# Roles for flood coordination playbook
FLOOD_COORDINATION_ROLES = [
    {
        'role': 'EA Duty Officer',
        'authority': 'flood_operations',
        'approval_required': True,
        'contact_method': 'secure_channel'
    },
    {
        'role': 'Council Emergency Officer',
        'authority': 'local_authority',
        'approval_required': True,
        'contact_method': 'secure_channel'
    },
    {
        'role': 'Highways Authority',
        'authority': 'infrastructure',
        'approval_required': False,  # Notification only
        'contact_method': 'notification'
    },
    {
        'role': 'Communications Officer',
        'authority': 'public_communications',
        'approval_required': False,  # Notification only
        'contact_method': 'notification'
    }
]

# Storm Desmond historical reference
STORM_DESMOND = {
    'event_date': datetime(2015, 12, 6),
    'start_window': datetime(2015, 12, 5),
    'end_window': datetime(2015, 12, 7, 23, 59, 59),
    'description': 'Storm Desmond - Record flood levels in Carlisle',
    'peak_levels': {
        'eden_sands_centre': 3.8,  # meters (example - verify with actual data)
        'petteril_botcherby': 2.7
    }
}


def get_station_config(node_id: str) -> StationConfig:
    """Get station configuration by node ID."""
    return CARLISLE_STATIONS.get(node_id)


def get_all_stations() -> Dict[str, StationConfig]:
    """Get all station configurations."""
    return CARLISLE_STATIONS.copy()


def check_trigger_condition(
    node_id: str,
    value: float,
    trigger: PlaybookTrigger
) -> bool:
    """Check if a trigger condition is met."""
    if trigger.node_id != node_id:
        return False
    
    if trigger.operator == '>':
        return value > trigger.threshold
    elif trigger.operator == '>=':
        return value >= trigger.threshold
    elif trigger.operator == '<':
        return value < trigger.threshold
    elif trigger.operator == '<=':
        return value <= trigger.threshold
    else:
        raise ValueError(f"Unknown operator: {trigger.operator}")
