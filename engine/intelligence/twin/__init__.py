"""
Munin Intelligence Stack - Layer 4: Enhanced Digital Twin with Data Assimilation.

Multi-physics digital twin combining hydraulic, electrical, and telecom simulation
engines with cross-sector coupling and Ensemble Kalman Filter data assimilation.
"""

from .twin_manager import DigitalTwinManager
from .kalman_filter import EnsembleKalmanFilter
from .scenario_generator import ScenarioGenerator, LabelledScenario
from .physics.hydraulic import HydraulicEngine, HydraulicNode, HydraulicConnection
from .physics.electrical import ElectricalEngine, PowerNode, PowerConnection
from .physics.telecom import TelecomEngine, TelecomNode, TelecomConnection
from .physics.coupling import CrossSectorCoupling

__all__ = [
    "DigitalTwinManager",
    "EnsembleKalmanFilter",
    "ScenarioGenerator",
    "LabelledScenario",
    "HydraulicEngine",
    "HydraulicNode",
    "HydraulicConnection",
    "ElectricalEngine",
    "PowerNode",
    "PowerConnection",
    "TelecomEngine",
    "TelecomNode",
    "TelecomConnection",
    "CrossSectorCoupling",
]
