"""
Structured error classes for engine pipeline.

Provides stable error codes and human-readable messages for all failure modes.
"""
from typing import Optional, Dict, Any
from enum import Enum


class ErrorCode(str, Enum):
    """Stable error codes for engine failures."""
    # Ingest errors (1000-1999)
    INGEST_FILE_NOT_FOUND = "E1001"
    INGEST_INVALID_FORMAT = "E1002"
    INGEST_MISSING_COLUMNS = "E1003"
    INGEST_PERMISSION_DENIED = "E1004"
    INGEST_CORRUPT_DATA = "E1005"
    
    # Graph inference errors (2000-2999)
    GRAPH_INSUFFICIENT_DATA = "E2001"
    GRAPH_COMPUTATION_FAILED = "E2002"
    GRAPH_MEMORY_ERROR = "E2003"
    
    # Incident simulation errors (3000-3999)
    INCIDENT_INVALID_GRAPH = "E3001"
    INCIDENT_SIMULATION_FAILED = "E3002"
    
    # Packet generation errors (4000-4999)
    PACKET_MISSING_PLAYBOOK = "E4001"
    PACKET_GENERATION_FAILED = "E4002"
    
    # General errors (5000-5999)
    CONFIG_INVALID = "E5001"
    CHECKPOINT_CORRUPT = "E5002"
    UNKNOWN_ERROR = "E5999"


class EngineError(Exception):
    """Base exception for all engine errors."""
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'code': self.code.value,
            'message': self.message,
            'details': self.details
        }


class IngestError(EngineError):
    """Error during data ingestion."""
    pass


class GraphError(EngineError):
    """Error during graph inference."""
    pass


class IncidentError(EngineError):
    """Error during incident simulation."""
    pass


class PacketError(EngineError):
    """Error during packet generation."""
    pass


class ConfigError(EngineError):
    """Error in configuration."""
    pass


class CheckpointError(EngineError):
    """Error in checkpoint handling."""
    pass
