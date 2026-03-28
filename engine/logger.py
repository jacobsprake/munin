"""
Munin structured logger.

Wraps Python's logging module with JSON-structured output for production
and human-readable output for CLI/demo use.

Usage:
    from engine.logger import get_logger
    log = get_logger(__name__)
    log.info("Shadow link discovered", source="sensor_a", target="sensor_b", confidence=0.97)
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone


class StructuredFormatter(logging.Formatter):
    """JSON-lines formatter for production/machine-readable output."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if hasattr(record, "structured"):
            entry.update(record.structured)
        if record.exc_info and record.exc_info[0]:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry)


class CLIFormatter(logging.Formatter):
    """Human-readable formatter matching existing Munin CLI style."""

    LEVEL_TAGS = {
        "DEBUG": "[DEBUG]",
        "INFO": "[INFO]",
        "WARNING": "[WARN]",
        "ERROR": "[ERROR]",
        "CRITICAL": "[CRITICAL]",
    }

    def format(self, record: logging.LogRecord) -> str:
        tag = self.LEVEL_TAGS.get(record.levelname, f"[{record.levelname}]")
        msg = record.getMessage()
        extra = ""
        if hasattr(record, "structured") and record.structured:
            pairs = " ".join(f"{k}={v}" for k, v in record.structured.items())
            extra = f" ({pairs})"
        return f"{tag} {msg}{extra}"


class StructuredLoggerAdapter(logging.LoggerAdapter):
    """Logger adapter that passes keyword arguments as structured data."""

    def process(self, msg: str, kwargs: dict) -> tuple:
        structured = {k: v for k, v in kwargs.pop("extra", {}).items()
                      if k != "structured"}
        # Pull structured fields from kwargs (not standard logging kwargs)
        log_kwargs = {}
        structured_fields = {}
        for k, v in list(kwargs.items()):
            if k in ("exc_info", "stack_info", "stacklevel"):
                log_kwargs[k] = v
            else:
                structured_fields[k] = v
        log_kwargs["extra"] = {"structured": {**structured, **structured_fields}}
        return msg, log_kwargs


def get_logger(name: str) -> StructuredLoggerAdapter:
    """Get a structured logger.

    Output format is controlled by MUNIN_LOG_FORMAT env var:
    - "json" : JSON-lines (for production, log aggregation)
    - "cli"  : human-readable (default, for terminal use)

    Log level is controlled by MUNIN_LOG_LEVEL env var (default: INFO).
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stderr)
        fmt = os.environ.get("MUNIN_LOG_FORMAT", "cli").lower()
        if fmt == "json":
            handler.setFormatter(StructuredFormatter())
        else:
            handler.setFormatter(CLIFormatter())
        logger.addHandler(handler)
        level = os.environ.get("MUNIN_LOG_LEVEL", "INFO").upper()
        logger.setLevel(getattr(logging, level, logging.INFO))

    return StructuredLoggerAdapter(logger, {})
