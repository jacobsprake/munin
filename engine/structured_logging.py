"""Structured JSON logging for the engine pipeline."""
import json
import time
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
from enum import Enum


class LogLevel(Enum):
    """Log levels."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


class StructuredLogger:
    """Structured JSON logger for engine pipeline."""
    
    def __init__(self, log_file: Path, run_id: str):
        """Initialize logger."""
        self.log_file = log_file
        self.run_id = run_id
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        self.phase_start_times: Dict[str, float] = {}
    
    def _write_log(self, level: LogLevel, phase: str, message: str, data: Dict[str, Any] = None):
        """Write structured log entry."""
        entry = {
            'timestamp': datetime.now().isoformat(),
            'run_id': self.run_id,
            'level': level.value,
            'phase': phase,
            'message': message,
            'data': data or {}
        }
        
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(entry) + '\n')
    
    def start_phase(self, phase: str, data: Dict[str, Any] = None):
        """Log phase start."""
        self.phase_start_times[phase] = time.time()
        self._write_log(LogLevel.INFO, phase, f"Phase started: {phase}", data)
    
    def end_phase(self, phase: str, metrics: Dict[str, Any] = None):
        """Log phase end with duration."""
        start_time = self.phase_start_times.get(phase)
        duration = time.time() - start_time if start_time else None
        
        phase_data = {'duration_seconds': duration}
        if metrics:
            phase_data.update(metrics)
        
        self._write_log(LogLevel.INFO, phase, f"Phase completed: {phase}", phase_data)
    
    def log_metric(self, phase: str, metric_name: str, value: Any):
        """Log a metric."""
        self._write_log(LogLevel.INFO, phase, f"Metric: {metric_name}", {metric_name: value})
    
    def log_error(self, phase: str, message: str, error: Exception = None):
        """Log an error."""
        error_data = {'error_message': message}
        if error:
            error_data['error_type'] = type(error).__name__
            error_data['error_details'] = str(error)
        self._write_log(LogLevel.ERROR, phase, message, error_data)
    
    def log_warning(self, phase: str, message: str, data: Dict[str, Any] = None):
        """Log a warning."""
        self._write_log(LogLevel.WARNING, phase, message, data)
    
    def log_debug(self, phase: str, message: str, data: Dict[str, Any] = None):
        """Log debug information."""
        self._write_log(LogLevel.DEBUG, phase, message, data)


def get_logger(run_id: str, output_dir: Path) -> StructuredLogger:
    """Get structured logger instance."""
    log_file = output_dir / "engine_log.jsonl"
    return StructuredLogger(log_file, run_id)
