"""Static analysis and runtime tests ensuring no SCADA write access.

This module performs two categories of checks:

1. **Static scan** -- every ``.py`` file under ``engine/`` is scanned for
   import or call patterns that could indicate outbound writes to SCADA /
   OT systems (Modbus TCP, DNP3, BACnet, EtherNet/IP, etc.).

2. **Runtime guard** -- the ``assert_read_only()`` function from
   ``safety_guard`` is exercised to verify it raises when write access is
   enabled and passes silently when it is not.
"""
from __future__ import annotations

import ast
import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

import pytest

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from safety_guard import assert_read_only  # noqa: E402


# ---------------------------------------------------------------------------
# Dangerous-pattern definitions
# ---------------------------------------------------------------------------

# Typical SCADA / OT ports
SCADA_PORTS: set[int] = {502, 20000, 44818, 47808}

# Regex patterns that match suspicious call sites.  Each pattern is compiled
# once and reused across every source file.
_DANGEROUS_CALL_PATTERNS: List[re.Pattern] = [
    # socket.connect / socket.send targeting SCADA ports
    re.compile(
        r"""socket\s*\.\s*(?:connect|send)\s*\(.*?(?:"""
        + "|".join(str(p) for p in SCADA_PORTS)
        + r""")""",
        re.DOTALL,
    ),
    # requests.post / httpx.post targeting SCADA ports
    re.compile(
        r"""(?:requests|httpx)\s*\.\s*post\s*\(.*?(?:"""
        + "|".join(str(p) for p in SCADA_PORTS)
        + r""")""",
        re.DOTALL,
    ),
    # urllib.request targeting SCADA ports
    re.compile(
        r"""urllib\.request\s*\..*?(?:"""
        + "|".join(str(p) for p in SCADA_PORTS)
        + r""")""",
        re.DOTALL,
    ),
]

# Import patterns for known SCADA write libraries
_DANGEROUS_IMPORT_PATTERNS: List[re.Pattern] = [
    re.compile(r"""^\s*(?:from|import)\s+pymodbus\.client""", re.MULTILINE),
    re.compile(r"""^\s*(?:from|import)\s+dnp3""", re.MULTILINE),
    re.compile(r"""^\s*(?:from|import)\s+bacnet""", re.MULTILINE),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _collect_python_files(root: Path) -> List[Path]:
    """Return all .py files under *root*, excluding __pycache__."""
    return sorted(
        p
        for p in root.rglob("*.py")
        if "__pycache__" not in str(p)
    )


def _scan_file(path: Path) -> List[Tuple[Path, int, str]]:
    """Scan a single file for dangerous patterns.

    Returns a list of ``(path, line_number, matched_text)`` tuples.
    """
    violations: List[Tuple[Path, int, str]] = []
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return violations

    # Skip this test file itself to avoid false positives from the
    # pattern definitions above.
    if path.resolve() == Path(__file__).resolve():
        return violations

    for pattern in _DANGEROUS_CALL_PATTERNS + _DANGEROUS_IMPORT_PATTERNS:
        for match in pattern.finditer(source):
            # Find the line number of the match
            line_no = source[: match.start()].count("\n") + 1
            violations.append((path, line_no, match.group().strip()[:120]))

    return violations


# ---------------------------------------------------------------------------
# Tests -- static scan
# ---------------------------------------------------------------------------

class TestNoWriteAccess:
    """Static-analysis tests that scan all engine Python files."""

    def test_no_scada_write_patterns_in_engine(self) -> None:
        """No engine source file should contain SCADA write patterns."""
        py_files = _collect_python_files(ENGINE_DIR)
        assert py_files, "Expected to find Python files under engine/"

        all_violations: List[Tuple[Path, int, str]] = []
        for py_file in py_files:
            all_violations.extend(_scan_file(py_file))

        if all_violations:
            report_lines = [
                f"  {path.relative_to(ENGINE_DIR)}:{line}: {text}"
                for path, line, text in all_violations
            ]
            report = "\n".join(report_lines)
            pytest.fail(
                f"Found {len(all_violations)} SCADA write pattern(s) in "
                f"engine source files:\n{report}"
            )

    def test_no_pymodbus_client_import(self) -> None:
        """No engine file should import pymodbus.client."""
        py_files = _collect_python_files(ENGINE_DIR)
        pattern = re.compile(r"""^\s*(?:from|import)\s+pymodbus\.client""", re.MULTILINE)

        for py_file in py_files:
            if py_file.resolve() == Path(__file__).resolve():
                continue
            source = py_file.read_text(encoding="utf-8", errors="replace")
            match = pattern.search(source)
            assert match is None, (
                f"pymodbus.client import found in "
                f"{py_file.relative_to(ENGINE_DIR)}"
            )

    def test_no_dnp3_import(self) -> None:
        """No engine file should import dnp3."""
        py_files = _collect_python_files(ENGINE_DIR)
        pattern = re.compile(r"""^\s*(?:from|import)\s+dnp3""", re.MULTILINE)

        for py_file in py_files:
            if py_file.resolve() == Path(__file__).resolve():
                continue
            source = py_file.read_text(encoding="utf-8", errors="replace")
            match = pattern.search(source)
            assert match is None, (
                f"dnp3 import found in "
                f"{py_file.relative_to(ENGINE_DIR)}"
            )

    def test_no_bacnet_import(self) -> None:
        """No engine file should import bacnet."""
        py_files = _collect_python_files(ENGINE_DIR)
        pattern = re.compile(r"""^\s*(?:from|import)\s+bacnet""", re.MULTILINE)

        for py_file in py_files:
            if py_file.resolve() == Path(__file__).resolve():
                continue
            source = py_file.read_text(encoding="utf-8", errors="replace")
            match = pattern.search(source)
            assert match is None, (
                f"bacnet import found in "
                f"{py_file.relative_to(ENGINE_DIR)}"
            )


# ---------------------------------------------------------------------------
# Tests -- runtime guard
# ---------------------------------------------------------------------------

class TestSafetyGuardRuntime:
    """Runtime tests for the assert_read_only() guard."""

    def test_assert_read_only_raises_when_enabled(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """assert_read_only() must raise RuntimeError when WRITE_ACCESS_ENABLED=true."""
        # Patch the module-level flag directly (env var is read at import time)
        import safety_guard
        monkeypatch.setattr(safety_guard, "WRITE_ACCESS_ENABLED", True)

        with pytest.raises(RuntimeError, match="SAFETY GUARD VIOLATION"):
            safety_guard.assert_read_only()

    def test_assert_read_only_passes_when_disabled(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """assert_read_only() must succeed silently when WRITE_ACCESS_ENABLED=false."""
        import safety_guard
        monkeypatch.setattr(safety_guard, "WRITE_ACCESS_ENABLED", False)

        # Should not raise
        safety_guard.assert_read_only()

    def test_assert_read_only_default_is_false(self) -> None:
        """The default value of WRITE_ACCESS_ENABLED must be False."""
        import safety_guard
        # Unless the env var is explicitly set in the test runner, default
        # should be False.
        if os.environ.get("WRITE_ACCESS_ENABLED", "").lower() != "true":
            assert safety_guard.WRITE_ACCESS_ENABLED is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
