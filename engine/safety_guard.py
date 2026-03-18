"""Read-only enforcement guard for Munin v1.

Munin v1 is strictly read-only: it ingests SCADA historian data, infers
dependency graphs, and generates advisory packets.  It must NEVER issue
write commands (Modbus writes, DNP3 controls, BACnet commands, etc.) to
operational technology networks.

This module provides a single assertion that must be called at every
pipeline entry point (run.py main(), cli.py demo, etc.).  If the
environment variable WRITE_ACCESS_ENABLED is set to "true", the guard
raises a RuntimeError so the pipeline cannot proceed.

The variable exists solely so that red-team / CI tests can verify the
guard fires correctly.  In production it must never be set.
"""
from __future__ import annotations

import os
from typing import Optional

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

WRITE_ACCESS_ENABLED: bool = (
    os.environ.get("WRITE_ACCESS_ENABLED", "false").lower() == "true"
)


# ---------------------------------------------------------------------------
# Guard function
# ---------------------------------------------------------------------------

def assert_read_only(*, logger: Optional[object] = None) -> None:
    """Raise RuntimeError if write access is enabled.

    Call this at the start of every pipeline entry point to ensure the
    engine never runs in a mode that could issue SCADA write commands.

    Args:
        logger: Optional StructuredLogger instance.  When provided the
                guard logs the check result via ``log_warning`` (fail) or
                ``log_debug`` (pass).

    Raises:
        RuntimeError: If ``WRITE_ACCESS_ENABLED`` is ``True``.
    """
    if WRITE_ACCESS_ENABLED:
        msg = (
            "SAFETY GUARD VIOLATION: WRITE_ACCESS_ENABLED is set to true. "
            "Munin v1 is read-only and must not have write access to OT "
            "networks.  Aborting pipeline."
        )
        if logger is not None:
            try:
                logger.log_warning("safety_guard", msg)
            except Exception:
                pass  # Never let logging break the guard
        raise RuntimeError(msg)

    # Log successful check when a logger is available
    if logger is not None:
        try:
            logger.log_debug(
                "safety_guard",
                "Read-only safety guard passed: WRITE_ACCESS_ENABLED is false",
            )
        except Exception:
            pass
