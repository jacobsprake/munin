# Operations Runbook

Procedures for common operational events in Munin deployments.

## Table of Contents

1. [Engine Failure](#engine-failure)
2. [Data Diode Check](#data-diode-check)
3. [Key Rotation](#key-rotation)
4. [System Restore](#system-restore)
5. [Incident Response](#incident-response)
6. [Maintenance Windows](#maintenance-windows)

## Engine Failure

### Symptoms
- Engine pipeline stops processing data
- No new incidents generated
- Graph inference not updating

### Diagnosis

```bash
# Check engine logs
tail -f /var/munin/logs/engine_log.jsonl

# Check engine status
curl http://localhost:3000/api/engine/status

# Check system resources
df -h  # Disk space
free -h  # Memory
top  # CPU
```

### Recovery Steps

1. **Check for errors in logs**
   ```bash
   grep ERROR /var/munin/logs/engine_log.jsonl | tail -20
   ```

2. **Restart engine pipeline**
   ```bash
   systemctl restart munin-engine
   ```

3. **Verify recovery**
   ```bash
   # Wait 5 minutes, then check
   curl http://localhost:3000/api/engine/status
   ```

4. **If persistent, check data sources**
   ```bash
   # Verify data directory accessible
   ls -la /var/munin/data/
   
   # Check data freshness
   find /var/munin/data -type f -mtime +1
   ```

## Data Diode Check

### Scheduled Check (Weekly)

```bash
# Run air-gap verification
curl http://localhost:3000/api/airgap/verify

# Expected result:
# {
#   "certifiedAirGapped": true,
#   "verificationTests": [
#     {"test": "dns_resolution", "passed": true},
#     {"test": "external_connectivity", "passed": true}
#   ]
# }
```

### Manual Verification

1. **Test DNS resolution** (should fail)
   ```bash
   nslookup google.com
   # Expected: timeout or failure
   ```

2. **Test external connectivity** (should fail)
   ```bash
   curl -I https://www.google.com --max-time 5
   # Expected: timeout or connection refused
   ```

3. **Check network interfaces**
   ```bash
   ip addr show
   # Verify no default gateway configured
   ```

4. **Verify data diode hardware** (if applicable)
   ```bash
   # Check device exists
   ls -la /dev/diode0
   
   # Check device status
   cat /sys/class/diode/status
   ```

### If Verification Fails

1. **Immediate**: Disconnect from network
2. **Investigate**: Check network configuration changes
3. **Report**: Notify security team
4. **Remediate**: Reconfigure network interfaces, verify data diode

## Key Rotation

### PQC Key Rotation (Every 90 Days)

```bash
# Check rotation status
curl http://localhost:3000/api/pqc/rotation-status

# Rotate keys
curl -X POST http://localhost:3000/api/pqc/rotate \
  -H "Content-Type: application/json" \
  -d '{"reason": "Scheduled rotation"}'

# Verify new key active
curl http://localhost:3000/api/pqc/current-key
```

### Emergency Key Revocation

If key compromised:

```bash
# Revoke compromised key
curl -X POST http://localhost:3000/api/pqc/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "keyId": "pqc_key_12345",
    "reason": "Suspected compromise"
  }'

# Emergency rotation
curl -X POST http://localhost:3000/api/pqc/rotate \
  -H "Content-Type: application/json" \
  -d '{"reason": "Emergency rotation after revocation"}'
```

### Verify Key Lineage

```bash
# Get key lineage
curl http://localhost:3000/api/pqc/lineage?keyId=pqc_key_12345
```

## System Restore

### From Digital Asset Vault

1. **Locate vault**
   ```bash
   # List available vaults
   curl http://localhost:3000/api/sovereign/vault?action=list
   ```

2. **Open vault** (requires physical key)
   ```bash
   curl -X POST http://localhost:3000/api/sovereign/vault \
     -H "Content-Type: application/json" \
     -d '{
       "action": "open",
       "vaultId": "vault_001",
       "physicalKey": "PHYSICAL-KEY-HASH"
     }'
   ```

3. **List snapshots**
   ```bash
   curl http://localhost:3000/api/sovereign/vault?vaultId=vault_001&action=snapshots
   ```

4. **Restore from snapshot**
   ```bash
   curl -X POST http://localhost:3000/api/sovereign/vault \
     -H "Content-Type: application/json" \
     -d '{
       "action": "restore",
       "vaultId": "vault_001",
       "snapshotId": "snapshot_20260115_120000"
     }'
   ```

5. **Verify restore**
   ```bash
   # Check graph restored
   curl http://localhost:3000/api/graph/status
   
   # Check engine status
   curl http://localhost:3000/api/engine/status
   ```

6. **Seal vault**
   ```bash
   curl -X POST http://localhost:3000/api/sovereign/vault \
     -H "Content-Type: application/json" \
     -d '{
       "action": "seal",
       "vaultId": "vault_001",
       "physicalKey": "PHYSICAL-KEY-HASH"
     }'
   ```

## Incident Response

### Security Incident

1. **Immediate Actions**
   - Disconnect from network (if not air-gapped)
   - Preserve audit logs
   - Notify security team

2. **Investigation**
   ```bash
   # Check audit log for suspicious activity
   grep -i "unauthorized\|failed\|blocked" /var/munin/logs/audit.jsonl | tail -50
   
   # Check TEE attestations
   curl http://localhost:3000/api/tee/attestations
   
   # Check provenance ledger
   python -m engine.provenance_ledger --verify-all
   ```

3. **Containment**
   - Revoke compromised keys
   - Rotate all cryptographic keys
   - Verify data diode integrity

4. **Recovery**
   - Restore from Digital Asset Vault if needed
   - Verify system integrity
   - Resume operations

### Data Corruption

1. **Detect corruption**
   ```bash
   # Verify audit log chain
   python -m lib.audit.auditLogVerification --verify-chain
   
   # Check provenance ledger
   python -m engine.provenance_ledger --detect-corruption
   ```

2. **Identify source**
   ```bash
   # Check for unprovenanced data
   python -m engine.provenance_ledger --list-unprovenanced
   ```

3. **Remediate**
   - Remove corrupted data
   - Re-ingest from trusted sources
   - Verify data integrity

## Maintenance Windows

### Scheduled Maintenance

1. **Pre-maintenance checklist**
   - [ ] Backup current state
   - [ ] Create Digital Asset Vault snapshot
   - [ ] Notify stakeholders
   - [ ] Schedule maintenance window

2. **During maintenance**
   ```bash
   # Pause engine (if needed)
   systemctl stop munin-engine
   
   # Perform updates
   # ... update procedures ...
   
   # Verify updates
   python -m engine.run --verify-only
   ```

3. **Post-maintenance**
   ```bash
   # Restart engine
   systemctl start munin-engine
   
   # Verify operation
   curl http://localhost:3000/api/engine/status
   
   # Check for errors
   tail -f /var/munin/logs/engine_log.jsonl
   ```

### Emergency Maintenance

1. **Immediate actions**
   - Create snapshot before changes
   - Document all changes
   - Test in isolated environment if possible

2. **Apply fixes**
   - Follow standard procedures
   - Verify each step

3. **Verify recovery**
   - Run full system checks
   - Verify data integrity
   - Monitor for 24 hours

## Monitoring

### Key Metrics

- **Engine pipeline**: Processing time, success rate
- **Graph inference**: Nodes, edges, correlation quality
- **Incident detection**: Incidents per day, false positive rate
- **Shadow mode**: Time saved, damage prevented
- **System health**: CPU, memory, disk, network

### Alerts

Configure alerts for:
- Engine pipeline failures
- Data diode verification failures
- TEE attestation failures
- Audit log chain breaks
- Provenance verification failures

## Support

For issues:
1. Check logs: `/var/munin/logs/`
2. Review documentation: `docs/`
3. Contact support: support@munin.sovereign

## Next Steps

- See [Plug-and-Play Deployment Guide](./PLUG_AND_PLAY_DEPLOYMENT_GUIDE.md) for deployment procedures
- See [Foundational Survival Layer](./foundational-survival-layer.md) for security details
- See [100-Step Roadmap](../.cursor/plans/munin-100-step-roadmap_d9062531.plan.md) for feature roadmap
