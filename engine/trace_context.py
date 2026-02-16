"""
Distributed Tracing Context

Manages trace IDs and correlation IDs for distributed tracing.
"""
import uuid
from typing import Optional, Dict
from contextvars import ContextVar
from datetime import datetime


# Context variables for trace and correlation IDs
_trace_id: ContextVar[Optional[str]] = ContextVar('trace_id', default=None)
_correlation_id: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)
_parent_span_id: ContextVar[Optional[str]] = ContextVar('parent_span_id', default=None)


class TraceContext:
    """Manages distributed tracing context."""
    
    @staticmethod
    def generate_trace_id() -> str:
        """Generate a new trace ID."""
        return str(uuid.uuid4())
    
    @staticmethod
    def generate_span_id() -> str:
        """Generate a new span ID."""
        return str(uuid.uuid4())[:16]
    
    @staticmethod
    def set_trace_id(trace_id: str):
        """Set trace ID in current context."""
        _trace_id.set(trace_id)
    
    @staticmethod
    def get_trace_id() -> Optional[str]:
        """Get trace ID from current context."""
        return _trace_id.get()
    
    @staticmethod
    def set_correlation_id(correlation_id: str):
        """Set correlation ID in current context."""
        _correlation_id.set(correlation_id)
    
    @staticmethod
    def get_correlation_id() -> Optional[str]:
        """Get correlation ID from current context."""
        return _correlation_id.get()
    
    @staticmethod
    def set_parent_span_id(span_id: str):
        """Set parent span ID in current context."""
        _parent_span_id.set(span_id)
    
    @staticmethod
    def get_parent_span_id() -> Optional[str]:
        """Get parent span ID from current context."""
        return _parent_span_id.get()
    
    @staticmethod
    def create_span(
        operation_name: str,
        parent_trace_id: Optional[str] = None,
        parent_span_id: Optional[str] = None
    ) -> Dict:
        """Create a new span."""
        trace_id = parent_trace_id or TraceContext.generate_trace_id()
        span_id = TraceContext.generate_span_id()
        
        TraceContext.set_trace_id(trace_id)
        TraceContext.set_parent_span_id(parent_span_id or span_id)
        
        return {
            'trace_id': trace_id,
            'span_id': span_id,
            'parent_span_id': parent_span_id,
            'operation_name': operation_name,
            'start_time': datetime.now().isoformat()
        }
    
    @staticmethod
    def get_current_context() -> Dict:
        """Get current tracing context."""
        return {
            'trace_id': TraceContext.get_trace_id(),
            'correlation_id': TraceContext.get_correlation_id(),
            'parent_span_id': TraceContext.get_parent_span_id()
        }
