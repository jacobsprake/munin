"""
ML model audit trail — full lineage tracking with hash-chain integrity.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class _AuditEntry:
    """A single entry in the audit trail."""

    event_type: str
    model_name: str
    version: str
    payload: Dict[str, Any]
    timestamp: float
    previous_hash: str
    entry_hash: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_type": self.event_type,
            "model_name": self.model_name,
            "version": self.version,
            "payload": self.payload,
            "timestamp": self.timestamp,
            "previous_hash": self.previous_hash,
            "entry_hash": self.entry_hash,
        }


class MLAuditTrail:
    """
    Append-only audit trail for ML models with hash-chain integrity.

    Every entry records the SHA-256 hash of the previous entry, forming
    a tamper-evident chain.
    """

    GENESIS_HASH = "0" * 64

    def __init__(self, storage_path: Path | str) -> None:
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self._entries: List[_AuditEntry] = []
        self._load_existing()

    # ------------------------------------------------------------------
    # Logging methods
    # ------------------------------------------------------------------

    def log_training(
        self,
        model_name: str,
        version: str,
        config: Dict[str, Any],
        data_sources: List[str],
        metrics: Dict[str, float],
    ) -> _AuditEntry:
        """Append a training event to the audit trail."""
        payload = {
            "config": config,
            "data_sources": data_sources,
            "metrics": metrics,
        }
        return self._append("training", model_name, version, payload)

    def log_prediction(
        self,
        model_name: str,
        version: str,
        input_hash: str,
        prediction: Any,
        confidence: float,
    ) -> _AuditEntry:
        """Append a prediction event."""
        payload = {
            "input_hash": input_hash,
            "prediction": self._serialisable(prediction),
            "confidence": confidence,
        }
        return self._append("prediction", model_name, version, payload)

    def log_revalidation(
        self,
        model_name: str,
        version: str,
        report: Dict[str, Any],
    ) -> _AuditEntry:
        """Append a revalidation event."""
        return self._append("revalidation", model_name, version, {"report": report})

    def log_promotion(
        self,
        model_name: str,
        old_version: str,
        new_version: str,
        reason: str,
    ) -> _AuditEntry:
        """Append a model-promotion event."""
        payload = {
            "old_version": old_version,
            "new_version": new_version,
            "reason": reason,
        }
        return self._append("promotion", model_name, new_version, payload)

    # ------------------------------------------------------------------
    # Query methods
    # ------------------------------------------------------------------

    def get_lineage(self, model_name: str) -> List[Dict[str, Any]]:
        """Return the full history for a given model."""
        return [
            e.to_dict()
            for e in self._entries
            if e.model_name == model_name
        ]

    def verify_chain(self) -> bool:
        """
        Verify hash-chain integrity.

        Each entry's previous_hash must equal the entry_hash of the
        preceding entry.  Returns True if the chain is valid.
        """
        if not self._entries:
            return True

        if self._entries[0].previous_hash != self.GENESIS_HASH:
            logger.error("First entry has invalid previous_hash.")
            return False

        for i in range(1, len(self._entries)):
            expected = self._entries[i - 1].entry_hash
            actual = self._entries[i].previous_hash
            if actual != expected:
                logger.error(
                    "Chain broken at index %d: expected previous_hash=%s, got=%s",
                    i, expected, actual,
                )
                return False

        # Also verify each entry's own hash
        for i, entry in enumerate(self._entries):
            recomputed = self._compute_hash(entry)
            if recomputed != entry.entry_hash:
                logger.error(
                    "Entry %d hash mismatch: stored=%s, recomputed=%s",
                    i, entry.entry_hash, recomputed,
                )
                return False

        return True

    def export(self, format: str = "jsonl") -> str:
        """
        Export the full trail for compliance.

        Args:
            format: 'jsonl' (one JSON object per line) or 'json' (array).

        Returns:
            The serialised string.
        """
        if format == "jsonl":
            return "\n".join(
                json.dumps(e.to_dict(), default=str) for e in self._entries
            )
        elif format == "json":
            return json.dumps(
                [e.to_dict() for e in self._entries], indent=2, default=str
            )
        else:
            raise ValueError(f"Unknown format '{format}'. Use 'jsonl' or 'json'.")

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _append(
        self,
        event_type: str,
        model_name: str,
        version: str,
        payload: Dict[str, Any],
    ) -> _AuditEntry:
        previous_hash = (
            self._entries[-1].entry_hash if self._entries else self.GENESIS_HASH
        )
        entry = _AuditEntry(
            event_type=event_type,
            model_name=model_name,
            version=version,
            payload=payload,
            timestamp=time.time(),
            previous_hash=previous_hash,
            entry_hash="",  # placeholder
        )
        entry.entry_hash = self._compute_hash(entry)
        self._entries.append(entry)
        self._persist_entry(entry)
        return entry

    @staticmethod
    def _compute_hash(entry: _AuditEntry) -> str:
        """SHA-256 of the entry's content (excluding entry_hash itself)."""
        content = json.dumps(
            {
                "event_type": entry.event_type,
                "model_name": entry.model_name,
                "version": entry.version,
                "payload": entry.payload,
                "timestamp": entry.timestamp,
                "previous_hash": entry.previous_hash,
            },
            sort_keys=True,
            default=str,
        )
        return hashlib.sha256(content.encode()).hexdigest()

    def _persist_entry(self, entry: _AuditEntry) -> None:
        """Append one entry to the on-disk JSONL file."""
        trail_file = self.storage_path / "audit_trail.jsonl"
        with trail_file.open("a") as f:
            f.write(json.dumps(entry.to_dict(), default=str) + "\n")

    def _load_existing(self) -> None:
        """Load entries from disk if the trail file exists."""
        trail_file = self.storage_path / "audit_trail.jsonl"
        if not trail_file.exists():
            return
        for line in trail_file.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            data = json.loads(line)
            entry = _AuditEntry(
                event_type=data["event_type"],
                model_name=data["model_name"],
                version=data["version"],
                payload=data["payload"],
                timestamp=data["timestamp"],
                previous_hash=data["previous_hash"],
                entry_hash=data["entry_hash"],
            )
            self._entries.append(entry)
        logger.info("Loaded %d existing audit entries from %s", len(self._entries), trail_file)

    @staticmethod
    def _serialisable(obj: Any) -> Any:
        """Best-effort conversion to JSON-serialisable form."""
        if hasattr(obj, "tolist"):
            return obj.tolist()
        if hasattr(obj, "item"):
            return obj.item()
        return obj
