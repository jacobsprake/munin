#!/usr/bin/env bash
# ============================================================================
# Munin — Offline Key Ceremony
# ============================================================================
#
# OFFLINE CEREMONY — This script MUST be run on an air-gapped machine with
# NO network connectivity.  Disconnect Ethernet, disable Wi-Fi, and verify
# with `ip link` / `ifconfig` before proceeding.
#
# Purpose:
#   1. Generate a classical Ed25519 master signing key pair.
#   2. Generate an ML-DSA placeholder key pair (Ed25519 stand-in for demo;
#      replace with actual ML-DSA-65 via liboqs in production).
#   3. Split the combined master private key into N Shamir shares using
#      engine/shamir_split.py (threshold k-of-n).
#   4. Produce a ceremony transcript (JSON) and individual share files.
#
# Usage:
#   ./scripts/key_ceremony.sh [--shares N] [--threshold K] [--output-dir DIR]
#
# Defaults: N=5, K=3, output in ./ceremony-output/
# ============================================================================

set -euo pipefail

# ----------------------------- configuration ---------------------------------

SHARES=5
THRESHOLD=3
OUTPUT_DIR="./ceremony-output"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SHAMIR_PY="${PROJECT_ROOT}/engine/shamir_split.py"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --shares)    SHARES="$2";    shift 2 ;;
    --threshold) THRESHOLD="$2"; shift 2 ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--shares N] [--threshold K] [--output-dir DIR]"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ----------------------------- pre-flight checks -----------------------------

echo "========================================"
echo "  MUNIN OFFLINE KEY CEREMONY"
echo "========================================"
echo ""
echo "  IMPORTANT: This script must run on an"
echo "  air-gapped machine with NO network."
echo "========================================"
echo ""

# Verify openssl is available
if ! command -v openssl &>/dev/null; then
  echo "ERROR: openssl not found in PATH." >&2
  exit 1
fi

# Verify python3 is available
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 not found in PATH." >&2
  exit 1
fi

# Verify shamir_split.py exists
if [[ ! -f "${SHAMIR_PY}" ]]; then
  echo "ERROR: ${SHAMIR_PY} not found." >&2
  exit 1
fi

# Create output directory
mkdir -p "${OUTPUT_DIR}"
CEREMONY_ID="ceremony-$(date -u +%Y%m%dT%H%M%SZ)-$$"
CEREMONY_DIR="${OUTPUT_DIR}/${CEREMONY_ID}"
mkdir -p "${CEREMONY_DIR}"

echo "Ceremony ID : ${CEREMONY_ID}"
echo "Shares      : ${SHARES}"
echo "Threshold   : ${THRESHOLD}"
echo "Output      : ${CEREMONY_DIR}"
echo ""

# ----------------------------- key generation --------------------------------

echo "[1/5] Generating classical Ed25519 master key pair..."
CLASSICAL_PRIV="${CEREMONY_DIR}/classical_master.key"
CLASSICAL_PUB="${CEREMONY_DIR}/classical_master.pub"

openssl genpkey -algorithm ed25519 -out "${CLASSICAL_PRIV}" 2>/dev/null
openssl pkey -in "${CLASSICAL_PRIV}" -pubout -out "${CLASSICAL_PUB}" 2>/dev/null
chmod 600 "${CLASSICAL_PRIV}"

CLASSICAL_PUB_FINGERPRINT=$(openssl pkey -in "${CLASSICAL_PRIV}" -pubout -outform DER 2>/dev/null | openssl dgst -sha256 -hex 2>/dev/null | awk '{print $NF}')
echo "  Ed25519 public key fingerprint (SHA-256): ${CLASSICAL_PUB_FINGERPRINT}"

echo "[2/5] Generating ML-DSA placeholder key pair (Ed25519 demo stand-in)..."
# NOTE: In production, replace this with actual ML-DSA-65 key generation
# using liboqs:  oqs-keygen --algorithm ML-DSA-65 ...
MLDSA_PRIV="${CEREMONY_DIR}/mldsa_master.key"
MLDSA_PUB="${CEREMONY_DIR}/mldsa_master.pub"

openssl genpkey -algorithm ed25519 -out "${MLDSA_PRIV}" 2>/dev/null
openssl pkey -in "${MLDSA_PRIV}" -pubout -out "${MLDSA_PUB}" 2>/dev/null
chmod 600 "${MLDSA_PRIV}"

MLDSA_PUB_FINGERPRINT=$(openssl pkey -in "${MLDSA_PRIV}" -pubout -outform DER 2>/dev/null | openssl dgst -sha256 -hex 2>/dev/null | awk '{print $NF}')
echo "  ML-DSA-65 (demo) public key fingerprint: ${MLDSA_PUB_FINGERPRINT}"

# ----------------------------- Shamir splitting ------------------------------

echo "[3/5] Splitting master private key into ${SHARES} Shamir shares (threshold=${THRESHOLD})..."

# Concatenate both private keys as the master secret
MASTER_SECRET_FILE="${CEREMONY_DIR}/.master_combined.tmp"
cat "${CLASSICAL_PRIV}" "${MLDSA_PRIV}" > "${MASTER_SECRET_FILE}"
chmod 600 "${MASTER_SECRET_FILE}"

# Use a small Python wrapper to call shamir_split and write share files
python3 - "${SHAMIR_PY}" "${MASTER_SECRET_FILE}" "${SHARES}" "${THRESHOLD}" "${CEREMONY_DIR}" <<'PYEOF'
import sys, importlib.util, json, os

shamir_path = sys.argv[1]
secret_path = sys.argv[2]
n = int(sys.argv[3])
k = int(sys.argv[4])
out_dir = sys.argv[5]

# Load shamir module
spec = importlib.util.spec_from_file_location("shamir_split", shamir_path)
shamir = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shamir)

with open(secret_path, "rb") as f:
    secret = f.read()

shares = shamir.split_secret(secret, n, k)

share_manifest = []
for idx, share_data in shares:
    fname = f"share_{idx:02d}.bin"
    fpath = os.path.join(out_dir, fname)
    with open(fpath, "wb") as sf:
        sf.write(share_data)
    os.chmod(fpath, 0o600)
    share_manifest.append({
        "index": idx,
        "file": fname,
        "sha256": __import__("hashlib").sha256(share_data).hexdigest(),
        "length": len(share_data)
    })

manifest_path = os.path.join(out_dir, "share_manifest.json")
with open(manifest_path, "w") as mf:
    json.dump(share_manifest, mf, indent=2)

print(f"  Wrote {n} share files and manifest to {out_dir}")
PYEOF

# ----------------------------- securely delete master key material -----------

echo "[4/5] Securely removing combined master key material..."
rm -f "${MASTER_SECRET_FILE}"
# NOTE: The individual .key files are kept for transcript but should be
# destroyed after share distribution is verified.  In production, use
# `shred` or a secure erase utility.

# ----------------------------- ceremony transcript ---------------------------

echo "[5/5] Producing ceremony transcript..."

TRANSCRIPT="${CEREMONY_DIR}/transcript.json"
cat > "${TRANSCRIPT}" <<JSONEOF
{
  "ceremony": {
    "id": "${CEREMONY_ID}",
    "timestamp_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "type": "OFFLINE_KEY_CEREMONY",
    "network_required": false,
    "air_gapped": true
  },
  "keys": {
    "classical": {
      "algorithm": "Ed25519",
      "publicKeyFile": "classical_master.pub",
      "fingerprint_sha256": "${CLASSICAL_PUB_FINGERPRINT}"
    },
    "postQuantum": {
      "algorithm": "ML-DSA-65 (demo: Ed25519 placeholder)",
      "publicKeyFile": "mldsa_master.pub",
      "fingerprint_sha256": "${MLDSA_PUB_FINGERPRINT}",
      "productionNote": "Replace with liboqs ML-DSA-65 key generation"
    }
  },
  "shamirSharing": {
    "totalShares": ${SHARES},
    "threshold": ${THRESHOLD},
    "field": "GF(256)",
    "shareManifestFile": "share_manifest.json"
  },
  "instructions": {
    "1": "Distribute each share_XX.bin file to a separate ceremony participant.",
    "2": "Each participant must store their share in a tamper-evident envelope.",
    "3": "Store envelopes in geographically separate secure locations.",
    "4": "Destroy the private key files (classical_master.key, mldsa_master.key) after verification.",
    "5": "Retain ONLY the public key files and this transcript.",
    "6": "To reconstruct: gather at least ${THRESHOLD} shares and run reconstruct_secret()."
  }
}
JSONEOF

echo ""
echo "========================================"
echo "  CEREMONY COMPLETE"
echo "========================================"
echo ""
echo "Output directory: ${CEREMONY_DIR}"
echo ""
echo "Files produced:"
ls -la "${CEREMONY_DIR}/"
echo ""
echo "NEXT STEPS:"
echo "  1. Verify the transcript:  cat ${TRANSCRIPT}"
echo "  2. Distribute share files to ceremony participants."
echo "  3. Securely destroy private key files after distribution."
echo "  4. This machine should be securely wiped after the ceremony."
echo ""
