# Munin Roadmap: What's Next

**Last Updated**: 2026-01-13  
**Status**: Core audit log & decision system complete. Ready for production hardening.

---

## 🎯 Strategic Direction

Munin is transitioning from **Functional Logic Prototype** → **Production-Ready Sovereign Infrastructure System**.

### Current State
- ✅ **Core Orchestration**: Dependency inference, incident simulation, handshake generation
- ✅ **Cryptographic Foundation**: Audit log with hash chaining, Ed25519 signatures, decision workflow
- ✅ **Demo Validation**: Carlisle flood monitoring with real EA data
- ⚠️ **Production Gaps**: TEE integration, PQC, real-time SCADA, hardware integration

### Vision
**Munin as the first Sovereign Orchestration Layer for zero-latency crisis response**, with:
- Hardware-rooted trust (TEE + Logic-Lock)
- Post-quantum cryptography (DILITHIUM-3)
- Real-time cross-sector visibility
- Sub-minute authorized response

---

## 📅 Immediate Next Steps (Next 2 Weeks)

### 1. Complete Audit Log & Decision System ✅ → 🔧 Production Hardening

**Status**: Core implementation complete, needs production deployment

**Actions**:
- [ ] Install `@noble/ed25519` library (`npm install @noble/ed25519`)
- [ ] Apply PostgreSQL migrations to production database
- [ ] Test end-to-end decision workflow (create → sign → authorize)
- [ ] Verify chain integrity on production data
- [ ] Set up checkpoint export schedule (daily/weekly)

**Files**:
- `migrations/*.sql` - Database schema
- `lib/audit/*.ts` - Core libraries
- `app/api/decisions/*` - API endpoints

**Timeline**: 2-3 days

---

### 2. Carlisle Demo Enhancements 🎬

**Goal**: Make demo production-ready and visually compelling

**Priority Tasks**:

#### A. Historical Replay with Storm Desmond
- [ ] Run demo with generated Storm Desmond data
- [ ] Compare Munin response time vs actual 2015 response
- [ ] Document time savings (target: < 2 min vs 2-6 hours baseline)
- [ ] Create before/after visualization

**Files Ready**:
- `engine/generate_storm_desmond_data.py`
- `engine/sample_data/carlisle_storm_desmond/`

#### B. Single Sign-Off Workflow
- [ ] Verify `minimum_sign_off: true` is respected in packetize.py
- [ ] Test 1-of-1 approval (EA Duty Officer)
- [ ] Verify < 2 minute authorization time
- [ ] Document workflow in demo script

**Impact**: Reduces authorization time from 3.78 min → < 2 min

#### C. Enhanced Metrics Dashboard
- [ ] Add real-time metrics to `app/carlisle-dashboard/page.tsx`:
  - Time-to-authorize (current vs baseline)
  - Time-to-task (automated vs manual)
  - Coordination latency
- [ ] Create comparison visualization (Munin vs traditional)
- [ ] Add historical trend charts

**Timeline**: 1 week

---

### 3. Real-Time Data Integration 🔄

**Goal**: Move from batch processing to real-time monitoring

**Actions**:
- [ ] Create `engine/poll_ea_api.py` - Periodic EA API polling (every 15 min)
- [ ] Auto-trigger playbook when thresholds exceeded
- [ ] Real-time packet generation on threshold breach
- [ ] Alert system for operators (email/SMS/webhook)
- [ ] Background job scheduler (cron or systemd timer)

**Architecture**:
```
EA API → Poll Script → Threshold Check → Playbook Trigger → Packet Generation → Alert
```

**Files to Create**:
- `engine/poll_ea_api.py`
- `engine/threshold_monitor.py`
- `app/api/alerts/route.ts`

**Timeline**: 1 week

---

## 🏗️ Production Readiness (Next Month)

### 4. Post-Quantum Cryptography (PQC) 🔐

**Status**: Algorithm selected (DILITHIUM-3), not yet implemented

**Actions**:
- [ ] Research DILITHIUM-3 libraries (NIST FIPS 204)
- [ ] Replace Ed25519 with DILITHIUM-3 for handshake signatures
- [ ] Update key management for PQC keys
- [ ] Migrate existing Ed25519 keys to DILITHIUM-3
- [ ] Update documentation

**Why Critical**: Quantum computers will break Ed25519 by 2030. Munin must be future-proof.

**Files to Modify**:
- `lib/audit/ed25519.ts` → `lib/audit/pqc.ts`
- `lib/audit/keyManagement.ts`
- `lib/pqc.ts` (may already exist)

**Timeline**: 2 weeks

---

### 5. Trusted Execution Environment (TEE) Integration 🛡️

**Status**: Architecture defined, not yet integrated

**Actions**:
- [ ] Choose TEE platform (Intel SGX vs ARM TrustZone)
- [ ] Implement TEE enclave for signature generation
- [ ] Move critical operations into TEE:
  - Handshake packet signing
  - Decision authorization
  - Key management
- [ ] Add TEE attestation to packets
- [ ] Test with hardware TEE (if available)

**Architecture**:
```
Munin App → TEE Enclave → Sign Packet → Attestation → Return to App
```

**Files to Create**:
- `engine/tee_enclave/` - TEE code
- `lib/tee/` - TEE integration library

**Timeline**: 3-4 weeks (depends on hardware access)

---

### 6. Real-Time SCADA Integration 🔌

**Status**: Currently uses CSV sample data

**Actions**:
- [ ] Implement protocol translators for:
  - Modbus TCP/RTU
  - DNP3
  - OPC UA
  - IEC 61850
- [ ] Create SCADA data ingestion pipeline
- [ ] Real-time dependency graph updates
- [ ] Test with simulated SCADA systems
- [ ] Document integration patterns

**Files to Create**:
- `engine/scada_ingest/` - Protocol translators
- `engine/realtime_pipeline.py` - Real-time processing

**Timeline**: 2-3 weeks

---

### 7. Physical Verification Integration 📡

**Status**: Architecture defined (RF/acoustic sensors), not yet integrated

**Actions**:
- [ ] Integrate RF fingerprinting (`components/AcousticRFFingerprint.tsx`)
- [ ] Integrate acoustic sensors (`engine/physics_ingest.py`)
- [ ] Create physical verification pipeline:
  - Digital SCADA signal → Physical sensor → Compare → Flag discrepancies
- [ ] Test with simulated sensors
- [ ] Document digital vs physical verification

**Files to Integrate**:
- `engine/physics_ingest.py` (exists)
- `components/AcousticRFFingerprint.tsx` (exists)

**Timeline**: 2 weeks

---

## 🚀 Advanced Features (Next Quarter)

### 8. Agentic Reasoning Integration 🤖

**Status**: Engine exists, not integrated with Carlisle

**Actions**:
- [ ] Integrate `engine/agentic_reasoning.py` with flood playbook
- [ ] Enable dynamic playbook adaptation
- [ ] Test counterfactual analysis for flood scenarios
- [ ] Add agentic reasoning to handshake packets

**Timeline**: 2 weeks

---

### 9. Full Byzantine Multi-Sig Workflow 🏛️

**Status**: Engine exists, not fully tested

**Actions**:
- [ ] Test 2-of-3 ministry approval workflow
- [ ] Integrate biometric handshake tablets
- [ ] Test air-gapped terminal workflow
- [ ] Document full quorum authorization process
- [ ] Create demo of "treason-proofing"

**Files**:
- `engine/byzantine_resilience.py` (exists)
- `components/BiometricTabletPanel.tsx` (exists)

**Timeline**: 2 weeks

---

### 10. Multi-River Confluence (Caldew) 🌊

**Status**: Currently only Eden + Petteril

**Actions**:
- [ ] Find Caldew station ID in EA API
- [ ] Add to `carlisle_config.py`
- [ ] Update playbook for three-river coordination
- [ ] Test multi-river dependency graph inference
- [ ] Demonstrate complex confluence scenario

**Value**: Shows Munin's ability to handle complex multi-system coordination

**Timeline**: 1 week

---

### 11. Rainfall Telemetry (Leading Indicator) 🌧️

**Status**: Playbook mentions rainfall, data not integrated

**Actions**:
- [ ] Extend `ea_flood_client.py` to fetch rainfall data
- [ ] Add rainfall station to `carlisle_config.py`
- [ ] Update playbook triggers to include rainfall thresholds
- [ ] Test early warning capability (rainfall → flood prediction)

**Value**: Demonstrates proactive response (leading indicators)

**Timeline**: 1 week

---

## 🔒 Security & Compliance (Ongoing)

### 12. Security Hardening

**Actions**:
- [ ] Security audit of approval workflow
- [ ] Test Byzantine fault tolerance (simulate compromised signer)
- [ ] Verify Merkle receipt integrity under attack
- [ ] Penetration testing
- [ ] Document threat model

**Timeline**: Ongoing

---

### 13. Regulatory Compliance

**Actions**:
- [ ] Verify all statutory references are current
- [ ] Get legal review of compliance certificates
- [ ] Document regulatory approval process
- [ ] Create compliance audit checklist
- [ ] Prepare for regulatory review

**Timeline**: Ongoing

---

## 📊 Performance & Scale (As Needed)

### 14. Performance Optimization

**Actions**:
- [ ] Optimize graph inference for larger datasets
- [ ] Implement EA API response caching
- [ ] Reduce packet generation time
- [ ] Parallelize dependency graph computation
- [ ] Load testing (multiple concurrent incidents)

**Timeline**: As needed

---

### 15. Deployment Architecture

**Actions**:
- [ ] Design production deployment architecture
- [ ] Document infrastructure requirements
- [ ] Create deployment playbook
- [ ] Design disaster recovery procedures
- [ ] Set up monitoring and alerting

**Timeline**: Before production deployment

---

## 🎯 Recommended Priority Order

### Phase 1: Complete Foundation (Next 2 Weeks)
1. ✅ Audit log production deployment
2. 🎬 Carlisle demo enhancements
3. 🔄 Real-time data integration

### Phase 2: Production Hardening (Next Month)
4. 🔐 Post-quantum cryptography
5. 🛡️ TEE integration
6. 🔌 Real-time SCADA integration

### Phase 3: Advanced Features (Next Quarter)
7. 🤖 Agentic reasoning
8. 🏛️ Full Byzantine multi-sig
9. 🌊 Multi-river confluence
10. 🌧️ Rainfall telemetry

### Phase 4: Scale & Deploy (When Ready)
11. 🔒 Security hardening
12. 📊 Performance optimization
13. 📦 Deployment architecture

---

## 🚀 Quick Wins (High Impact, Low Effort)

1. **Historical Replay** (30 min)
   - Data already generated
   - Just run demo with Storm Desmond data

2. **Single Sign-Off Verification** (1 hour)
   - Check `minimum_sign_off` is respected
   - Test 1-of-1 approval

3. **Metrics Dashboard** (2 hours)
   - Add time-to-authorize to dashboard
   - Show comparison vs baseline

4. **Real-Time Polling** (4 hours)
   - Create simple polling script
   - Auto-trigger on threshold breach

---

## 📝 Decision Points

Before proceeding, consider:

1. **Demo vs Production?**
   - If demo: Focus on Phase 1 (demo enhancements)
   - If production: Focus on Phase 2 (hardening)

2. **Timeline?**
   - Demo next week? → Quick wins only
   - Production in 6 months? → Full roadmap

3. **Budget/Resources?**
   - Hardware TEE access?
   - SCADA system access?
   - Legal/compliance review?

4. **Audience?**
   - Technical? → Focus on architecture
   - Executive? → Focus on ROI/metrics
   - Regulatory? → Focus on compliance

---

## 🎬 Getting Started

**Immediate Action** (5 minutes):
```bash
# Install Ed25519 library
npm install @noble/ed25519

# Run Storm Desmond replay
cd engine
python3 carlisle_demo.py
```

**Next Coding Task** (1 hour):
- Verify single sign-off workflow
- Add metrics to dashboard

**Next Research Task** (2 hours):
- Research DILITHIUM-3 libraries
- Research TEE platforms (SGX vs TrustZone)

---

## 📚 Related Documentation

- `docs/NEXT_STEPS.md` - Detailed next steps for Carlisle demo
- `docs/AUDIT_LOG_INTEGRITY.md` - Audit log system documentation
- `ARCHITECTURE.md` - System architecture
- `CONTRIBUTING.md` - Development philosophy

---

**Last Updated**: 2026-01-13  
**Next Review**: After Phase 1 completion
