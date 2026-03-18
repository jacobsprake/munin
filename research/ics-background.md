# ICS/OT Background: Architecture, Protocols, and Security

## The Purdue Enterprise Reference Architecture

Industrial Control Systems are organized in a hierarchical model known as the Purdue Enterprise Reference Architecture (PERA), defined in ISA-95 / IEC 62264:

```
Level 5: Enterprise Network (ERP, email, internet)
Level 4: Site Business Planning (MES, historians)
         ---- IT/OT Demarcation (DMZ) ----
Level 3: Site Operations (SCADA servers, historians, HMI)
Level 2: Supervisory Control (HMI workstations, engineering stations)
Level 1: Basic Control (PLCs, RTUs, DCS controllers)
Level 0: Physical Process (sensors, actuators, field devices)
```

**Munin operates at Level 3.5** — between the site operations network and the enterprise layer. It receives data unidirectionally from Level 3 historians via a hardware data diode and presents analysis to operators at Levels 3-4. Munin has no connectivity to Levels 0-2.

## Industrial Communication Protocols

### Modbus (TCP/RTU)
- **Origin**: 1979 (Modicon)
- **Use**: PLCs, RTUs, sensors
- **Port**: 502 (TCP)
- **Security**: None built-in (no authentication, no encryption)
- **Munin integration**: `engine/protocol_translator.py` reads Modbus registers via historian CSV export

### DNP3 (Distributed Network Protocol 3)
- **Origin**: 1990s (GE/Harris)
- **Use**: Electric utilities, water treatment, oil/gas
- **Port**: 20000 (TCP)
- **Security**: SA (Secure Authentication) extension available
- **Munin integration**: `engine/protocol_translator.py` parses DNP3 data points from historian

### BACnet (Building Automation and Control Networks)
- **Origin**: 1995 (ASHRAE)
- **Use**: HVAC, lighting, fire systems, hospitals
- **Port**: 47808 (UDP)
- **Security**: Limited (BACnet/SC adds TLS)
- **Munin integration**: Read-only BACnet object parsing for building-integrated infrastructure

### IEC 61850
- **Origin**: 2003 (IEC)
- **Use**: Substation automation, protection relays
- **Protocol**: GOOSE (real-time), MMS (configuration)
- **Security**: IEC 62351 provides authentication and encryption
- **Munin integration**: MMS data extraction for power grid monitoring

### OPC UA (Unified Architecture)
- **Origin**: 2008 (OPC Foundation)
- **Use**: Modern ICS integration layer
- **Security**: Built-in TLS, authentication, authorization
- **Munin integration**: OPC UA client for read-only data subscription

## Why Cross-Sector Dependencies Are Invisible

Current ICS/OT monitoring systems are designed for **within-sector** observation:
- A water utility's SCADA monitors pumps, valves, and reservoirs
- A power grid's EMS monitors generators, transformers, and load
- A telecom NOC monitors towers, switches, and links

**No existing system monitors the dependencies between these sectors.** When a power substation trips, the water utility's pumps lose power — but the water SCADA system sees only "pump offline," not "pump offline because power substation tripped." This cross-sector blindness means cascade failures are detected only after they propagate, not before.

Munin addresses this by:
1. Ingesting time-series from multiple sectors via protocol translation
2. Inferring cross-sector "shadow links" via temporal correlation with lag detection
3. Simulating cascade propagation across the discovered dependency graph
4. Generating pre-validated playbooks that account for cross-sector effects

## ICS Security Best Practices (NIST SP 800-82)

Key recommendations from NIST SP 800-82 Rev 3 that Munin builds upon:

1. **Network segmentation**: Separate IT and OT networks with DMZs → Munin enforces via data diode
2. **Asset inventory**: Know what's connected → Munin automatically discovers assets from time-series
3. **Monitoring and detection**: Continuous monitoring for anomalies → Munin provides sensor health + cascade prediction
4. **Incident response**: Documented response procedures → Munin provides pre-validated playbooks
5. **Change management**: Track and audit all changes → Munin provides Merkle-chained audit trail

Munin extends these practices by adding:
- Cross-sector dependency discovery (not covered by current guidance)
- Pre-simulated response options (reducing authorization latency)
- Cryptographic authorization packets (defensible audit trail)
- Byzantine multi-sig governance (preventing single-actor abuse)

## References

- NIST SP 800-82 Rev 3: Guide to Operational Technology (OT) Security
- IEC 62443: Industrial Communication Networks — Security
- ISA-95 / IEC 62264: Enterprise-Control System Integration
- IEC 61850: Communication Networks and Systems for Power Utility Automation
