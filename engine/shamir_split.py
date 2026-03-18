#!/usr/bin/env python3
"""
Shamir's Secret Sharing over GF(2^8)
=====================================

Pure-Python implementation of (k, n) threshold secret sharing using
Shamir's scheme in the Galois field GF(256).  No external dependencies.

  split_secret(secret, n, k) -> list of (index, share_bytes) tuples
  reconstruct_secret(shares)  -> bytes

Each byte of the secret is split independently: a random polynomial of
degree (k-1) is sampled with the secret byte as the constant term, and
shares are evaluations of that polynomial at distinct nonzero points in
GF(256).  Reconstruction uses Lagrange interpolation at x = 0.
"""

from __future__ import annotations

import os
import sys
from typing import List, Tuple

# ---------------------------------------------------------------------------
# GF(2^8) arithmetic  (irreducible polynomial: x^8 + x^4 + x^3 + x + 1)
# This is the same field used by AES (Rijndael).
# ---------------------------------------------------------------------------

_GF_EXP: List[int] = [0] * 512   # anti-log table
_GF_LOG: List[int] = [0] * 256   # log table

def _init_gf_tables() -> None:
    """Pre-compute log / exp tables for GF(256).

    Uses generator g=3 which is a primitive element for the AES
    irreducible polynomial x^8 + x^4 + x^3 + x + 1  (0x11B).
    """
    x = 1
    for i in range(255):
        _GF_EXP[i] = x
        _GF_LOG[x] = i
        # Multiply x by generator 3 (= x + 1 in polynomial representation)
        # using carry-less multiplication: x * 3 = x * (2 + 1) = (x<<1) ^ x
        x = ((x << 1) ^ x)
        if x & 0x100:
            x ^= 0x11B
        x &= 0xFF
    # Extend exp table for easy modular access
    for i in range(255, 512):
        _GF_EXP[i] = _GF_EXP[i - 255]

_init_gf_tables()


def gf_add(a: int, b: int) -> int:
    """Add two GF(256) elements (XOR)."""
    return a ^ b


def gf_mul(a: int, b: int) -> int:
    """Multiply two GF(256) elements using log/exp tables."""
    if a == 0 or b == 0:
        return 0
    return _GF_EXP[_GF_LOG[a] + _GF_LOG[b]]


def gf_inv(a: int) -> int:
    """Multiplicative inverse in GF(256).  Raises if a == 0."""
    if a == 0:
        raise ZeroDivisionError("No inverse for 0 in GF(256)")
    return _GF_EXP[255 - _GF_LOG[a]]


def gf_div(a: int, b: int) -> int:
    """Divide a by b in GF(256)."""
    if b == 0:
        raise ZeroDivisionError("Division by zero in GF(256)")
    if a == 0:
        return 0
    return _GF_EXP[(_GF_LOG[a] - _GF_LOG[b]) % 255]


# ---------------------------------------------------------------------------
# Polynomial helpers (coefficients in GF(256))
# ---------------------------------------------------------------------------

def _eval_poly(coeffs: List[int], x: int) -> int:
    """Evaluate polynomial at point x using Horner's method in GF(256).
    coeffs[0] is the constant term (the secret byte)."""
    # Horner evaluation: start from highest degree coefficient
    result = 0
    for c in reversed(coeffs):
        result = gf_add(gf_mul(result, x), c)
    return result


def _lagrange_interpolate(shares: List[Tuple[int, int]]) -> int:
    """Lagrange interpolation at x = 0 in GF(256).
    shares: list of (x_i, y_i) pairs."""
    k = len(shares)
    secret = 0
    for i in range(k):
        xi, yi = shares[i]
        num = 1
        den = 1
        for j in range(k):
            if i == j:
                continue
            xj = shares[j][0]
            num = gf_mul(num, xj)           # x_j  (since we evaluate at 0)
            den = gf_mul(den, gf_add(xj, xi))  # x_j - x_i  (add == sub in GF(2^n))
        lagrange = gf_mul(yi, gf_div(num, den))
        secret = gf_add(secret, lagrange)
    return secret


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def split_secret(secret: bytes, n: int, k: int) -> List[Tuple[int, bytes]]:
    """Split *secret* into *n* shares such that any *k* can reconstruct it.

    Parameters
    ----------
    secret : bytes
        The secret to protect.
    n : int
        Total number of shares to generate (2 <= n <= 255).
    k : int
        Minimum shares required for reconstruction (2 <= k <= n).

    Returns
    -------
    list of (index, share_bytes)
        Each index is in 1..n (nonzero GF(256) element).  share_bytes has
        the same length as *secret*.
    """
    if not (2 <= k <= n <= 255):
        raise ValueError(f"Need 2 <= k <= n <= 255, got k={k}, n={n}")
    if len(secret) == 0:
        raise ValueError("Secret must be non-empty")

    shares: List[List[int]] = [[] for _ in range(n)]

    for byte_val in secret:
        # Random polynomial of degree k-1 with constant term = byte_val
        coeffs = [byte_val] + [int.from_bytes(os.urandom(1), 'big') for _ in range(k - 1)]
        for i in range(n):
            x = i + 1  # evaluation points 1..n
            shares[i].append(_eval_poly(coeffs, x))

    return [(i + 1, bytes(shares[i])) for i in range(n)]


def reconstruct_secret(shares: List[Tuple[int, bytes]]) -> bytes:
    """Reconstruct the secret from *k* or more shares.

    Parameters
    ----------
    shares : list of (index, share_bytes)
        At least *k* shares produced by :func:`split_secret`.

    Returns
    -------
    bytes
        The reconstructed secret.
    """
    if len(shares) < 2:
        raise ValueError("Need at least 2 shares to reconstruct")

    share_len = len(shares[0][1])
    if any(len(s[1]) != share_len for s in shares):
        raise ValueError("All shares must have the same length")

    result = bytearray(share_len)
    for byte_idx in range(share_len):
        points = [(s[0], s[1][byte_idx]) for s in shares]
        result[byte_idx] = _lagrange_interpolate(points)

    return bytes(result)


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json

    print("=" * 60)
    print("Shamir Secret Sharing over GF(256) — Self-Test")
    print("=" * 60)

    # --- GF(256) arithmetic sanity ---
    assert gf_mul(0, 53) == 0, "multiply by zero"
    assert gf_mul(1, 53) == 53, "multiply by one"
    for a in range(1, 256):
        assert gf_mul(a, gf_inv(a)) == 1, f"inverse failed for {a}"
    print("[PASS] GF(256) arithmetic")

    # --- Basic split / reconstruct ---
    secret = b"MUNIN-MASTER-KEY-2026"
    n, k = 5, 3
    shares = split_secret(secret, n, k)
    assert len(shares) == n
    print(f"[INFO] Split {len(secret)}-byte secret into {n} shares (threshold={k})")

    # Reconstruct with exactly k shares (first k)
    recovered = reconstruct_secret(shares[:k])
    assert recovered == secret, "reconstruction with first k shares failed"
    print("[PASS] Reconstruct with first k shares")

    # Reconstruct with different k-subset
    recovered2 = reconstruct_secret([shares[0], shares[2], shares[4]])
    assert recovered2 == secret, "reconstruction with alternate subset failed"
    print("[PASS] Reconstruct with alternate subset")

    # Reconstruct with all shares
    recovered3 = reconstruct_secret(shares)
    assert recovered3 == secret, "reconstruction with all shares failed"
    print("[PASS] Reconstruct with all shares")

    # Insufficient shares should produce wrong result
    try:
        bad = reconstruct_secret(shares[:k - 1])
        # With only k-1 shares the result is almost certainly wrong
        if bad == secret:
            print("[WARN] Got lucky with k-1 shares (astronomically unlikely)")
        else:
            print("[PASS] k-1 shares produce incorrect result (as expected)")
    except Exception:
        print("[PASS] k-1 shares raised exception (acceptable)")

    # --- Edge cases ---
    one_byte = split_secret(b"\x42", 3, 2)
    assert reconstruct_secret(one_byte[:2]) == b"\x42"
    print("[PASS] Single-byte secret")

    big = os.urandom(256)
    big_shares = split_secret(big, 10, 5)
    assert reconstruct_secret(big_shares[:5]) == big
    print("[PASS] 256-byte random secret (10,5)")

    print()
    print("All tests passed.")
    print()

    # --- Demo output ---
    print("Demo share listing (hex):")
    for idx, share_data in shares:
        print(f"  Share {idx}: {share_data.hex()}")
