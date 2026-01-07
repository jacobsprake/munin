"""
Green AI Grid Orchestration: Dynamic Energy-Water Balancing
2026 Reality Feature: Sustainability Optimization

In 2026, data centers are consuming up to 25% of national power grids.
Managing this load is a matter of Economic Survival.

The Feature: Dynamic Energy-Water Balancing
- Munin coordinates the cooling of massive AI data centers with the thermal limits
  of the municipal water supply and the grid's baseload capacity
- Helps prevent the AI boom from overwhelming the nation's energy budget

The Value: "We don't just protect the grid; we optimize the AI-Energy-Water Nexus.
Munin helps prevent the AI boom from overwhelming the nation's energy budget."
"""

import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict


class ResourceType(Enum):
    """Types of resources in the AI-Energy-Water nexus."""
    POWER_GRID = "power_grid"
    WATER_SUPPLY = "water_supply"
    COOLING_CAPACITY = "cooling_capacity"
    DATA_CENTER = "data_center"
    AI_COMPUTE = "ai_compute"


class ResourceStatus(Enum):
    """Status of a resource."""
    AVAILABLE = "available"
    STRESSED = "stressed"
    CRITICAL = "critical"
    EXHAUSTED = "exhausted"


@dataclass
class ResourceConstraint:
    """Represents a constraint on a resource."""
    resource_type: ResourceType
    current_usage: float  # Current usage (MW, L/s, etc.)
    capacity: float  # Maximum capacity
    threshold_warning: float  # Warning threshold (0.0-1.0)
    threshold_critical: float  # Critical threshold (0.0-1.0)
    thermal_limit: Optional[float] = None  # Thermal limit for cooling
    unit: str = "MW"  # Unit of measurement
    
    def get_status(self) -> ResourceStatus:
        """Get current status based on usage."""
        utilization = self.current_usage / self.capacity if self.capacity > 0 else 1.0
        
        if utilization >= self.threshold_critical:
            return ResourceStatus.CRITICAL
        elif utilization >= self.threshold_warning:
            return ResourceStatus.STRESSED
        elif utilization >= 0.95:
            return ResourceStatus.EXHAUSTED
        else:
            return ResourceStatus.AVAILABLE
    
    def get_utilization(self) -> float:
        """Get utilization ratio (0.0-1.0)."""
        return self.current_usage / self.capacity if self.capacity > 0 else 1.0


@dataclass
class DataCenterLoad:
    """Represents the load profile of a data center."""
    data_center_id: str
    power_demand_mw: float
    cooling_demand_lps: float  # Liters per second
    thermal_output_kw: float  # Thermal output in kW
    ai_compute_load: float  # Normalized AI compute load (0.0-1.0)
    priority: int  # Priority level (1-10, higher = more critical)
    can_shed_load: bool  # Whether load can be reduced
    min_operational_load: float  # Minimum load to maintain operations (0.0-1.0)


@dataclass
class BalancingAction:
    """Represents an action to balance the AI-Energy-Water nexus."""
    action_id: str
    action_type: str  # e.g., "shed_ai_load", "reduce_cooling", "shift_compute"
    target_data_center: str
    power_reduction_mw: float
    water_reduction_lps: float
    thermal_reduction_kw: float
    priority_impact: int  # Impact on priority services
    estimated_savings: float  # Estimated cost savings
    execution_time: datetime
    duration_minutes: int


class GreenAIOrchestrator:
    """
    Orchestrates the AI-Energy-Water nexus to prevent grid overload
    and water supply exhaustion.
    """
    
    def __init__(self):
        self.resource_constraints: Dict[ResourceType, ResourceConstraint] = {}
        self.data_centers: Dict[str, DataCenterLoad] = {}
        self.balancing_history: List[BalancingAction] = []
        self.optimization_window_hours = 24  # Optimization window
    
    def register_resource(
        self,
        resource_type: ResourceType,
        capacity: float,
        threshold_warning: float = 0.75,
        threshold_critical: float = 0.90,
        thermal_limit: Optional[float] = None,
        unit: str = "MW"
    ) -> ResourceConstraint:
        """Register a resource constraint."""
        constraint = ResourceConstraint(
            resource_type=resource_type,
            current_usage=0.0,
            capacity=capacity,
            threshold_warning=threshold_warning,
            threshold_critical=threshold_critical,
            thermal_limit=thermal_limit,
            unit=unit
        )
        self.resource_constraints[resource_type] = constraint
        return constraint
    
    def register_data_center(self, data_center: DataCenterLoad) -> None:
        """Register a data center."""
        self.data_centers[data_center.data_center_id] = data_center
    
    def update_resource_usage(
        self,
        resource_type: ResourceType,
        current_usage: float
    ) -> None:
        """Update current usage of a resource."""
        if resource_type in self.resource_constraints:
            self.resource_constraints[resource_type].current_usage = current_usage
    
    def compute_total_demand(self) -> Dict[str, float]:
        """Compute total demand across all resources."""
        total_power = sum(
            dc.power_demand_mw for dc in self.data_centers.values()
        )
        total_cooling = sum(
            dc.cooling_demand_lps for dc in self.data_centers.values()
        )
        total_thermal = sum(
            dc.thermal_output_kw for dc in self.data_centers.values()
        )
        
        return {
            'power_mw': total_power,
            'cooling_lps': total_cooling,
            'thermal_kw': total_thermal
        }
    
    def optimize_ai_energy_water_nexus(self) -> List[BalancingAction]:
        """
        Optimize the AI-Energy-Water nexus to prevent grid overload.
        Returns list of balancing actions to execute.
        """
        actions = []
        
        # Get current resource status
        power_constraint = self.resource_constraints.get(ResourceType.POWER_GRID)
        water_constraint = self.resource_constraints.get(ResourceType.WATER_SUPPLY)
        cooling_constraint = self.resource_constraints.get(ResourceType.COOLING_CAPACITY)
        
        if not power_constraint or not water_constraint:
            return actions
        
        # Check if optimization is needed
        power_status = power_constraint.get_status()
        water_status = water_constraint.get_status()
        
        if power_status == ResourceStatus.AVAILABLE and water_status == ResourceStatus.AVAILABLE:
            return actions  # No action needed
        
        # Compute total demand
        total_demand = self.compute_total_demand()
        
        # Calculate required reductions
        power_reduction_mw = 0.0
        if power_status in [ResourceStatus.STRESSED, ResourceStatus.CRITICAL]:
            power_utilization = power_constraint.get_utilization()
            target_utilization = power_constraint.threshold_warning - 0.05  # Target 70%
            power_reduction_mw = max(0, (power_utilization - target_utilization) * power_constraint.capacity)
        
        water_reduction_lps = 0.0
        if water_status in [ResourceStatus.STRESSED, ResourceStatus.CRITICAL]:
            water_utilization = water_constraint.get_utilization()
            target_utilization = water_constraint.threshold_warning - 0.05
            water_reduction_lps = max(0, (water_utilization - target_utilization) * water_constraint.capacity)
        
        # Generate balancing actions (prioritize low-priority, shedable loads)
        data_centers_sorted = sorted(
            self.data_centers.values(),
            key=lambda dc: (dc.priority, -dc.can_shed_load)  # Low priority, shedable first
        )
        
        remaining_power_reduction = power_reduction_mw
        remaining_water_reduction = water_reduction_lps
        
        for dc in data_centers_sorted:
            if not dc.can_shed_load:
                continue
            
            if remaining_power_reduction <= 0 and remaining_water_reduction <= 0:
                break
            
            # Calculate reduction for this data center
            dc_power_reduction = min(remaining_power_reduction, dc.power_demand_mw * 0.3)  # Max 30% reduction
            dc_water_reduction = min(remaining_water_reduction, dc.cooling_demand_lps * 0.3)
            
            # Estimate thermal reduction (cooling scales with power)
            dc_thermal_reduction = dc.thermal_output_kw * (dc_power_reduction / dc.power_demand_mw) if dc.power_demand_mw > 0 else 0
            
            if dc_power_reduction > 0 or dc_water_reduction > 0:
                action = BalancingAction(
                    action_id=f"balance_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{dc.data_center_id}",
                    action_type="shed_ai_load",
                    target_data_center=dc.data_center_id,
                    power_reduction_mw=dc_power_reduction,
                    water_reduction_lps=dc_water_reduction,
                    thermal_reduction_kw=dc_thermal_reduction,
                    priority_impact=dc.priority,
                    estimated_savings=self._estimate_savings(dc_power_reduction, dc_water_reduction),
                    execution_time=datetime.now(),
                    duration_minutes=60  # Default 1 hour
                )
                actions.append(action)
                
                remaining_power_reduction -= dc_power_reduction
                remaining_water_reduction -= dc_water_reduction
        
        # Record actions
        self.balancing_history.extend(actions)
        
        return actions
    
    def _estimate_savings(self, power_reduction_mw: float, water_reduction_lps: float) -> float:
        """Estimate cost savings from load reduction."""
        # Rough estimates: $100/MWh for power, $0.001/L for water
        power_cost_per_mwh = 100.0
        water_cost_per_liter = 0.001
        
        # Convert to hourly savings
        power_savings = power_reduction_mw * power_cost_per_mwh
        water_savings = water_reduction_lps * 3600 * water_cost_per_liter  # L/s to L/h
        
        return power_savings + water_savings
    
    def get_nexus_status(self) -> Dict:
        """Get current status of the AI-Energy-Water nexus."""
        total_demand = self.compute_total_demand()
        
        resource_statuses = {}
        for resource_type, constraint in self.resource_constraints.items():
            resource_statuses[resource_type.value] = {
                'currentUsage': constraint.current_usage,
                'capacity': constraint.capacity,
                'utilization': constraint.get_utilization(),
                'status': constraint.get_status().value,
                'unit': constraint.unit
            }
        
        return {
            'timestamp': datetime.now().isoformat(),
            'totalDemand': total_demand,
            'resourceStatuses': resource_statuses,
            'dataCenterCount': len(self.data_centers),
            'recentActions': len([a for a in self.balancing_history if (datetime.now() - a.execution_time).total_seconds() < 3600]),
            'optimizationWindowHours': self.optimization_window_hours
        }
    
    def get_optimization_report(self) -> Dict:
        """Get optimization report showing savings and efficiency gains."""
        if not self.balancing_history:
            return {
                'status': 'no_actions',
                'message': 'No balancing actions have been executed yet'
            }
        
        # Recent actions (last 24 hours)
        recent_actions = [
            a for a in self.balancing_history
            if (datetime.now() - a.execution_time).total_seconds() < 86400
        ]
        
        total_power_saved = sum(a.power_reduction_mw for a in recent_actions)
        total_water_saved = sum(a.water_reduction_lps for a in recent_actions)
        total_savings = sum(a.estimated_savings for a in recent_actions)
        
        return {
            'reportGeneratedAt': datetime.now().isoformat(),
            'periodHours': 24,
            'summary': {
                'totalActions': len(recent_actions),
                'totalPowerSavedMW': total_power_saved,
                'totalWaterSavedLPS': total_water_saved,
                'totalCostSavings': total_savings,
                'averageSavingsPerAction': total_savings / len(recent_actions) if recent_actions else 0.0
            },
            'nexusStatus': self.get_nexus_status(),
            'recentActions': [asdict(a) for a in recent_actions[-10:]]  # Last 10 actions
        }


if __name__ == "__main__":
    # Example: Green AI Grid Orchestration
    orchestrator = GreenAIOrchestrator()
    
    # Register resources
    orchestrator.register_resource(
        ResourceType.POWER_GRID,
        capacity=1000.0,  # 1000 MW capacity
        threshold_warning=0.75,
        threshold_critical=0.90,
        unit="MW"
    )
    
    orchestrator.register_resource(
        ResourceType.WATER_SUPPLY,
        capacity=500.0,  # 500 L/s capacity
        threshold_warning=0.75,
        threshold_critical=0.90,
        unit="L/s"
    )
    
    orchestrator.register_resource(
        ResourceType.COOLING_CAPACITY,
        capacity=5000.0,  # 5000 kW thermal capacity
        threshold_warning=0.80,
        threshold_critical=0.95,
        thermal_limit=50.0,  # 50°C max
        unit="kW"
    )
    
    # Register data centers
    orchestrator.register_data_center(DataCenterLoad(
        data_center_id="dc_ai_001",
        power_demand_mw=200.0,
        cooling_demand_lps=100.0,
        thermal_output_kw=180.0,
        ai_compute_load=0.85,
        priority=5,  # Medium priority
        can_shed_load=True,
        min_operational_load=0.5
    ))
    
    orchestrator.register_data_center(DataCenterLoad(
        data_center_id="dc_ai_002",
        power_demand_mw=300.0,
        cooling_demand_lps=150.0,
        thermal_output_kw=270.0,
        ai_compute_load=0.90,
        priority=3,  # Low priority
        can_shed_load=True,
        min_operational_load=0.4
    ))
    
    # Update resource usage (simulate high load)
    orchestrator.update_resource_usage(ResourceType.POWER_GRID, 850.0)  # 85% utilization
    orchestrator.update_resource_usage(ResourceType.WATER_SUPPLY, 450.0)  # 90% utilization
    
    # Optimize
    actions = orchestrator.optimize_ai_energy_water_nexus()
    
    print(f"Generated {len(actions)} balancing actions:")
    for action in actions:
        print(f"  - {action.action_type} on {action.target_data_center}")
        print(f"    Power reduction: {action.power_reduction_mw:.2f} MW")
        print(f"    Water reduction: {action.water_reduction_lps:.2f} L/s")
        print(f"    Estimated savings: ${action.estimated_savings:.2f}/hour")
    
    # Get status
    status = orchestrator.get_nexus_status()
    print(f"\nNexus Status: {json.dumps(status, indent=2)}")
    
    # Get optimization report
    report = orchestrator.get_optimization_report()
    print(f"\nOptimization Report: {json.dumps(report, indent=2)}")

