"""
Civilian-Military Integration (CMI): Dynamic Dual-Use Prioritization

During a national emergency (war, extreme climate event), the line between civilian infrastructure 
and military necessity disappears.

The Solution: Dynamic Dual-Use Prioritization. Munin can instantly re-prioritize the "Asset-Dependency 
Graph" to favor life-support systems (hospitals, military bases) while shedding load from non-essential 
sectors (commercial districts).

Why they want it: It allows the state to act as a High-Agency Organism. It moves the nation from 
"Chaos Management" to "Tactical Resource Orchestration."
"""

import json
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime


class AssetPriority(Enum):
    """Priority levels for assets during emergency."""
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


class EmergencyLevel(Enum):
    """Levels of national emergency."""
    PEACETIME = "peacetime"
    MINOR_INCIDENT = "minor_incident"
    MAJOR_INCIDENT = "major_incident"
    NATIONAL_EMERGENCY = "national_emergency"
    WAR = "war"
    EXISTENTIAL_THREAT = "existential_threat"


@dataclass
class AssetClassification:
    """Classification of an asset for CMI prioritization."""
    asset_id: str
    sector: str
    asset_type: str
    base_priority: AssetPriority
    is_life_support: bool
    is_military: bool
    is_critical_infrastructure: bool
    serves_hospitals: bool
    serves_military_bases: bool
    serves_residential: bool
    serves_commercial: bool
    can_be_shed: bool  # Can this asset be shut down during emergency?
    load_shedding_order: int  # Order in which to shed load (lower = shed first)


@dataclass
class CMIPrioritization:
    """CMI prioritization result for an asset."""
    asset_id: str
    emergency_level: EmergencyLevel
    base_priority: AssetPriority
    adjusted_priority: AssetPriority
    priority_multiplier: float
    should_preserve: bool
    can_shed_load: bool
    load_shedding_order: Optional[int]
    reasoning: str
    timestamp: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()


class CMIPrioritizationEngine:
    """
    Civilian-Military Integration Prioritization Engine
    
    Dynamically re-prioritizes assets based on emergency level, ensuring life-support
    and military systems receive resources while non-essential sectors are shed.
    """
    
    def __init__(self):
        self.asset_classifications: Dict[str, AssetClassification] = {}
        self.current_emergency_level: EmergencyLevel = EmergencyLevel.PEACETIME
        self.prioritization_history: List[CMIPrioritization] = []
    
    def classify_asset(
        self,
        asset_id: str,
        sector: str,
        asset_type: str,
        is_life_support: bool = False,
        is_military: bool = False,
        is_critical_infrastructure: bool = False,
        serves_hospitals: bool = False,
        serves_military_bases: bool = False,
        serves_residential: bool = False,
        serves_commercial: bool = False
    ) -> AssetClassification:
        """Classify an asset for CMI prioritization."""
        
        # Determine base priority
        if is_life_support or serves_hospitals:
            base_priority = AssetPriority.CRITICAL_LIFE_SUPPORT
        elif is_military or serves_military_bases:
            base_priority = AssetPriority.MILITARY_ESSENTIAL
        elif is_critical_infrastructure:
            base_priority = AssetPriority.CRITICAL_INFRASTRUCTURE
        elif serves_residential:
            base_priority = AssetPriority.RESIDENTIAL_ESSENTIAL
        elif serves_commercial:
            base_priority = AssetPriority.COMMERCIAL
        else:
            base_priority = AssetPriority.INDUSTRIAL_NON_ESSENTIAL
        
        # Determine if asset can be shed
        can_be_shed = not (is_life_support or is_military or is_critical_infrastructure)
        
        # Determine load shedding order (lower = shed first)
        if can_be_shed:
            if serves_commercial:
                load_shedding_order = 1  # Shed commercial first
            elif serves_residential:
                load_shedding_order = 2  # Shed residential if needed
            else:
                load_shedding_order = 3  # Shed other non-essential
        else:
            load_shedding_order = 999  # Never shed
        
        classification = AssetClassification(
            asset_id=asset_id,
            sector=sector,
            asset_type=asset_type,
            base_priority=base_priority,
            is_life_support=is_life_support,
            is_military=is_military,
            is_critical_infrastructure=is_critical_infrastructure,
            serves_hospitals=serves_hospitals,
            serves_military_bases=serves_military_bases,
            serves_residential=serves_residential,
            serves_commercial=serves_commercial,
            can_be_shed=can_be_shed,
            load_shedding_order=load_shedding_order
        )
        
        self.asset_classifications[asset_id] = classification
        return classification
    
    def set_emergency_level(self, level: EmergencyLevel):
        """Set the current emergency level."""
        self.current_emergency_level = level
    
    def prioritize_asset(self, asset_id: str) -> CMIPrioritization:
        """
        Get prioritization for an asset given current emergency level.
        """
        if asset_id not in self.asset_classifications:
            raise ValueError(f"Asset {asset_id} not classified")
        
        classification = self.asset_classifications[asset_id]
        
        # Adjust priority based on emergency level
        adjusted_priority = classification.base_priority
        priority_multiplier = 1.0
        should_preserve = True
        reasoning_parts = []
        
        if self.current_emergency_level == EmergencyLevel.WAR or \
           self.current_emergency_level == EmergencyLevel.EXISTENTIAL_THREAT:
            # During war/existential threat, prioritize life-support and military
            if classification.is_life_support or classification.is_military:
                adjusted_priority = AssetPriority.CRITICAL_LIFE_SUPPORT
                priority_multiplier = 2.0
                should_preserve = True
                reasoning_parts.append("CRITICAL: Life-support or military asset - maximum priority")
            elif classification.is_critical_infrastructure:
                adjusted_priority = AssetPriority.CRITICAL_INFRASTRUCTURE
                priority_multiplier = 1.5
                should_preserve = True
                reasoning_parts.append("CRITICAL: Infrastructure essential for survival")
            else:
                # Non-essential assets can be shed
                adjusted_priority = AssetPriority.DISPOSABLE
                priority_multiplier = 0.1
                should_preserve = False
                reasoning_parts.append("SHEDDABLE: Non-essential asset - can be shut down")
        
        elif self.current_emergency_level == EmergencyLevel.NATIONAL_EMERGENCY:
            # During national emergency, preserve critical systems
            if classification.is_life_support or classification.is_military:
                adjusted_priority = AssetPriority.CRITICAL_LIFE_SUPPORT
                priority_multiplier = 1.8
                should_preserve = True
                reasoning_parts.append("HIGH: Life-support or military asset")
            elif classification.is_critical_infrastructure:
                adjusted_priority = AssetPriority.CRITICAL_INFRASTRUCTURE
                priority_multiplier = 1.3
                should_preserve = True
                reasoning_parts.append("HIGH: Critical infrastructure")
            elif classification.serves_commercial:
                adjusted_priority = AssetPriority.COMMERCIAL
                priority_multiplier = 0.5
                should_preserve = False
                reasoning_parts.append("LOW: Commercial - can be reduced")
            else:
                adjusted_priority = classification.base_priority
                priority_multiplier = 1.0
                should_preserve = classification.base_priority.value >= AssetPriority.RESIDENTIAL_ESSENTIAL.value
        
        else:
            # Peacetime or minor incidents - normal operation
            adjusted_priority = classification.base_priority
            priority_multiplier = 1.0
            should_preserve = True
            reasoning_parts.append("NORMAL: Standard operation")
        
        reasoning = f"[{self.current_emergency_level.value}] " + "; ".join(reasoning_parts)
        
        prioritization = CMIPrioritization(
            asset_id=asset_id,
            emergency_level=self.current_emergency_level,
            base_priority=classification.base_priority,
            adjusted_priority=adjusted_priority,
            priority_multiplier=priority_multiplier,
            should_preserve=should_preserve,
            can_shed_load=classification.can_be_shed,
            load_shedding_order=classification.load_shedding_order if not should_preserve else None,
            reasoning=reasoning
        )
        
        self.prioritization_history.append(prioritization)
        return prioritization
    
    def get_load_shedding_plan(self) -> List[Dict]:
        """
        Get ordered list of assets that can be shed, ordered by priority.
        """
        shed_plan = []
        
        for asset_id, classification in self.asset_classifications.items():
            if classification.can_be_shed:
                prioritization = self.prioritize_asset(asset_id)
                if not prioritization.should_preserve:
                    shed_plan.append({
                        'asset_id': asset_id,
                        'sector': classification.sector,
                        'asset_type': classification.asset_type,
                        'load_shedding_order': classification.load_shedding_order,
                        'priority': prioritization.adjusted_priority.value,
                        'reasoning': prioritization.reasoning
                    })
        
        # Sort by load shedding order (lower = shed first)
        shed_plan.sort(key=lambda x: x['load_shedding_order'])
        
        return shed_plan
    
    def get_preservation_plan(self) -> List[Dict]:
        """
        Get list of assets that must be preserved, ordered by priority.
        """
        preserve_plan = []
        
        for asset_id, classification in self.asset_classifications.items():
            prioritization = self.prioritize_asset(asset_id)
            if prioritization.should_preserve:
                preserve_plan.append({
                    'asset_id': asset_id,
                    'sector': classification.sector,
                    'asset_type': classification.asset_type,
                    'priority': prioritization.adjusted_priority.value,
                    'priority_multiplier': prioritization.priority_multiplier,
                    'reasoning': prioritization.reasoning
                })
        
        # Sort by priority (higher = preserve first)
        preserve_plan.sort(key=lambda x: x['priority'], reverse=True)
        
        return preserve_plan


if __name__ == "__main__":
    # Example: CMI prioritization during war
    engine = CMIPrioritizationEngine()
    
    # Classify assets
    engine.classify_asset(
        asset_id="hospital_power_substation_01",
        sector="power",
        asset_type="substation",
        is_life_support=True,
        serves_hospitals=True
    )
    
    engine.classify_asset(
        asset_id="military_base_power_01",
        sector="power",
        asset_type="substation",
        is_military=True,
        serves_military_bases=True
    )
    
    engine.classify_asset(
        asset_id="commercial_district_power_01",
        sector="power",
        asset_type="substation",
        serves_commercial=True
    )
    
    # Set emergency level to WAR
    engine.set_emergency_level(EmergencyLevel.WAR)
    
    print("="*60)
    print("CMI Prioritization During WAR")
    print("="*60)
    
    # Get prioritization for each asset
    for asset_id in ["hospital_power_substation_01", "military_base_power_01", "commercial_district_power_01"]:
        prioritization = engine.prioritize_asset(asset_id)
        print(f"\nAsset: {asset_id}")
        print(f"  Base Priority: {prioritization.base_priority.value}")
        print(f"  Adjusted Priority: {prioritization.adjusted_priority.value}")
        print(f"  Priority Multiplier: {prioritization.priority_multiplier}x")
        print(f"  Should Preserve: {prioritization.should_preserve}")
        print(f"  Reasoning: {prioritization.reasoning}")
    
    print("\n" + "="*60)
    print("Load Shedding Plan:")
    print("="*60)
    shed_plan = engine.get_load_shedding_plan()
    for asset in shed_plan:
        print(f"  {asset['asset_id']} (Order: {asset['load_shedding_order']}) - {asset['reasoning']}")
    
    print("\n" + "="*60)
    print("Preservation Plan:")
    print("="*60)
    preserve_plan = engine.get_preservation_plan()
    for asset in preserve_plan:
        print(f"  {asset['asset_id']} (Priority: {asset['priority']}) - {asset['reasoning']}")

