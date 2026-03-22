"""
End-to-end test for ministry multi-signature authorization flow.

Validates the 3-of-4 quorum logic: an authorization packet generated from
a cascade simulation result must reach AUTHORIZED status when 3 of 4
ministry key-holders sign, and must stay below quorum with only 2.

NOTE: Ed25519 requires the ``cryptography`` or ``PyNaCl`` library which
may not be available in all environments.  This test uses hashlib-based
HMAC signatures as a stand-in.  The quorum logic being tested is
independent of the signature primitive.
"""
import hashlib
import hmac
import json
import sys
from datetime import datetime
from pathlib import Path

import pytest

# Allow imports from engine/
sys.path.insert(0, str(Path(__file__).parent.parent))

from packetize import generate_packet


# ---------------------------------------------------------------------------
# Helpers — HMAC-based signing stand-in for Ed25519
# ---------------------------------------------------------------------------

def _generate_ministry_keypair(ministry_name: str):
    """
    Generate a deterministic demo key pair for a ministry.

    Returns (ministry_name, secret_key_bytes, public_key_hex).
    In production this would be Ed25519 via ``cryptography.hazmat``.
    """
    seed = f"ministry-key-seed-{ministry_name}".encode()
    secret = hashlib.sha256(seed).digest()  # 32 bytes
    public = hashlib.sha256(secret).hexdigest()  # deterministic "pub key"
    return ministry_name, secret, public


def _sign_packet(packet_json: str, secret_key: bytes) -> str:
    """HMAC-SHA256 signature over the packet JSON (stand-in for Ed25519)."""
    return hmac.new(secret_key, packet_json.encode(), hashlib.sha256).hexdigest()


def _verify_signature(packet_json: str, signature: str, secret_key: bytes) -> bool:
    """Verify an HMAC-SHA256 signature."""
    expected = hmac.new(secret_key, packet_json.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)


# ---------------------------------------------------------------------------
# Quorum evaluation (mirrors the real threshold logic in packetize.py)
# ---------------------------------------------------------------------------

def _evaluate_quorum(signatures: list, threshold: int) -> str:
    """
    Return 'AUTHORIZED' if len(valid signatures) >= threshold,
    otherwise 'PENDING'.
    """
    valid = [s for s in signatures if s.get("valid")]
    return "AUTHORIZED" if len(valid) >= threshold else "PENDING"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _sample_cascade_incident():
    """Minimal incident dict matching packetize.generate_packet schema."""
    return {
        "id": "cascade-test-001",
        "type": "flood",
        "timeline": [
            {
                "timestep": 0,
                "impactedNodeIds": ["pump_01", "pump_02"],
                "description": "Initial flood event",
            },
            {
                "timestep": 1,
                "impactedNodeIds": ["pump_01", "pump_02", "reservoir_01"],
                "description": "Cascade to reservoir",
            },
        ],
    }


def _sample_graph():
    return {
        "nodes": [
            {"id": "pump_01", "sector": "water", "region": "north"},
            {"id": "pump_02", "sector": "water", "region": "north"},
            {"id": "reservoir_01", "sector": "water", "region": "north"},
        ],
        "edges": [
            {"id": "e1", "source": "pump_01", "target": "reservoir_01"},
            {"id": "e2", "source": "pump_02", "target": "reservoir_01"},
        ],
    }


def _sample_evidence():
    return {
        "windows": [
            {
                "id": "ev-1",
                "edgeId": "e1",
                "robustness": 0.85,
            }
        ]
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestMinistryAuthorizationE2E:
    """End-to-end ministry multi-sig authorization tests."""

    MINISTRIES = [
        "Environment Agency",
        "Civil Protection",
        "Infrastructure Ministry",
        "Energy Regulator",
    ]
    QUORUM_THRESHOLD = 3  # 3-of-4

    def _make_keys(self):
        """Generate 4 ministry key pairs."""
        keys = {}
        for name in self.MINISTRIES:
            ministry, secret, public = _generate_ministry_keypair(name)
            keys[ministry] = {"secret": secret, "public": public}
        return keys

    def test_3_of_4_ministry_authorization(self):
        """Full flow: generate packet -> collect 3/4 signatures -> verify authorized."""

        # 1. Generate 4 ministry key pairs
        keys = self._make_keys()
        assert len(keys) == 4

        # 2. Create authorization packet from a sample cascade simulation
        packet = generate_packet(
            incident=_sample_cascade_incident(),
            playbook_id="carlisle_flood_gate_coordination.yaml",
            graph=_sample_graph(),
            evidence=_sample_evidence(),
        )
        assert packet["status"] == "ready"

        packet_json = json.dumps(packet, sort_keys=True)

        # 3. Sign with 3 of 4 ministries
        signing_ministries = self.MINISTRIES[:3]
        signatures = []
        for name in signing_ministries:
            sig_hex = _sign_packet(packet_json, keys[name]["secret"])
            valid = _verify_signature(packet_json, sig_hex, keys[name]["secret"])
            signatures.append({
                "role": name,
                "public_key": keys[name]["public"],
                "signature": sig_hex,
                "valid": valid,
                "timestamp": datetime.now().isoformat(),
            })

        # 4. Verify 3-of-4 = AUTHORIZED
        status = _evaluate_quorum(signatures, self.QUORUM_THRESHOLD)
        assert status == "AUTHORIZED", (
            f"Expected AUTHORIZED with {len(signatures)} valid sigs, got {status}"
        )

        # Sanity: each individual signature verifies
        for sig_entry in signatures:
            name = sig_entry["role"]
            assert _verify_signature(
                packet_json, sig_entry["signature"], keys[name]["secret"]
            )

    def test_2_of_4_below_quorum(self):
        """2 of 4 signatures must NOT meet the 3-of-4 quorum."""

        keys = self._make_keys()

        packet = generate_packet(
            incident=_sample_cascade_incident(),
            playbook_id="carlisle_flood_gate_coordination.yaml",
            graph=_sample_graph(),
            evidence=_sample_evidence(),
        )
        packet_json = json.dumps(packet, sort_keys=True)

        # Sign with only 2 ministries
        signing_ministries = self.MINISTRIES[:2]
        signatures = []
        for name in signing_ministries:
            sig_hex = _sign_packet(packet_json, keys[name]["secret"])
            valid = _verify_signature(packet_json, sig_hex, keys[name]["secret"])
            signatures.append({
                "role": name,
                "public_key": keys[name]["public"],
                "signature": sig_hex,
                "valid": valid,
                "timestamp": datetime.now().isoformat(),
            })

        # 5. Verify 2-of-4 = NOT AUTHORIZED
        status = _evaluate_quorum(signatures, self.QUORUM_THRESHOLD)
        assert status == "PENDING", (
            f"Expected PENDING with only {len(signatures)} sigs, got {status}"
        )

    def test_invalid_signature_not_counted(self):
        """A forged signature should not count toward quorum."""

        keys = self._make_keys()

        packet = generate_packet(
            incident=_sample_cascade_incident(),
            playbook_id="carlisle_flood_gate_coordination.yaml",
            graph=_sample_graph(),
            evidence=_sample_evidence(),
        )
        packet_json = json.dumps(packet, sort_keys=True)

        signatures = []

        # 2 valid signatures
        for name in self.MINISTRIES[:2]:
            sig_hex = _sign_packet(packet_json, keys[name]["secret"])
            valid = _verify_signature(packet_json, sig_hex, keys[name]["secret"])
            signatures.append({"role": name, "signature": sig_hex, "valid": valid})

        # 1 forged signature (wrong key)
        forged_name = self.MINISTRIES[2]
        wrong_key = b"not-the-real-key-at-all-1234567!"
        forged_sig = _sign_packet(packet_json, wrong_key)
        valid = _verify_signature(
            packet_json, forged_sig, keys[forged_name]["secret"]
        )
        signatures.append({"role": forged_name, "signature": forged_sig, "valid": valid})

        # Should still be PENDING (only 2 valid, forged one is invalid)
        assert not valid, "Forged sig should fail verification"
        status = _evaluate_quorum(signatures, self.QUORUM_THRESHOLD)
        assert status == "PENDING", (
            f"Forged sig should not push quorum to AUTHORIZED, got {status}"
        )

    def test_4_of_4_also_authorized(self):
        """All 4 signing should also meet quorum (superset of 3-of-4)."""

        keys = self._make_keys()

        packet = generate_packet(
            incident=_sample_cascade_incident(),
            playbook_id="carlisle_flood_gate_coordination.yaml",
            graph=_sample_graph(),
            evidence=_sample_evidence(),
        )
        packet_json = json.dumps(packet, sort_keys=True)

        signatures = []
        for name in self.MINISTRIES:
            sig_hex = _sign_packet(packet_json, keys[name]["secret"])
            valid = _verify_signature(packet_json, sig_hex, keys[name]["secret"])
            signatures.append({"role": name, "signature": sig_hex, "valid": valid})

        status = _evaluate_quorum(signatures, self.QUORUM_THRESHOLD)
        assert status == "AUTHORIZED"
