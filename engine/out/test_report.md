# Munin Feature Test Report

**Generated:** 2026-02-16T15:17:34.757540

## Summary

- **Total Tests:** 26
- **✅ Passed:** 22
- **❌ Failed:** 4
- **⚠️ Errors:** 0
- **Success Rate:** 84.6%

## Detailed Results

### ✅ 1. Data Ingestion

**Status:** PASS

**Message:**
```
Successfully ingested 4 nodes, 88 samples
```

### ❌ 10. Protocol Translation

**Status:** FAIL

**Message:**
```
Exception: ProtocolTranslator.__init__() missing 1 required positional argument: 'protocol'
```

### ✅ 11. Data Diode

**Status:** PASS

**Message:**
```
Data diode working: inbound=True, outbound blocked
```

### ✅ 12. Shadow Simulation

**Status:** PASS

**Message:**
```
Shadow simulation engine initialized
```

### ✅ 13. Agentic Reasoning

**Status:** PASS

**Message:**
```
Agentic reasoning engine initialized
```

### ✅ 14. CMI Prioritization

**Status:** PASS

**Message:**
```
CMI prioritization: asset hospital_001 priority=10
```

### ✅ 15. Physical Verification

**Status:** PASS

**Message:**
```
Physical verification engine initialized
```

### ✅ 16. Provenance Ledger

**Status:** PASS

**Message:**
```
Provenance ledger initialized, 1 hardware roots registered
```

### ❌ 17. Digital Twin

**Status:** FAIL

**Message:**
```
Missing dependency: cannot import name 'DigitalTwinEngine' from 'sovereign_digital_twin' (/Users/jacoblsprake/Library/Mobile Documents/com~apple~CloudDocs/Sprake/Business and Entrepreneurship/SPRLABS/Munin/engine/sovereign_digital_twin.py)
```

### ✅ 18. Sovereign Handshake

**Status:** PASS

**Message:**
```
Sovereign handshake created: test_action_001
```

### ❌ 19. Liability Shield

**Status:** FAIL

**Message:**
```
Missing dependency: cannot import name 'LiabilityShieldEngine' from 'liability_shield' (/Users/jacoblsprake/Library/Mobile Documents/com~apple~CloudDocs/Sprake/Business and Entrepreneurship/SPRLABS/Munin/engine/liability_shield.py)
```

### ✅ 2. Graph Inference

**Status:** PASS

**Message:**
```
Graph built: 8 nodes, 0 edges
```

### ✅ 20. Safety PLC

**Status:** PASS

**Message:**
```
Safety PLC initialized
```

### ✅ 21. N-Version Programming

**Status:** PASS

**Message:**
```
N-version programming engine initialized: 3 versions, threshold 2
```

### ✅ 22. Satellite Verification

**Status:** PASS

**Message:**
```
Satellite verification engine initialized
```

### ✅ 23. Digital Asset Vault

**Status:** PASS

**Message:**
```
Digital asset vault initialized: test_vault_001
```

### ✅ 24. Sovereign Mesh

**Status:** PASS

**Message:**
```
Sovereign mesh network initialized: 1 nodes
```

### ✅ 25. Wide-Bandgap Edge

**Status:** PASS

**Message:**
```
Wide-bandgap edge node initialized: test_edge_001
```

### ✅ 26. Biometric Key

**Status:** PASS

**Message:**
```
Biometric tablet initialized: test_tablet_001
```

### ✅ 3. Sensor Health Detection

**Status:** PASS

**Message:**
```
Health assessed for 8 nodes, 0 evidence windows
```

### ✅ 4. Incident Simulation

**Status:** PASS

**Message:**
```
Generated 3 incident simulations
```

### ❌ 5. Handshake Generation

**Status:** FAIL

**Message:**
```
Exception: cannot access local variable 'audit_log' where it is not associated with a value
```

### ✅ 6. Shadow Link Detection

**Status:** PASS

**Message:**
```
Detected 0 shadow links
```

### ✅ 7. Audit Log

**Status:** PASS

**Message:**
```
Audit log verified: 16 entries
```

### ✅ 8. Byzantine Resilience

**Status:** PASS

**Message:**
```
Byzantine resilience engine initialized, quorum: 3-of-4
```

### ✅ 9. Logic-Lock

**Status:** PASS

**Message:**
```
Logic-Lock validation: valid=False, blocked=True
```

