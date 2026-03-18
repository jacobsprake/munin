# Munin -- Technical Overview

**Document Classification:** Procurement-Sensitive | Pre-Decisional
**Version:** 1.0
**Date:** 2026-03-18
**Audience:** Technical evaluators, enterprise architects, systems integrators

---

## 1. System Architecture

Munin employs a five-stage pipeline architecture. Each stage is independently testable,
and the pipeline supports both batch and near-real-time operation within an air-gapped
environment.

### Stage 1: Ingestion

- Accepts infrastructure data from historian systems, asset registers, GIS exports,
  and structured SOP documents.
- Connectors support common SCADA historian formats (CSV, OSIsoft PI export, OPC-UA
  snapshots) and geospatial formats (GeoJSON, Shapefile).
- All ingestion occurs through a **unidirectional data diode** interface. No write-back
  path exists to source systems.

### Stage 2: Normalization

- Ingested data is transformed into a unified internal graph model.
- Assets, connections, and operational parameters are mapped to a canonical schema.
- Temporal alignment ensures that snapshots from different sources are reconciled to
  a common time reference.

### Stage 3: Shadow Link Discovery

- Spatial, temporal, and operational correlation algorithms identify non-obvious
  dependencies between infrastructure assets.
- Discovery operates on the normalized graph and produces candidate links with
  confidence scores.
- Candidate links are surfaced for operator review; they do not automatically enter
  the validated dependency model.

### Stage 4: Playbook Validation

- Pre-existing standard operating procedures are parsed and mapped against the
  discovered topology (including shadow links).
- Conflict detection identifies cases where an action in one sector would produce
  adverse consequences in another.
- Validated playbooks are tagged with scope, preconditions, and known constraints.

### Stage 5: Packet Generation

- Advisory recommendations are assembled into signed packets.
- Each packet contains: the recommendation, evidence references, model version,
  topology snapshot hash, and a UTC timestamp.
- Packets are signed using Ed25519 and optionally co-signed with ML-DSA for
  post-quantum readiness.
- Packets are chained via a Merkle structure to ensure tamper-evident sequencing.

---

## 2. Data Flow Diagram

```
                          DATA DIODE (unidirectional)
                                   |
                                   v
  +------------+    +--------------+    +------------------+
  | Historian   |--->| Ingestion    |--->| Normalization    |
  | Connectors  |    | (Stage 1)    |    | (Stage 2)        |
  +------------+    +--------------+    +------------------+
                                                |
                                                v
                                   +---------------------+
                                   | Shadow Link         |
                                   | Discovery (Stage 3) |
                                   +---------------------+
                                                |
                                                v
                                   +---------------------+
                                   | Playbook Validation |
                                   | (Stage 4)           |
                                   +---------------------+
                                                |
                                                v
                                   +---------------------+
                                   | Packet Generation   |
                                   | (Stage 5)           |
                                   +---------------------+
                                                |
                                                v
                                   +---------------------+
                                   | Operator Console    |
                                   | (read-only display) |
                                   +---------------------+
```

---

## 3. Integration Points

### 3.1 Historian Connectors

- **Input formats:** CSV time-series, OPC-UA snapshots, GeoJSON, Shapefile, SOP
  documents (Markdown, PDF with structured headings).
- **Adapter pattern:** Each connector implements a standard ingestion interface.
  New connectors can be developed without modifying the core pipeline.

### 3.2 Data Diode Interface

- All external data enters through a hardware or software-enforced unidirectional
  channel.
- The diode interface accepts batched file drops or streaming ingestion depending
  on deployment profile.
- No acknowledgment, status, or error data flows outbound through the diode.

### 3.3 Operator Console

- Browser-based interface served locally (no external CDN or asset dependencies).
- Strict Content Security Policy: no inline scripts, no external resource loading.
- Displays validated playbooks, shadow link visualizations, and signed packet details.
- All interaction is read-only in v1. No actuation commands can be issued.

---

## 4. Deployment Profiles

| Profile | Hardware | Data Source | Use Case |
|---|---|---|---|
| **Demo** | Single workstation or laptop | Synthetic datasets | Evaluation, training |
| **Pilot** | Hardened workstation, data diode | Limited real infrastructure data | Controlled trial |
| **Production** | Dedicated server, HSM (v2+), redundant storage | Full operational data | Operational deployment |
| **Emergency** | Portable ruggedized unit | Field-collected data | Incident response |

All profiles operate fully air-gapped after initial provisioning. The demo profile
requires no special hardware and can be deployed in under one hour.

---

## 5. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js (static export) | Serves locally with no runtime server dependency for static assets. Strict CSP enforcement. |
| **Backend API** | Python (FastAPI) | Lightweight, well-audited, suitable for air-gapped deployment. |
| **Database** | SQLite | Zero-configuration, single-file database. No network listener. Suitable for air-gapped environments. |
| **Cryptography** | Ed25519 (signatures), ML-DSA (post-quantum), Merkle chain (sequencing) | Standards-based, auditable, PQC-ready. |
| **ML / Analysis** | Python (scikit-learn, NetworkX) | Dependency discovery and correlation. No cloud ML services. |
| **Packaging** | Container image or bare-metal install | Supports both containerized and direct deployment. |

---

## 6. Performance Characteristics

- **Ingestion throughput:** Designed for batch processing of datasets up to 100,000
  assets per run in the current prototype.
- **Shadow link discovery:** Computation completes within minutes on datasets of
  typical municipal scale (10,000-50,000 assets).
- **Packet generation:** Sub-second per packet, including dual-stack signing.
- **Console rendering:** Responsive on commodity hardware; no GPU required.

---

## 7. Standards and Specifications

- **Packet format:** Specified in `specs/munin-packet-v1.md` (SOP-v1 open format).
- **Security alignment:** NIST SP 800-82 Rev. 3, IEC 62443 (see SECURITY_OVERVIEW.md).
- **Safety analysis:** STPA-based (see SAFETY_CASE_SUMMARY.md).

---

*For security architecture details, see SECURITY_OVERVIEW.md.*
*For safety claims and hazard analysis, see SAFETY_CASE_SUMMARY.md.*
