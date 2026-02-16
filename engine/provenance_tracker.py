"""
Data Provenance Tracking

Tracks data lineage and provenance for all data flowing through Munin.
"""
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import json


class ProvenanceEventType(str, Enum):
    """Types of provenance events."""
    DATA_INGESTION = "data_ingestion"
    DATA_TRANSFORMATION = "data_transformation"
    GRAPH_INFERENCE = "graph_inference"
    INCIDENT_DETECTION = "incident_detection"
    PACKET_GENERATION = "packet_generation"
    COMMAND_EXECUTION = "command_execution"


@dataclass
class ProvenanceEvent:
    """A single provenance event."""
    event_id: str
    event_type: ProvenanceEventType
    timestamp: str
    source_data_ids: List[str]  # IDs of source data
    output_data_ids: List[str]  # IDs of output data
    operation: str  # Description of operation
    metadata: Dict
    trace_id: Optional[str] = None
    correlation_id: Optional[str] = None


class ProvenanceTracker:
    """Tracks data provenance and lineage."""
    
    def __init__(self):
        self.events: Dict[str, ProvenanceEvent] = {}
        self.data_lineage: Dict[str, List[str]] = {}  # data_id -> [event_ids]
        self.reverse_lineage: Dict[str, List[str]] = {}  # data_id -> [source_data_ids]
    
    def record_event(
        self,
        event_type: ProvenanceEventType,
        source_data_ids: List[str],
        output_data_ids: List[str],
        operation: str,
        metadata: Optional[Dict] = None,
        trace_id: Optional[str] = None,
        correlation_id: Optional[str] = None
    ) -> ProvenanceEvent:
        """Record a provenance event."""
        event_id = f"prov_{datetime.now().timestamp()}_{len(self.events)}"
        
        event = ProvenanceEvent(
            event_id=event_id,
            event_type=event_type,
            timestamp=datetime.now().isoformat(),
            source_data_ids=source_data_ids,
            output_data_ids=output_data_ids,
            operation=operation,
            metadata=metadata or {},
            trace_id=trace_id,
            correlation_id=correlation_id
        )
        
        self.events[event_id] = event
        
        # Update lineage
        for output_id in output_data_ids:
            if output_id not in self.data_lineage:
                self.data_lineage[output_id] = []
            self.data_lineage[output_id].append(event_id)
            
            # Update reverse lineage
            if output_id not in self.reverse_lineage:
                self.reverse_lineage[output_id] = []
            self.reverse_lineage[output_id].extend(source_data_ids)
        
        return event
    
    def get_data_lineage(self, data_id: str) -> List[ProvenanceEvent]:
        """Get lineage (history) of a data item."""
        event_ids = self.data_lineage.get(data_id, [])
        return [self.events[eid] for eid in event_ids if eid in self.events]
    
    def get_data_sources(self, data_id: str) -> List[str]:
        """Get source data IDs for a data item."""
        return self.reverse_lineage.get(data_id, [])
    
    def get_full_lineage_tree(self, data_id: str) -> Dict:
        """Get full lineage tree (recursive) for a data item."""
        sources = self.get_data_sources(data_id)
        
        if not sources:
            return {
                'data_id': data_id,
                'sources': [],
                'is_root': True
            }
        
        return {
            'data_id': data_id,
            'sources': [
                self.get_full_lineage_tree(source_id)
                for source_id in sources
            ],
            'is_root': False
        }
    
    def export_provenance_graph(self) -> Dict:
        """Export provenance as a graph structure."""
        nodes = []
        edges = []
        
        # Create nodes for all data items
        all_data_ids = set()
        for event in self.events.values():
            all_data_ids.update(event.source_data_ids)
            all_data_ids.update(event.output_data_ids)
        
        for data_id in all_data_ids:
            nodes.append({
                'id': data_id,
                'type': 'data'
            })
        
        # Create nodes for events
        for event_id, event in self.events.items():
            nodes.append({
                'id': event_id,
                'type': 'event',
                'event_type': event.event_type.value,
                'operation': event.operation
            })
            
            # Create edges from sources to event
            for source_id in event.source_data_ids:
                edges.append({
                    'from': source_id,
                    'to': event_id,
                    'type': 'source'
                })
            
            # Create edges from event to outputs
            for output_id in event.output_data_ids:
                edges.append({
                    'from': event_id,
                    'to': output_id,
                    'type': 'output'
                })
        
        return {
            'nodes': nodes,
            'edges': edges,
            'exported_at': datetime.now().isoformat()
        }


# Global provenance tracker instance
_provenance_tracker = ProvenanceTracker()


def get_provenance_tracker() -> ProvenanceTracker:
    """Get global provenance tracker instance."""
    return _provenance_tracker
