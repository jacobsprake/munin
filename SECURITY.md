# Munin Security Architecture

## Deployment Model

Munin is designed for **air-gapped, on-premises deployment** within government secure facilities. It has **zero external network dependencies** — no CDNs, cloud services, telemetry, or external fonts.

### Air-Gap Enforcement

| Layer | Mechanism |
|-------|-----------|
| **Network** | Docker Compose `internal: true` network — no internet routing |
| **HTTP** | Content-Security-Policy blocks all external origins |
| **Application** | No `fetch()` to external URLs; all assets bundled |
| **Verification** | `GET /api/airgap/verify` confirms zero outbound capability |

## Authentication

### Password Hashing
- **Algorithm**: Argon2id (OWASP recommended for high-value targets)
- **Parameters**: memoryCost=64MB, timeCost=3, parallelism=4
- **Fallback**: SHA-256 (development only — logged as security warning)

### Session Management
- **Mechanism**: HMAC-SHA256 tokens stored in SQLite (no cloud JWT)
- **Token size**: 256-bit random (32 bytes)
- **Storage**: Only token hash stored in DB; raw token sent to client
- **TTL**: Configurable (default 8 hours, set via `SESSION_TTL_HOURS`)
- **Secret**: Set via `SESSION_SECRET` environment variable (must be persistent in production)

### Rate Limiting
- **General API**: 60 requests/minute per IP
- **Auth endpoints**: 5 attempts/minute per IP
- **Account lockout**: 5 failed logins → 15-minute lockout (tracked in audit log)

## Authorization

### Role-Based Access Control (RBAC)
Roles: `operator`, `supervisor`, `regulator`, `sovereign_architect`

### Byzantine Multi-Signature (M-of-N)
Critical infrastructure commands require cryptographic signatures from multiple physically separated government ministries. No single ministry can authorize alone.

- **Critical actions** (e.g., open dam): 3-of-4 ministries
- **Standard actions** (e.g., adjust flow): 2-of-3 ministries
- **Emergency mode**: Reduced thresholds with enhanced logging

### Ministry Key Management
Each ministry receives an Ed25519 signing key pair on registration. Key rotation and revocation are tracked in the `user_key_history` table.

## Cryptographic Architecture

### Current Status

| Component | Status | Implementation |
|-----------|--------|----------------|
| **Audit log hashing** | ✅ Production | SHA-256 hash chain with sequence numbers |
| **Ed25519 signatures** | ✅ Production | `@noble/ed25519` v3 (NIST-approved curve) |
| **Session tokens** | ✅ Production | HMAC-SHA256 with server-side secret |
| **Password hashing** | ✅ Production | Argon2id (OWASP recommended) |
| **PQC (Dilithium-3)** | ⚠️ Simulated | Demo implementation; production requires liboqs |
| **TEE (Intel SGX)** | ⚠️ Simulated | Architecture defined; requires SGX hardware |
| **ZKP proofs** | ⚠️ Simulated | Architecture defined; requires circom/snarkjs |

### Production Hardening Roadmap

1. **PQC**: Replace simulated Dilithium-3 with NIST liboqs bindings
2. **TEE**: Integrate Intel SGX SDK for hardware-rooted signing
3. **ZKP**: Implement real ZK-SNARKs for privacy-preserving compliance proofs
4. **HSM**: Store signing keys in Hardware Security Modules (FIPS 140-3)
5. **Mutual TLS**: Certificate-based authentication between components

## Audit Trail

### Tamper-Evident Chain
Every operation is logged in a Merkle-chained audit log:
- Each entry's hash includes the previous entry's hash
- Entries are sequentially numbered
- Chain integrity is verifiable via `verifyChainIntegrity()`

### What's Logged
- All login attempts (success and failure)
- All decision creation and signing events
- All packet authorization events
- Configuration changes
- System health events

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Brute-force login** | Argon2id + rate limiting + account lockout |
| **Session hijacking** | HMAC tokens, short TTL, IP tracking |
| **Insider threat** | M-of-N multi-sig, no single-person authorization |
| **Data tampering** | Merkle-chained audit log, hash verification |
| **External attack** | Air-gap, CSP, no external dependencies |
| **Quantum computing** | PQC architecture ready (Dilithium-3 integration path defined) |
| **Key compromise** | Key rotation support, revocation tracking, key history |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | **Yes** (production) | 256-bit hex string for HMAC token signing |
| `SESSION_TTL_HOURS` | No | Session lifetime in hours (default: 8) |
| `ENFORCE_HTTPS` | No | Set to `true` to redirect HTTP → HTTPS |
| `NODE_ENV` | Yes | `production` for production deployment |
| `DATABASE_PATH` | No | Path to SQLite database (default: `data/munin.db`) |
