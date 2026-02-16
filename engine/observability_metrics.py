"""
Observability Metrics Collection

Collects metrics for Prometheus export and monitoring dashboards.
"""
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from collections import defaultdict
import time


@dataclass
class Metric:
    """A single metric data point."""
    name: str
    value: float
    labels: Dict[str, str]
    timestamp: float
    metric_type: str  # 'counter', 'gauge', 'histogram', 'summary'


class MetricsCollector:
    """Collects and stores metrics for observability."""
    
    def __init__(self):
        self.metrics: List[Metric] = []
        self.counters: Dict[str, float] = defaultdict(float)
        self.gauges: Dict[str, float] = {}
        self.histograms: Dict[str, List[float]] = defaultdict(list)
    
    def increment_counter(
        self,
        name: str,
        labels: Optional[Dict[str, str]] = None,
        value: float = 1.0
    ):
        """Increment a counter metric."""
        label_key = self._make_label_key(name, labels or {})
        self.counters[label_key] += value
        
        self.metrics.append(Metric(
            name=name,
            value=self.counters[label_key],
            labels=labels or {},
            timestamp=time.time(),
            metric_type='counter'
        ))
    
    def set_gauge(
        self,
        name: str,
        value: float,
        labels: Optional[Dict[str, str]] = None
    ):
        """Set a gauge metric."""
        label_key = self._make_label_key(name, labels or {})
        self.gauges[label_key] = value
        
        self.metrics.append(Metric(
            name=name,
            value=value,
            labels=labels or {},
            timestamp=time.time(),
            metric_type='gauge'
        ))
    
    def observe_histogram(
        self,
        name: str,
        value: float,
        labels: Optional[Dict[str, str]] = None
    ):
        """Observe a histogram value."""
        label_key = self._make_label_key(name, labels or {})
        self.histograms[label_key].append(value)
        
        self.metrics.append(Metric(
            name=name,
            value=value,
            labels=labels or {},
            timestamp=time.time(),
            metric_type='histogram'
        ))
    
    def _make_label_key(self, name: str, labels: Dict[str, str]) -> str:
        """Create a key from metric name and labels."""
        label_str = ','.join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}" if label_str else name
    
    def export_prometheus_format(self) -> str:
        """Export metrics in Prometheus text format."""
        lines = []
        
        # Export counters
        for label_key, value in self.counters.items():
            lines.append(f"# TYPE {label_key.split('{')[0]} counter")
            lines.append(f"{label_key} {value}")
        
        # Export gauges
        for label_key, value in self.gauges.items():
            lines.append(f"# TYPE {label_key.split('{')[0]} gauge")
            lines.append(f"{label_key} {value}")
        
        # Export histograms (simplified - would compute buckets in production)
        for label_key, values in self.histograms.items():
            if values:
                lines.append(f"# TYPE {label_key.split('{')[0]} histogram")
                lines.append(f"{label_key}_sum {sum(values)}")
                lines.append(f"{label_key}_count {len(values)}")
        
        return '\n'.join(lines)
    
    def get_metrics_summary(self) -> Dict:
        """Get summary of collected metrics."""
        return {
            'total_metrics': len(self.metrics),
            'counters': len(self.counters),
            'gauges': len(self.gauges),
            'histograms': len(self.histograms),
            'last_metric_time': max((m.timestamp for m in self.metrics), default=0)
        }


# Global metrics collector instance
_metrics_collector = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """Get global metrics collector instance."""
    return _metrics_collector
