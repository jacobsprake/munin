# Zero-Knowledge Range Proof — Proof of Concept

## Concept

A **zero-knowledge range proof** allows a prover to convince a verifier that
a secret value lies within a public interval `[min, max]` without revealing
the exact value.

In the Munin context this is useful for privacy-preserving sensor
attestation: an operator can prove that a reservoir level, pressure reading,
or temperature is within safe bounds without exposing the precise
measurement to third parties (regulators, auditors, partner utilities).

## How It Works

1. **Pedersen Commitment** — The prover commits to the value `v` using
   `C = g^v * h^r (mod p)` where `r` is a random blinding factor.  The
   commitment is binding (the prover cannot change `v` later) and hiding
   (the verifier cannot extract `v` from `C`).

2. **Range Decomposition** — The prover also commits to
   `v - v_min` (>= 0) and `v_max - v` (>= 0), proving both are
   non-negative.

3. **Sigma Protocol + Fiat-Shamir** — The proof uses a standard
   Sigma-protocol structure converted to non-interactive form via the
   Fiat-Shamir heuristic (hashing commitments to derive the challenge).

## Running the Demo

```bash
# No dependencies beyond Python 3.8+
python3 zk_range_proof.py
```

### Example Output

```
Scenario: Water reservoir level monitoring
  Allowed range   : 2.00 m  to  12.00 m
  Actual level    : 7.43 m  (SECRET — not revealed to verifier)

[Prover] Generating range proof...
  Commitment (C)  : 0x...
  Public range    : [2.00 m, 12.00 m]
  Actual value    : NOT included in proof

[Verifier] Verifying range proof...
  Result          : VALID
  Verifier learns : Level is within [2.00 m, 12.00 m]
  Verifier does NOT learn the exact level.
```

## Limitations

This implementation is a **proof of concept** with toy-sized parameters.
It is NOT suitable for production use.

For production, use one of:

- **Bulletproofs** (no trusted setup, logarithmic proof size)
- **circom + snarkjs** (Groth16 or PLONK; constant-size proofs)
- **Halo 2** (recursive proofs without trusted setup)

## Further Reading

- Pedersen commitments: Pedersen, "Non-Interactive and Information-Theoretic
  Secure Verifiable Secret Sharing" (CRYPTO 1991)
- Bulletproofs: Bunz et al., "Bulletproofs: Short Proofs for Confidential
  Transactions and More" (S&P 2018)
- circom/snarkjs: <https://github.com/iden3/circom>
