"""
Data Ingestion Status Tracking

Tracks source health and ingestion status for monitoring.
"""
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import json


class SourceStatus(str, Enum):
    """Status of a data source."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    UNKNOWN = "unknown"


@dataclass
class DataSource:
    """Data source definition."""
    source_id: str
    source_type: str  # 'historian', 'protocol', 'api', 'file'
    protocol: Optional[str] = None
    endpoint: Optional[str] = None
    status: SourceStatus = SourceStatus.UNKNOWN
    last_successful_read: Optional[str] = None
    last_error: Optional[str] = None
    error_count: int = 0
    success_count: int = 0
    last_updated: Optional[str] = None


class DataIngestionStatusTracker:
    """Tracks data ingestion status for all sources."""
    
    def __init__(self):
        self.sources: Dict[str, DataSource] = {}
        self.ingestion_history: List[Dict] = []
    
    def register_source(
        self,
        source_id: str,
        source_type: str,
        protocol: Optional[str] = None,
        endpoint: Optional[str] = None
    ) -> DataSource:
        """Register a new data source."""
        source = DataSource(
            source_id=source_id,
            source_type=source_type,
            protocol=protocol,
            endpoint=endpoint,
            status=SourceStatus.UNKNOWN
        )
        self.sources[source_id] = source
        return source
    
    def record_success(
        self,
        source_id: str,
        records_read: int = 1
    ):
        """Record successful ingestion."""
        if source_id not in self.sources:
            self.register_source(source_id, 'unknown')
        
        source = self.sources[source_id]
        source.success_count += records_read
        source.last_successful_read = datetime.now().isoformat()
        source.status = SourceStatus.HEALTHY
        source.last_updated = datetime.now().isoformat()
        source.last_error = None
    
    def record_error(
        self,
        source_id: str,
        error_message: str
    ):
        """Record ingestion error."""
        if source_id not in self.sources:
            self.register_source(source_id, 'unknown')
        
        source = self.sources[source_id]
        source.error_count += 1
        source.last_error = error_message
        source.last_updated = datetime.now().isoformat()
        
        # Update status based on error rate
        total_attempts = source.success_count + source.error_count
        error_rate = source.error_count / total_attempts if total_attempts > 0 else 0.0
        
        if error_rate > 0.5:
            source.status = SourceStatus.DOWN
        elif error_rate > 0.1:
            source.status = SourceStatus.DEGRADED
        else:
            source.status = SourceStatus.HEALTHY
    
    def get_source_health(self, source_id: str) -> Optional[Dict]:
        """Get health status for a source."""
        source = self.sources.get(source_id)
        if not source:
            return None
        
        return {
            'source_id': source.source_id,
            'status': source.status.value,
            'last_successful_read': source.last_successful_read,
            'last_error': source.last_error,
            'error_count': source.error_count,
            'success_count': source.success_count,
            'error_rate': source.error_count / (source.success_count + source.error_count) if (source.success_count + source.error_count) > 0 else 0.0,
            'last_updated': source.last_updated
        }
    
    def get_all_sources_health(self) -> Dict[str, Dict]:
        """Get health status for all sources."""
        return {
            source_id: self.get_source_health(source_id)
            for source_id in self.sources.keys()
        }
    
    def get_unhealthy_sources(self) -> List[str]:
        """Get list of unhealthy source IDs."""
        unhealthy = []
        for source_id, source in self.sources.items():
            if source.status in [SourceStatus.DEGRADED, SourceStatus.DOWN]:
                unhealthy.append(source_id)
        return unhealthy
