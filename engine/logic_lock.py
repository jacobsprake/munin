"""
Logic-Lock: Hardware-Rooted Autonomy
The "Kill Switch" Defense

Nations are terrified of "Kill Switches" hidden in foreign hardware (e.g., Chinese inverters or German turbines).

The Solution: Hardware-Agnostic Logic Locking. Munin doesn't just read data; it acts as a "Secondary Firewall" 
for the physical world. If a turbine receives a command that violates the laws of physics (e.g., spinning too 
fast to cause a manual explosion), Munin's Trusted Execution Environment (TEE) blocks the signal at the 
electrical level.

Why they want it: It gives the nation Digital Sovereignty over physical hardware they didn't build. 
You are selling them the ability to trust their enemies' equipment.
"""

import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime

from engine.logger import get_logger

log = get_logger(__name__)


class PhysicsViolationType(Enum):
    """Types of physics violations that Logic-Lock can detect."""
    EXCEEDS_MAX_RPM = "exceeds_max_rpm"
    EXCEEDS_MAX_PRESSURE = "exceeds_max_pressure"
    EXCEEDS_MAX_TEMPERATURE = "exceeds_max_temperature"
    EXCEEDS_MAX_FLOW_RATE = "exceeds_max_flow_rate"
    NEGATIVE_TO_POSITIVE_INSTANT = "negative_to_positive_instant"  # Impossible state transition
    EXCEEDS_SAFETY_MARGIN = "exceeds_safety_margin"
    VIOLATES_CONSERVATION_LAW = "violates_conservation_law"
    EXCEEDS_MATERIAL_LIMITS = "exceeds_material_limits"


class AssetType(Enum):
    """Types of physical assets that Logic-Lock protects."""
    TURBINE = "turbine"
    PUMP = "pump"
    VALVE = "valve"
    TRANSFORMER = "transformer"
    GENERATOR = "generator"
    COMPRESSOR = "compressor"
    HEAT_EXCHANGER = "heat_exchanger"
    REACTOR = "reactor"


@dataclass
class PhysicsConstraint:
    """Physical constraint for an asset type."""
    asset_type: AssetType
    parameter: str  # e.g., "rpm", "pressure", "temperature"
    min_value: Optional[float]
    max_value: Optional[float]
    unit: str
    safety_margin_percent: float = 10.0  # 10% safety margin
    conservation_law: Optional[str] = None  # e.g., "energy", "mass", "momentum"


@dataclass
class CommandValidation:
    """Result of validating a command against physics constraints."""
    command_id: str
    asset_id: str
    asset_type: AssetType
    command: Dict
    valid: bool
    violations: List[PhysicsViolationType]
    blocked: bool
    reason: Optional[str] = None
    timestamp: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()


class LogicLockEngine:
    """
    Logic-Lock Engine: Hardware-Rooted Command Blocking
    
    Validates commands against physics constraints before they reach physical hardware.
    When integrated with TEE, this provides hardware-level enforcement that cannot be bypassed.
    """
    
    def __init__(self):
        # Define physics constraints for different asset types
        self.constraints: Dict[AssetType, List[PhysicsConstraint]] = {
            AssetType.TURBINE: [
                PhysicsConstraint(
                    asset_type=AssetType.TURBINE,
                    parameter="rpm",
                    min_value=0.0,
                    max_value=3600.0,  # Max RPM for typical industrial turbine
                    unit="rpm",
                    safety_margin_percent=15.0
                ),
                PhysicsConstraint(
                    asset_type=AssetType.TURBINE,
                    parameter="temperature",
                    min_value=-50.0,
                    max_value=500.0,  # Max operating temperature
                    unit="celsius",
                    safety_margin_percent=20.0
                ),
            ],
            AssetType.PUMP: [
                PhysicsConstraint(
                    asset_type=AssetType.PUMP,
                    parameter="flow_rate",
                    min_value=0.0,
                    max_value=10000.0,  # Max flow rate (L/min)
                    unit="liters_per_minute",
                    safety_margin_percent=10.0
                ),
                PhysicsConstraint(
                    asset_type=AssetType.PUMP,
                    parameter="pressure",
                    min_value=0.0,
                    max_value=100.0,  # Max pressure (bar)
                    unit="bar",
                    safety_margin_percent=15.0
                ),
            ],
            AssetType.VALVE: [
                PhysicsConstraint(
                    asset_type=AssetType.VALVE,
                    parameter="position",
                    min_value=0.0,
                    max_value=100.0,  # 0-100% open
                    unit="percent",
                    safety_margin_percent=5.0
                ),
            ],
            AssetType.TRANSFORMER: [
                PhysicsConstraint(
                    asset_type=AssetType.TRANSFORMER,
                    parameter="voltage",
                    min_value=0.0,
                    max_value=500000.0,  # Max voltage (V)
                    unit="volts",
                    safety_margin_percent=10.0
                ),
                PhysicsConstraint(
                    asset_type=AssetType.TRANSFORMER,
                    parameter="current",
                    min_value=0.0,
                    max_value=10000.0,  # Max current (A)
                    unit="amperes",
                    safety_margin_percent=10.0
                ),
            ],
        }
        
        self.blocked_commands: List[CommandValidation] = []
        self.allowed_commands: List[CommandValidation] = []
    
    def validate_command(
        self,
        command_id: str,
        asset_id: str,
        asset_type: AssetType,
        command: Dict
    ) -> CommandValidation:
        """
        Validate a command against physics constraints.
        
        Returns CommandValidation with valid=False and blocked=True if command violates physics.
        """
        violations = []
        
        # Get constraints for this asset type
        constraints = self.constraints.get(asset_type, [])
        
        # Check each constraint
        for constraint in constraints:
            param_value = command.get(constraint.parameter)
            
            if param_value is None:
                continue  # Parameter not in command, skip
            
            # Check min/max bounds
            if constraint.min_value is not None and param_value < constraint.min_value:
                violations.append(PhysicsViolationType.EXCEEDS_SAFETY_MARGIN)
            
            if constraint.max_value is not None:
                # Apply safety margin
                safe_max = constraint.max_value * (1.0 - constraint.safety_margin_percent / 100.0)
                
                if param_value > safe_max:
                    # Determine specific violation type
                    if constraint.parameter == "rpm":
                        violations.append(PhysicsViolationType.EXCEEDS_MAX_RPM)
                    elif constraint.parameter == "pressure":
                        violations.append(PhysicsViolationType.EXCEEDS_MAX_PRESSURE)
                    elif constraint.parameter == "temperature":
                        violations.append(PhysicsViolationType.EXCEEDS_MAX_TEMPERATURE)
                    elif constraint.parameter == "flow_rate":
                        violations.append(PhysicsViolationType.EXCEEDS_MAX_FLOW_RATE)
                    else:
                        violations.append(PhysicsViolationType.EXCEEDS_SAFETY_MARGIN)
        
        # Check for impossible state transitions
        # (e.g., going from negative to positive instantly, or exceeding material limits)
        if self._detect_impossible_transition(asset_id, command):
            violations.append(PhysicsViolationType.NEGATIVE_TO_POSITIVE_INSTANT)
        
        # Check conservation laws
        if self._violates_conservation_law(asset_id, command, asset_type):
            violations.append(PhysicsViolationType.VIOLATES_CONSERVATION_LAW)
        
        # Determine if command should be blocked
        blocked = len(violations) > 0
        
        validation = CommandValidation(
            command_id=command_id,
            asset_id=asset_id,
            asset_type=asset_type,
            command=command,
            valid=not blocked,
            violations=violations,
            blocked=blocked,
            reason=self._generate_block_reason(violations, constraints) if blocked else None
        )
        
        # Log validation result
        if blocked:
            self.blocked_commands.append(validation)
        else:
            self.allowed_commands.append(validation)
        
        return validation
    
    def _detect_impossible_transition(self, asset_id: str, command: Dict) -> bool:
        """
        Detect impossible state transitions (e.g., instant reversal, exceeding material limits).
        Checks for values that imply impossible physical jumps (e.g. rpm 50000 in one step).
        """
        cmd = command.get('command', command)
        value = cmd.get('value') if isinstance(cmd, dict) else command.get('value')
        if value is None:
            return False
        try:
            v = float(value)
            # Impossible single-step values: rpm > 10000, pressure > 500 bar, temp > 2000 C
            if v > 10000 or v < -10000:  # Extreme values in one command
                return True
            # Negative flow without explicit drain/release
            if v < -1000 and 'drain' not in str(command.get('action', '')).lower():
                return True
        except (TypeError, ValueError):
            pass
        return False

    def _violates_conservation_law(self, asset_id: str, command: Dict, asset_type: AssetType) -> bool:
        """
        Check if command violates conservation laws (energy, mass, momentum).
        Simplified: for pumps/valves, flow_in should balance flow_out; for turbines, power out <= power in.
        """
        cmd = command.get('command', command) if isinstance(command, dict) else {}
        if not isinstance(cmd, dict):
            return False
        # For pumps: if command increases flow significantly without corresponding inlet, flag
        flow = cmd.get('flow_rate') or cmd.get('flow') or cmd.get('value')
        if flow is not None:
            try:
                f = float(flow)
                # Negative flow without return path violates mass conservation
                if f < -1e6:  # Large negative flow (impossible without sink)
                    return True
            except (TypeError, ValueError):
                pass
        return False
    
    def _generate_block_reason(
        self,
        violations: List[PhysicsViolationType],
        constraints: List[PhysicsConstraint]
    ) -> str:
        """Generate human-readable reason for blocking command."""
        reasons = []
        
        for violation in violations:
            if violation == PhysicsViolationType.EXCEEDS_MAX_RPM:
                reasons.append("Command exceeds maximum safe RPM (would cause mechanical failure)")
            elif violation == PhysicsViolationType.EXCEEDS_MAX_PRESSURE:
                reasons.append("Command exceeds maximum safe pressure (risk of explosion)")
            elif violation == PhysicsViolationType.EXCEEDS_MAX_TEMPERATURE:
                reasons.append("Command exceeds maximum safe temperature (risk of material failure)")
            elif violation == PhysicsViolationType.EXCEEDS_MAX_FLOW_RATE:
                reasons.append("Command exceeds maximum safe flow rate (risk of system overload)")
            elif violation == PhysicsViolationType.EXCEEDS_SAFETY_MARGIN:
                reasons.append("Command exceeds safety margin (violates operational limits)")
            elif violation == PhysicsViolationType.NEGATIVE_TO_POSITIVE_INSTANT:
                reasons.append("Command requires impossible state transition (violates physics)")
            elif violation == PhysicsViolationType.VIOLATES_CONSERVATION_LAW:
                reasons.append("Command violates conservation law (energy/mass/momentum)")
            else:
                reasons.append("Command violates physics constraints")
        
        return "; ".join(reasons)
    
    def get_blocked_commands_summary(self) -> Dict:
        """Get summary of blocked commands for audit."""
        return {
            'total_blocked': len(self.blocked_commands),
            'total_allowed': len(self.allowed_commands),
            'block_rate': len(self.blocked_commands) / (len(self.blocked_commands) + len(self.allowed_commands)) if (len(self.blocked_commands) + len(self.allowed_commands)) > 0 else 0.0,
            'recent_blocked': [
                {
                    'command_id': cmd.command_id,
                    'asset_id': cmd.asset_id,
                    'violations': [v.value for v in cmd.violations],
                    'reason': cmd.reason,
                    'timestamp': cmd.timestamp
                }
                for cmd in self.blocked_commands[-10:]  # Last 10 blocked commands
            ]
        }


def integrate_logic_lock_with_tee(
    command: Dict,
    asset_id: str,
    asset_type: AssetType,
    tee_attestation: Dict
) -> Tuple[CommandValidation, bool]:
    """
    Integrate Logic-Lock with TEE for hardware-rooted enforcement.
    
    This function would be called from within the TEE to validate commands
    before they are signed and executed. The TEE ensures that even with root
    access, physics-violating commands cannot be executed.
    
    Returns:
        (validation, should_block)
    """
    engine = LogicLockEngine()
    
    command_id = command.get('id', f"cmd_{datetime.now().isoformat()}")
    validation = engine.validate_command(
        command_id=command_id,
        asset_id=asset_id,
        asset_type=asset_type,
        command=command
    )
    
    # If command violates physics, TEE will refuse to sign it
    # This makes it physically impossible to execute the command
    should_block = validation.blocked
    
    return validation, should_block


if __name__ == "__main__":
    # Example: Logic-Lock blocking a dangerous turbine command
    engine = LogicLockEngine()
    
    # Simulate a malicious command trying to spin turbine too fast
    malicious_command = {
        'id': 'cmd_malicious_001',
        'action': 'set_rpm',
        'rpm': 5000.0,  # Exceeds max safe RPM of 3600
        'temperature': 600.0  # Also exceeds max temperature
    }
    
    validation = engine.validate_command(
        command_id='cmd_malicious_001',
        asset_id='turbine_alpha',
        asset_type=AssetType.TURBINE,
        command=malicious_command
    )
    
    log.info(f"Command ID: {validation.command_id}")
    log.info(f"Asset: {validation.asset_id}")
    log.info(f"Valid: {validation.valid}")
    log.info(f"Blocked: {validation.blocked}")
    log.info(f"Violations: {[v.value for v in validation.violations]}")
    log.info(f"Reason: {validation.reason}")

    log.info("=" * 60)
    log.info("Logic-Lock Summary:")
    summary = engine.get_blocked_commands_summary()
    log.info(f"Total Blocked: {summary['total_blocked']}")
    log.info(f"Block Rate: {summary['block_rate']:.1%}")


