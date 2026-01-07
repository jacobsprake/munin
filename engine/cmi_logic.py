"""
Civilian-Military Integration (CMI) Authorization Logic

The "Billion Dollar Pivot": In a true national crisis (cyberwar, total grid collapse, 
or extreme climate disaster), the distinction between "fixing a water pipe" and 
"national defense" disappears.

This module implements the Priority-Shift Logic that changes system behavior from
"Efficiency Mode" to "Survival Mode" when CMI Protocol is activated.

During CMI mode:
- Resource authorization requires Ministry of Defense cryptographic key
- Non-essential sectors (commercial, luxury) are automatically rejected
- Life-support infrastructure (hospitals, military bases) receives maximum priority
- The system becomes a Dual-Use Sovereign Asset for national resilience
"""

from typing import Dict, Optional, Tuple
from enum import Enum
from dataclasses import dataclass
from datetime import datetime


class GlobalState(Enum):
    """Global system state - determines authorization behavior."""
    NORMAL = "NORMAL"
    EMERGENCY = "EMERGENCY"  # CMI Protocol activated


class SectorPriority(Enum):
    """Priority levels for sectors during CMI mode."""
    CRITICAL_LIFE_SUPPORT = 10  # Hospitals, emergency services
    MILITARY_ESSENTIAL = 9  # Military bases, defense infrastructure
    CRITICAL_INFRASTRUCTURE = 8  # Power generation, water treatment
    ESSENTIAL_SERVICES = 7  # Government, communications
    RESIDENTIAL_ESSENTIAL = 6  # Residential power/water
    COMMERCIAL = 5  # Commercial districts
    INDUSTRIAL_NON_ESSENTIAL = 4  # Non-essential manufacturing
    RECREATIONAL = 3  # Parks, entertainment
    LUXURY = 2  # Non-essential services
    DISPOSABLE = 1  # Can be completely shut down


class ImpactLevel(Enum):
    """Impact level of an action."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# Global state (in production, this would be in a database or distributed state store)
_GLOBAL_STATE = GlobalState.NORMAL
_CMI_ACTIVATED_AT: Optional[str] = None
_MINISTRY_OF_DEFENSE_KEY_REQUIRED = False


def activate_cmi_protocol() -> Dict:
    """
    Activate CMI Protocol - shifts system from Normal to Emergency mode.
    
    Returns:
        Dict with activation status and timestamp
    """
    global _GLOBAL_STATE, _CMI_ACTIVATED_AT, _MINISTRY_OF_DEFENSE_KEY_REQUIRED
    
    _GLOBAL_STATE = GlobalState.EMERGENCY
    _CMI_ACTIVATED_AT = datetime.now().isoformat()
    _MINISTRY_OF_DEFENSE_KEY_REQUIRED = True
    
    return {
        'status': 'CMI_PROTOCOL_ACTIVATED',
        'timestamp': _CMI_ACTIVATED_AT,
        'message': 'System shifted to Survival Mode. Ministry of Defense authorization required for all actions.',
        'global_state': _GLOBAL_STATE.value
    }


def deactivate_cmi_protocol() -> Dict:
    """
    Deactivate CMI Protocol - returns system to Normal mode.
    
    Returns:
        Dict with deactivation status
    """
    global _GLOBAL_STATE, _CMI_ACTIVATED_AT, _MINISTRY_OF_DEFENSE_KEY_REQUIRED
    
    _GLOBAL_STATE = GlobalState.NORMAL
    _CMI_ACTIVATED_AT = None
    _MINISTRY_OF_DEFENSE_KEY_REQUIRED = False
    
    return {
        'status': 'CMI_PROTOCOL_DEACTIVATED',
        'timestamp': datetime.now().isoformat(),
        'message': 'System returned to Normal Mode. Standard authorization protocols restored.',
        'global_state': _GLOBAL_STATE.value
    }


def get_cmi_status() -> Dict:
    """
    Get current CMI Protocol status.
    
    Returns:
        Dict with current state and activation info
    """
    return {
        'global_state': _GLOBAL_STATE.value,
        'cmi_active': _GLOBAL_STATE == GlobalState.EMERGENCY,
        'activated_at': _CMI_ACTIVATED_AT,
        'ministry_of_defense_key_required': _MINISTRY_OF_DEFENSE_KEY_REQUIRED
    }


def authorize_action(
    impact_level: ImpactLevel,
    sector_priority: int,
    requesting_sector: str,
    has_ministry_of_defense_key: bool = False,
    action_description: str = ""
) -> Tuple[bool, str, Dict]:
    """
    Authorize an action based on CMI Protocol state.
    
    In EMERGENCY mode:
    - Requires Ministry of Defense cryptographic key for authorization
    - Rejects actions from non-essential sectors (priority < 10)
    - Focuses on human survival over commercial cost
    
    Args:
        impact_level: Impact level of the action
        sector_priority: Priority of the sector (1-10, higher = more critical)
        requesting_sector: Sector requesting the action (e.g., "commercial", "health", "defense")
        has_ministry_of_defense_key: Whether the requester has MOD cryptographic key
        action_description: Description of the action being requested
    
    Returns:
        Tuple of (authorized: bool, reason: str, metadata: Dict)
    """
    global _GLOBAL_STATE, _MINISTRY_OF_DEFENSE_KEY_REQUIRED
    
    metadata = {
        'global_state': _GLOBAL_STATE.value,
        'impact_level': impact_level.value,
        'sector_priority': sector_priority,
        'requesting_sector': requesting_sector,
        'timestamp': datetime.now().isoformat()
    }
    
    # Normal mode: standard authorization
    if _GLOBAL_STATE == GlobalState.NORMAL:
        return True, "AUTHORIZED: Standard Protocol", metadata
    
    # Emergency mode: CMI Protocol active
    if _GLOBAL_STATE == GlobalState.EMERGENCY:
        # Check if Ministry of Defense key is required and present
        if _MINISTRY_OF_DEFENSE_KEY_REQUIRED and not has_ministry_of_defense_key:
            return False, "REJECTED: Ministry of Defense cryptographic key required for CMI Protocol actions", {
                **metadata,
                'required_authority': 'MINISTRY_OF_DEFENSE',
                'reason': 'CMI Protocol requires MOD authorization'
            }
        
        # In CMI mode, we ignore 'commercial cost' and focus on 'human survival'
        if sector_priority < 10:  # e.g., Data Centers, Luxury Retail, Commercial Districts
            return False, "REJECTED: Energy redirected to Life-Support Nodes", {
                **metadata,
                'reason': 'Non-essential sector - resources redirected to critical infrastructure',
                'redirect_target': 'Life-Support Nodes (Hospitals, Military Bases)'
            }
        
        # High-priority sectors (life-support, military) are authorized
        if sector_priority >= 10:
            return True, "AUTHORIZED: Sovereign Defense Handshake Required", {
                **metadata,
                'authorization_type': 'SOVEREIGN_DEFENSE_HANDSHAKE',
                'chain_of_command': 'CMI Protocol - Defense Priority'
            }
        
        # Medium priority: require additional verification
        if sector_priority >= 7:
            if has_ministry_of_defense_key:
                return True, "AUTHORIZED: MOD Key Verified - Essential Services", {
                    **metadata,
                    'authorization_type': 'MOD_VERIFIED',
                    'priority_level': 'ESSENTIAL_SERVICES'
                }
            else:
                return False, "REJECTED: Essential Services require MOD authorization in CMI mode", {
                    **metadata,
                    'required_authority': 'MINISTRY_OF_DEFENSE'
                }
    
    # Default: reject if state is unknown
    return False, "REJECTED: Unknown system state", metadata


def check_resource_redirect(
    sector_priority: int,
    target_sector: str
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Check if resources should be redirected from one sector to another during CMI mode.
    
    Args:
        sector_priority: Priority of the source sector
        target_sector: Target sector for redirection
    
    Returns:
        Tuple of (should_redirect: bool, from_sector: str, to_sector: str)
    """
    global _GLOBAL_STATE
    
    if _GLOBAL_STATE != GlobalState.EMERGENCY:
        return False, None, None
    
    # Redirect from low-priority sectors to high-priority sectors
    if sector_priority < 7:  # Commercial, non-essential
        if target_sector in ['health', 'defense', 'emergency']:
            return True, f"Sector Priority {sector_priority}", target_sector
    
    return False, None, None


def get_cmi_redirect_message(source_sector: str, target_sector: str) -> str:
    """
    Generate a human-readable message about resource redirection.
    
    Example: "Redirecting power from Commercial Sector 4 to Regional Hospital & Military Base Alpha."
    """
    return f"Redirecting power from {source_sector} to {target_sector}"


if __name__ == "__main__":
    # Example usage
    print("=" * 60)
    print("CMI Protocol Authorization Logic Test")
    print("=" * 60)
    
    # Test normal mode
    print("\n1. Normal Mode Authorization:")
    authorized, reason, metadata = authorize_action(
        impact_level=ImpactLevel.MEDIUM,
        sector_priority=5,  # Commercial
        requesting_sector="commercial_district_4"
    )
    print(f"   Result: {reason}")
    
    # Activate CMI Protocol
    print("\n2. Activating CMI Protocol:")
    activation = activate_cmi_protocol()
    print(f"   Status: {activation['status']}")
    print(f"   Message: {activation['message']}")
    
    # Test emergency mode - commercial sector (should be rejected)
    print("\n3. Emergency Mode - Commercial Sector Request:")
    authorized, reason, metadata = authorize_action(
        impact_level=ImpactLevel.MEDIUM,
        sector_priority=5,  # Commercial
        requesting_sector="commercial_district_4"
    )
    print(f"   Result: {reason}")
    
    # Test emergency mode - life support (should be authorized with MOD key)
    print("\n4. Emergency Mode - Life Support Request (with MOD key):")
    authorized, reason, metadata = authorize_action(
        impact_level=ImpactLevel.CRITICAL,
        sector_priority=10,  # Critical life support
        requesting_sector="regional_hospital_alpha",
        has_ministry_of_defense_key=True
    )
    print(f"   Result: {reason}")
    print(f"   Metadata: {metadata}")
    
    # Test emergency mode - life support (without MOD key - should still work for priority 10)
    print("\n5. Emergency Mode - Life Support Request (without MOD key):")
    authorized, reason, metadata = authorize_action(
        impact_level=ImpactLevel.CRITICAL,
        sector_priority=10,  # Critical life support
        requesting_sector="regional_hospital_alpha",
        has_ministry_of_defense_key=False
    )
    print(f"   Result: {reason}")
    
    # Test resource redirection
    print("\n6. Resource Redirection Check:")
    should_redirect, from_sector, to_sector = check_resource_redirect(
        sector_priority=5,  # Commercial
        target_sector="health"
    )
    if should_redirect:
        print(f"   Redirect: {get_cmi_redirect_message(from_sector, to_sector)}")
    else:
        print("   No redirection needed")
    
    # Get CMI status
    print("\n7. Current CMI Status:")
    status = get_cmi_status()
    print(f"   Global State: {status['global_state']}")
    print(f"   CMI Active: {status['cmi_active']}")
    print(f"   MOD Key Required: {status['ministry_of_defense_key_required']}")
    
    # Deactivate
    print("\n8. Deactivating CMI Protocol:")
    deactivation = deactivate_cmi_protocol()
    print(f"   Status: {deactivation['status']}")
    print(f"   Message: {deactivation['message']}")

