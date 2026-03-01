# Air-Gapped Deployment Guide

> Deploying Munin in a government secure facility with zero internet access

---

## Prerequisites

### Hardware
- Server: x86_64 Linux (Ubuntu 22.04 LTS or RHEL 9)
- RAM: 8GB minimum (16GB recommended)
- Storage: 50GB SSD
- Network: Internal LAN only (no internet gateway)
- Optional: Intel Xeon with SGX2 for TEE (Phase 3)
- Optional: FIPS 140-3 HSM for key storage (Phase 3)

### Software (pre-loaded on installation media)
- Docker Engine 24+ and Docker Compose v2
- Node.js 20 LTS
- Python 3.12+
- All npm and pip packages (vendored, no registry access needed)

---

## Installation

### Step 1: Transfer to air-gapped network

```bash
# On internet-connected build machine:
git clone https://github.com/jacobsprake/munin.git
cd munin
npm ci                                    # Download all Node.js deps
python3 -m venv venv && source venv/bin/activate
pip install -r engine/requirements.txt    # Download all Python deps
docker compose build                      # Build Docker images

# Save everything to transfer media (USB/DVD):
tar czf munin-airgap-bundle.tar.gz \
  --exclude='.git' \
  --exclude='node_modules/.cache' \
  .
docker save munin-app munin-engine | gzip > munin-docker-images.tar.gz
```

### Step 2: Load on air-gapped server

```bash
# Transfer munin-airgap-bundle.tar.gz and munin-docker-images.tar.gz
# via approved media (USB with write-blocker, or optical disc)

mkdir -p /opt/munin && cd /opt/munin
tar xzf /media/usb/munin-airgap-bundle.tar.gz
docker load < /media/usb/munin-docker-images.tar.gz
```

### Step 3: Configure secrets

```bash
# Generate session secret (256-bit)
export SESSION_SECRET=$(head -c 32 /dev/urandom | xxd -p -c 64)

# Generate system signing key
export SYSTEM_SIGNING_KEY=$(head -c 32 /dev/urandom | xxd -p -c 64)

# Write to env file (chmod 600)
cat > /opt/munin/.env << EOF
NODE_ENV=production
SESSION_SECRET=${SESSION_SECRET}
SYSTEM_SIGNING_KEY=${SYSTEM_SIGNING_KEY}
SESSION_TTL_HOURS=8
ENFORCE_HTTPS=true
DATABASE_PATH=/app/data/munin.db
MUNIN_PORT=3000
EOF
chmod 600 /opt/munin/.env
```

### Step 4: Run the engine pipeline

```bash
# Generate initial graph, incidents, and packets
docker compose run --rm engine

# Verify output
ls engine/out/graph.json engine/out/incidents.json engine/out/packets/
```

### Step 5: Start the platform

```bash
docker compose up -d app

# Verify health
curl -k https://localhost:3000/api/health
# Expected: {"status":"healthy","version":"1.0.0",...}

# Verify air-gap (this MUST fail)
docker compose exec app wget -q --spider https://google.com 2>&1
# Expected: "bad address" or connection refused
```

### Step 6: Verify security headers

```bash
curl -kI https://localhost:3000/ | grep -E "content-security-policy|x-munin|x-frame"
# Expected:
# content-security-policy: default-src 'self'; ...
# x-frame-options: DENY
# x-munin-deployment: air-gapped
```

---

## Ministry Onboarding

### Register ministries

```bash
# Environment Agency
curl -k -X POST https://localhost:3000/api/ministries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Environment Agency",
    "code": "EA",
    "type": "government",
    "jurisdiction": "UK",
    "contactName": "Director of Operations",
    "contactRole": "Chief Flood Officer"
  }'

# National Grid ESO
curl -k -X POST https://localhost:3000/api/ministries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "National Grid ESO",
    "code": "NGESO",
    "type": "utility"
  }'

# Ministry of Defence
curl -k -X POST https://localhost:3000/api/ministries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ministry of Defence",
    "code": "MOD",
    "type": "military"
  }'
```

### Create operator accounts

```bash
# Get ministry ID
EA_ID=$(curl -sk https://localhost:3000/api/ministries | \
  python3 -c "import json,sys;d=json.load(sys.stdin);print(next(m['id'] for m in d['ministries'] if m['code']=='EA'))")

# Create operator affiliated with EA
curl -k -X POST https://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d "{
    \"operator_id\": \"flood_officer_01\",
    \"passphrase\": \"$(head -c 24 /dev/urandom | base64)\",
    \"role\": \"water_authority\",
    \"ministry_id\": \"$EA_ID\",
    \"clearance_level\": \"secret\"
  }"
```

### Operator login

```bash
# Login → receive session token
TOKEN=$(curl -sk -X POST https://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"operatorId":"flood_officer_01","passphrase":"..."}' | \
  python3 -c "import json,sys;print(json.load(sys.stdin)['token'])")

# Use token for authenticated requests
curl -sk https://localhost:3000/api/auth/session \
  -H "Authorization: Bearer $TOKEN"
```

---

## Network Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 SECURE FACILITY (TEMPEST-rated)          │
│                                                          │
│  ┌──────────┐    ┌─────────────┐    ┌───────────────┐  │
│  │ SCADA    │────│ Hardware    │────│ Munin Server  │  │
│  │ Historian │    │ Data Diode  │    │ (Docker)      │  │
│  │          │    │ (one-way→)  │    │               │  │
│  └──────────┘    └─────────────┘    │ ┌───────────┐ │  │
│                                      │ │ Next.js   │ │  │
│  ┌──────────┐                       │ │ App+API   │ │  │
│  │ Ministry │◄──── Internal LAN ────│ ├───────────┤ │  │
│  │ Terminal │    (no internet)      │ │ Python    │ │  │
│  │ (EA)     │                       │ │ Engine    │ │  │
│  └──────────┘                       │ ├───────────┤ │  │
│                                      │ │ SQLite DB │ │  │
│  ┌──────────┐                       │ └───────────┘ │  │
│  │ Ministry │◄──── Internal LAN ────│               │  │
│  │ Terminal │                       └───────────────┘  │
│  │ (NGESO)  │                                          │
│  └──────────┘         ✗ NO INTERNET ✗                  │
│                                                          │
│  ┌──────────┐    ┌─────────────┐                       │
│  │ Digital  │    │ EMP-Shielded│                       │
│  │ Asset    │────│ Vault       │                       │
│  │ Vault    │    │ (offline)   │                       │
│  └──────────┘    └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

---

## Backup & Recovery

### Automated backup (cron)
```bash
# /etc/cron.d/munin-backup
0 */4 * * * root /opt/munin/scripts/backup.sh
```

### backup.sh
```bash
#!/bin/bash
BACKUP_DIR=/opt/munin/backups/$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
cp /opt/munin/data/munin.db "$BACKUP_DIR/"
cp -r /opt/munin/engine/out "$BACKUP_DIR/"
# Encrypt backup
gpg --symmetric --cipher-algo AES256 \
  -o "$BACKUP_DIR.tar.gz.gpg" \
  <(tar czf - -C "$BACKUP_DIR" .)
rm -rf "$BACKUP_DIR"
```

### Recovery
```bash
# Decrypt and restore
gpg -d backup.tar.gz.gpg | tar xzf - -C /opt/munin/data/
docker compose restart app
```

---

## Monitoring

### Health endpoints
| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `GET /api/health` | Basic health | `{"status":"healthy"}` |
| `GET /api/health/readiness` | Full readiness | `{"status":"ready"}` |
| `GET /api/health/liveness` | Container alive | `200 OK` |
| `GET /api/airgap/verify` | Air-gap status | No external connections |

### Log monitoring
```bash
# Watch audit log for anomalies
tail -f /opt/munin/data/audit.jsonl | \
  python3 -c "import json,sys
for line in sys.stdin:
    e=json.loads(line)
    if e.get('event_type') in ('LOGIN_FAILED','CHAIN_BREAK','KEY_REVOKED'):
        print(f'⚠️  {e[\"event_type\"]}: {e.get(\"payload_json\",{})}')"
```
