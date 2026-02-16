"""
Green AI Orchestrator

Orchestrates AI workloads to minimize energy consumption and carbon footprint.
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import time


class WorkloadPriority(str, Enum):
    """Priority levels for AI workloads."""
    CRITICAL = "critical"  # Must run immediately
    HIGH = "high"  # Run soon
    MEDIUM = "medium"  # Can be delayed
    LOW = "low"  # Can be deferred


@dataclass
class AIWorkload:
    """An AI workload to execute."""
    workload_id: str
    workload_type: str  # 'graph_inference', 'incident_detection', 'counterfactual', etc.
    priority: WorkloadPriority
    estimated_energy_kwh: float
    estimated_duration_seconds: float
    deadline: Optional[datetime] = None
    metadata: Optional[Dict] = None


class GreenAIOrchestrator:
    """Orchestrates AI workloads for energy efficiency."""
    
    def __init__(self):
        self.workload_queue: List[AIWorkload] = []
        self.running_workloads: Dict[str, AIWorkload] = {}
        self.completed_workloads: List[AIWorkload] = []
        self.energy_budget_kwh: float = 100.0  # Daily energy budget
        self.energy_consumed_today_kwh: float = 0.0
        self.last_reset_date: str = datetime.now().date().isoformat()
    
    def submit_workload(
        self,
        workload_type: str,
        priority: WorkloadPriority,
        estimated_energy_kwh: float,
        estimated_duration_seconds: float,
        deadline: Optional[datetime] = None,
        metadata: Optional[Dict] = None
    ) -> str:
        """Submit a workload for execution."""
        workload_id = f"workload_{datetime.now().timestamp()}_{len(self.workload_queue)}"
        
        workload = AIWorkload(
            workload_id=workload_id,
            workload_type=workload_type,
            priority=priority,
            estimated_energy_kwh=estimated_energy_kwh,
            estimated_duration_seconds=estimated_duration_seconds,
            deadline=deadline,
            metadata=metadata
        )
        
        self.workload_queue.append(workload)
        self._sort_queue()
        
        return workload_id
    
    def _sort_queue(self):
        """Sort workload queue by priority and deadline."""
        def sort_key(w: AIWorkload) -> tuple:
            priority_order = {
                WorkloadPriority.CRITICAL: 0,
                WorkloadPriority.HIGH: 1,
                WorkloadPriority.MEDIUM: 2,
                WorkloadPriority.LOW: 3
            }
            
            priority_score = priority_order.get(w.priority, 99)
            deadline_score = w.deadline.timestamp() if w.deadline else float('inf')
            
            return (priority_score, deadline_score)
        
        self.workload_queue.sort(key=sort_key)
    
    def can_execute_workload(self, workload: AIWorkload) -> bool:
        """Check if workload can be executed within energy budget."""
        # Reset daily budget if needed
        current_date = datetime.now().date().isoformat()
        if current_date != self.last_reset_date:
            self.energy_consumed_today_kwh = 0.0
            self.last_reset_date = current_date
        
        # Check if we have energy budget
        if self.energy_consumed_today_kwh + workload.estimated_energy_kwh > self.energy_budget_kwh:
            return False
        
        return True
    
    def execute_next_workload(self) -> Optional[str]:
        """Execute the next workload in queue if energy budget allows."""
        if not self.workload_queue:
            return None
        
        # Find first executable workload
        for i, workload in enumerate(self.workload_queue):
            if self.can_execute_workload(workload):
                # Remove from queue
                self.workload_queue.pop(i)
                
                # Add to running
                self.running_workloads[workload.workload_id] = workload
                
                # Consume energy
                self.energy_consumed_today_kwh += workload.estimated_energy_kwh
                
                return workload.workload_id
        
        return None
    
    def complete_workload(self, workload_id: str):
        """Mark a workload as completed."""
        if workload_id in self.running_workloads:
            workload = self.running_workloads.pop(workload_id)
            self.completed_workloads.append(workload)
    
    def get_energy_status(self) -> Dict:
        """Get current energy consumption status."""
        current_date = datetime.now().date().isoformat()
        if current_date != self.last_reset_date:
            self.energy_consumed_today_kwh = 0.0
            self.last_reset_date = current_date
        
        return {
            'energy_budget_kwh': self.energy_budget_kwh,
            'energy_consumed_today_kwh': self.energy_consumed_today_kwh,
            'energy_remaining_kwh': self.energy_budget_kwh - self.energy_consumed_today_kwh,
            'utilization_percent': (self.energy_consumed_today_kwh / self.energy_budget_kwh * 100) if self.energy_budget_kwh > 0 else 0.0,
            'workloads_queued': len(self.workload_queue),
            'workloads_running': len(self.running_workloads),
            'workloads_completed': len(self.completed_workloads)
        }
    
    def defer_low_priority_workloads(self) -> int:
        """Defer low-priority workloads to reduce energy consumption."""
        deferred = 0
        
        # Remove low-priority workloads from queue (they'll be resubmitted later)
        self.workload_queue = [
            w for w in self.workload_queue
            if w.priority != WorkloadPriority.LOW
        ]
        
        return deferred
