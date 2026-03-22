"""
Shamir Secret Sharing — threshold reconstruction tests.

Verifies the core cryptographic invariant: any k shares reconstruct the
secret correctly, and fewer than k shares do NOT.

These tests exercise the GF(2^8) implementation directly rather than
relying on the self-test in shamir_split.py, giving us pytest-integrated
coverage and property-style edge-case checks.
"""
from __future__ import annotations

import itertools
import os
import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from shamir_split import (
    gf_add,
    gf_inv,
    gf_mul,
    reconstruct_secret,
    split_secret,
)


# ---------------------------------------------------------------------------
# GF(256) arithmetic sanity
# ---------------------------------------------------------------------------

class TestGF256Arithmetic:
    """Basic field axiom checks — if these fail, nothing else matters."""

    def test_additive_identity(self) -> None:
        for a in range(256):
            assert gf_add(a, 0) == a

    def test_additive_self_inverse(self) -> None:
        """In GF(2^n), every element is its own additive inverse."""
        for a in range(256):
            assert gf_add(a, a) == 0

    def test_multiplicative_identity(self) -> None:
        for a in range(256):
            assert gf_mul(a, 1) == a

    def test_multiplicative_inverse(self) -> None:
        """Every nonzero element has a multiplicative inverse."""
        for a in range(1, 256):
            assert gf_mul(a, gf_inv(a)) == 1

    def test_zero_has_no_inverse(self) -> None:
        with pytest.raises(ZeroDivisionError):
            gf_inv(0)


# ---------------------------------------------------------------------------
# Split / reconstruct — core threshold invariant
# ---------------------------------------------------------------------------

class TestShamirThreshold:
    """The critical property: k shares suffice, k-1 do not."""

    def test_reconstruct_with_exactly_k_shares(self) -> None:
        secret = b"MUNIN-SOVEREIGN-KEY"
        n, k = 5, 3
        shares = split_secret(secret, n, k)

        # Every possible k-subset must reconstruct correctly
        for subset in itertools.combinations(shares, k):
            recovered = reconstruct_secret(list(subset))
            assert recovered == secret, (
                f"Failed to reconstruct from shares "
                f"{[s[0] for s in subset]}"
            )

    def test_reconstruct_with_all_shares(self) -> None:
        secret = b"full-share-set"
        shares = split_secret(secret, 5, 3)
        assert reconstruct_secret(shares) == secret

    def test_fewer_than_k_shares_fail(self) -> None:
        """k-1 shares must NOT reconstruct the original secret.

        This is a statistical guarantee — for a multi-byte secret it is
        astronomically unlikely that k-1 shares yield the correct result.
        """
        secret = b"DO-NOT-RECOVER-WITH-TOO-FEW"
        n, k = 5, 3
        shares = split_secret(secret, n, k)

        for subset in itertools.combinations(shares, k - 1):
            bad = reconstruct_secret(list(subset))
            # With 27 bytes of secret, collision probability is ~2^(-216)
            assert bad != secret, (
                "k-1 shares reconstructed correctly — should be impossible"
            )

    def test_single_byte_secret(self) -> None:
        secret = b"\xAB"
        shares = split_secret(secret, 3, 2)
        assert reconstruct_secret(shares[:2]) == secret

    def test_large_random_secret(self) -> None:
        """256-byte random secret with (10, 5) threshold."""
        secret = os.urandom(256)
        shares = split_secret(secret, 10, 5)
        # Use a non-trivial subset
        subset = [shares[1], shares[3], shares[5], shares[7], shares[9]]
        assert reconstruct_secret(subset) == secret

    def test_maximum_n_255(self) -> None:
        """n=255 is the field limit — verify it works."""
        secret = b"max-n"
        shares = split_secret(secret, 255, 2)
        assert len(shares) == 255
        # Reconstruct from two distant shares
        assert reconstruct_secret([shares[0], shares[254]]) == secret


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------

class TestShamirValidation:
    """Edge cases and error handling."""

    def test_empty_secret_raises(self) -> None:
        with pytest.raises(ValueError, match="non-empty"):
            split_secret(b"", 3, 2)

    def test_k_greater_than_n_raises(self) -> None:
        with pytest.raises(ValueError):
            split_secret(b"x", 2, 3)

    def test_k_less_than_2_raises(self) -> None:
        with pytest.raises(ValueError):
            split_secret(b"x", 3, 1)

    def test_n_greater_than_255_raises(self) -> None:
        with pytest.raises(ValueError):
            split_secret(b"x", 256, 2)

    def test_reconstruct_needs_at_least_2_shares(self) -> None:
        shares = split_secret(b"x", 3, 2)
        with pytest.raises(ValueError, match="at least 2"):
            reconstruct_secret([shares[0]])

    def test_mismatched_share_lengths_raise(self) -> None:
        shares_a = split_secret(b"short", 3, 2)
        shares_b = split_secret(b"longer-secret", 3, 2)
        with pytest.raises(ValueError, match="same length"):
            reconstruct_secret([shares_a[0], shares_b[1]])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
