"""
YAML-Driven Logic-Lock Rules Engine

Validates commands against physics constraints defined in YAML configuration.
"""
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum


class ConstraintType(str, Enum):
    """Types of constraints."""
    MAX = "max"
    MIN = "min"
    MAX_RAMP_RATE = "max_ramp_rate"
    MIN_RAMP_RATE = "min_ramp_rate"


class Severity(str, Enum):
    """Severity levels for violations."""
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class LogicLockRule:
    """A Logic-Lock rule."""
    id: str
    asset_type: str
    parameter: str
    constraint_type: ConstraintType
    value: float
    unit: str
    violation_message: str
    severity: Severity
    temporal_window_seconds: Optional[int] = None


@dataclass
class Command:
    """Command to validate."""
    asset_id: str
    asset_type: str
    parameter: str
    value: float
    unit: str
    timestamp: str
    previous_value: Optional[float] = None
    previous_timestamp: Optional[str] = None


@dataclass
class ValidationResult:
    """Result of command validation."""
    valid: bool
    blocked_rules: List[str]
    warnings: List[str]
    errors: List[str]
    critical_violations: List[str]
    details: Dict


class LogicLockEngine:
    """YAML-driven Logic-Lock rules engine."""
    
    def __init__(self, rules_path: Optional[Path] = None):
        self.rules: Dict[str, LogicLockRule] = {}
        self.rule_sets: Dict[str, List[str]] = {}
        self.active_rule_set: str = "default"
        self.command_history: Dict[str, List[Command]] = {}  # asset_id -> commands
        
        if rules_path:
            self.load_rules(rules_path)
        else:
            # Load default rules
            default_rules_path = Path(__file__).parent / "logic_lock_rules.yaml"
            if default_rules_path.exists():
                self.load_rules(default_rules_path)
    
    def load_rules(self, rules_path: Path):
        """Load rules from YAML file."""
        with open(rules_path, 'r') as f:
            config = yaml.safe_load(f)
        
        # Load rules
        for rule_data in config.get('rules', []):
            rule = LogicLockRule(
                id=rule_data['id'],
                asset_type=rule_data['asset_type'],
                parameter=rule_data['parameter'],
                constraint_type=ConstraintType(rule_data['constraint_type']),
                value=rule_data['value'],
                unit=rule_data['unit'],
                violation_message=rule_data['violation_message'],
                severity=Severity(rule_data['severity']),
                temporal_window_seconds=rule_data.get('temporal_window_seconds')
            )
            self.rules[rule.id] = rule
        
        # Load rule sets
        self.rule_sets = {
            name: rule_set_data.get('rules', [])
            for name, rule_set_data in config.get('rule_sets', {}).items()
        }
    
    def validate_command(
        self,
        command: Command,
        rule_set: Optional[str] = None
    ) -> ValidationResult:
        """Validate a command against Logic-Lock rules."""
        rule_set_name = rule_set or self.active_rule_set
        applicable_rule_ids = self.rule_sets.get(rule_set_name, [])
        
        blocked_rules = []
        warnings = []
        errors = []
        critical_violations = []
        details = {}
        
        for rule_id in applicable_rule_ids:
            rule = self.rules.get(rule_id)
            if not rule:
                continue
            
            # Check if rule applies to this asset type and parameter
            if rule.asset_type != command.asset_type or rule.parameter != command.parameter:
                continue
            
            # Validate constraint
            violation = self._check_constraint(rule, command)
            
            if violation:
                blocked_rules.append(rule_id)
                violation_msg = f"{rule.violation_message} (Rule: {rule_id})"
                
                if rule.severity == Severity.CRITICAL:
                    critical_violations.append(violation_msg)
                elif rule.severity == Severity.ERROR:
                    errors.append(violation_msg)
                else:
                    warnings.append(violation_msg)
                
                details[rule_id] = {
                    'violated': True,
                    'rule': rule.id,
                    'constraint_type': rule.constraint_type.value,
                    'limit': rule.value,
                    'actual': command.value,
                    'severity': rule.severity.value
                }
            else:
                details[rule_id] = {'violated': False}
        
        # Critical violations always block
        valid = len(critical_violations) == 0
        
        # Record command in history (for temporal constraints)
        if command.asset_id not in self.command_history:
            self.command_history[command.asset_id] = []
        self.command_history[command.asset_id].append(command)
        
        return ValidationResult(
            valid=valid,
            blocked_rules=blocked_rules,
            warnings=warnings,
            errors=errors,
            critical_violations=critical_violations,
            details=details
        )
    
    def _check_constraint(self, rule: LogicLockRule, command: Command) -> bool:
        """Check if command violates a constraint."""
        if rule.constraint_type == ConstraintType.MAX:
            return command.value > rule.value
        elif rule.constraint_type == ConstraintType.MIN:
            return command.value < rule.value
        elif rule.constraint_type == ConstraintType.MAX_RAMP_RATE:
            return self._check_ramp_rate(rule, command, max_rate=True)
        elif rule.constraint_type == ConstraintType.MIN_RAMP_RATE:
            return self._check_ramp_rate(rule, command, max_rate=False)
        return False
    
    def _check_ramp_rate(
        self,
        rule: LogicLockRule,
        command: Command,
        max_rate: bool
    ) -> bool:
        """Check temporal ramp rate constraint."""
        if not command.previous_value or not command.previous_timestamp:
            return False  # No previous value to compare
        
        try:
            current_time = datetime.fromisoformat(command.timestamp)
            previous_time = datetime.fromisoformat(command.previous_timestamp)
            time_diff_seconds = (current_time - previous_time).total_seconds()
            
            if time_diff_seconds <= 0:
                return False
            
            value_diff = abs(command.value - command.previous_value)
            ramp_rate = value_diff / (time_diff_seconds / 60.0)  # Per minute
            
            if max_rate:
                return ramp_rate > rule.value
            else:
                return ramp_rate < rule.value
        except Exception:
            return False
    
    def set_rule_set(self, rule_set: str):
        """Set active rule set."""
        if rule_set not in self.rule_sets:
            raise ValueError(f"Rule set {rule_set} not found")
        self.active_rule_set = rule_set
    
    def get_applicable_rules(
        self,
        asset_type: str,
        parameter: str,
        rule_set: Optional[str] = None
    ) -> List[LogicLockRule]:
        """Get rules applicable to an asset type and parameter."""
        rule_set_name = rule_set or self.active_rule_set
        applicable_rule_ids = self.rule_sets.get(rule_set_name, [])
        
        applicable = []
        for rule_id in applicable_rule_ids:
            rule = self.rules.get(rule_id)
            if rule and rule.asset_type == asset_type and rule.parameter == parameter:
                applicable.append(rule)
        
        return applicable
    
    def run_self_test(self) -> Dict:
        """Run self-test with synthetic commands."""
        test_results = {
            'passed': [],
            'failed': [],
            'total': 0
        }
        
        # Test 1: Command that should be blocked (exceeds max RPM)
        test_command = Command(
            asset_id="test_pump_01",
            asset_type="pump",
            parameter="rpm",
            value=4000,  # Exceeds max of 3600
            unit="rpm",
            timestamp=datetime.now().isoformat()
        )
        
        result = self.validate_command(test_command)
        test_results['total'] += 1
        if not result.valid and len(result.critical_violations) > 0:
            test_results['passed'].append("Max RPM constraint correctly blocks excessive RPM")
        else:
            test_results['failed'].append("Max RPM constraint failed to block excessive RPM")
        
        # Test 2: Command that should be allowed (within limits)
        test_command2 = Command(
            asset_id="test_pump_02",
            asset_type="pump",
            parameter="rpm",
            value=2000,  # Within limits
            unit="rpm",
            timestamp=datetime.now().isoformat()
        )
        
        result2 = self.validate_command(test_command2)
        test_results['total'] += 1
        if result2.valid:
            test_results['passed'].append("Valid command correctly allowed")
        else:
            test_results['failed'].append("Valid command incorrectly blocked")
        
        return test_results
