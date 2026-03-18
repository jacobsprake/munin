# The Munin Doctrine

## The non-obvious insight

The most dangerous failure mode in critical infrastructure is not technical. It is not a cyberattack, a sensor failure, or a software bug. It is **authorization latency** — the time between "we know what's happening" and "someone with authority signs off on the response."

Modern infrastructure cascades propagate in minutes. A power substation trips. Thirty seconds later, downstream water pumps lose power. Two minutes later, residential water pressure drops. Five minutes later, hospital backup generators begin failing. The physics doesn't wait for committee approval.

But the response does. Cross-agency coordination — the meetings, the phone calls, the legal checks, the sign-off chains — operates on timescales of hours. By the time authorization arrives, the cascade has already consumed entire sectors.

**This is not a technology problem waiting for better sensors. It is a governance problem waiting for better infrastructure.**

## What Munin actually is

Munin is the missing layer between operational systems (SCADA) and authority (Law).

It does three things that no existing system does:

**1. It sees across sectors.** Current monitoring tools are sectoral — water watches water, power watches power. Nobody watches the *dependencies between them*. Munin discovers these "shadow links" automatically from time-series correlation, finding relationships that exist in physics but not in any database.

**2. It pre-computes the decision.** For every conceivable cascade scenario, Munin has already simulated the outcome, matched it to a playbook, checked it against regulations, and packaged the evidence into a cryptographic authorization packet. When a crisis hits, operators don't start from scratch — they review and sign.

**3. It makes the authorization defensible.** Every packet carries: the evidence chain (which sensors, which correlations, which confounders), explicit uncertainty (confidence intervals, counterexample windows), the regulatory basis (which laws authorize this action), and a multi-party signature chain (M-of-N ministries must co-sign). This is not a dashboard. It is a legal instrument.

## The contrarian bet

Most infrastructure security companies sell monitoring. More dashboards, more alerts, more data for humans who are already drowning in data.

Munin bets on the opposite: **the data is not the bottleneck. The authorization is.** If you pre-compute the decision to the point where an operator can approve it in under a minute — with full evidence, full uncertainty disclosure, full legal basis, and cryptographic audit trail — you can compress a 6-hour coordination process into a 5-minute review.

This means Munin is not competing with SCADA vendors or SIEM platforms. It is competing with *meetings*. The product it replaces is the 3 AM conference call where six agencies try to figure out who has authority to do what.

## Why read-only is a feature, not a limitation

Munin v1 cannot control infrastructure. It cannot open a valve, trip a breaker, or send a command to a PLC. This is enforced by hardware (data diode — unidirectional data flow), by software (compile-time and runtime guards that prevent any write path), and by governance (constitutional constraints that no operator can override alone).

This is not temporary. This is doctrine.

The moment a system can act on infrastructure, it becomes a weapon as much as a shield. An advisory system that is *constitutionally incapable* of actuation is a fundamentally different trust proposition than one that promises not to act but technically could.

Read-only architecture is Munin's most important safety property.

## Why post-quantum cryptography matters for infrastructure

Authorization packets signed today must remain defensible for the 30-50 year operational lifetime of the assets they protect. NIST finalized ML-DSA (FIPS 204) in 2024 and warns that quantum computers will break RSA and ECC within the next decade.

Munin uses dual-stack signatures — classical Ed25519 and post-quantum ML-DSA — on every authorization packet and audit log entry. Both must verify. This means packets signed today cannot be forged retroactively by a future quantum adversary.

No other infrastructure decision-support system does this. Most don't even use cryptographic signatures.

## Why multi-ministry signing matters

Infrastructure crises cross organizational boundaries. A flood response requires coordination between water authorities, power grid operators, telecommunications providers, emergency services, and central government.

Munin's authorization packets require M-of-N cryptographic signatures from independent ministries. No single ministry can unilaterally authorize a dangerous action. No single compromised key can forge an authorization. This is Byzantine fault tolerance applied to governance — the same principle that secures distributed systems, applied to the distributed authority structure of national infrastructure.

This also provides authoritarian-abuse resistance. A government that co-opts one agency cannot use Munin to selectively deny services, because the quorum requirement means independent parties must co-sign.

## What this becomes

Munin starts as a flood-and-water wedge in one geography. One sector, one country, read-only.

But the architecture is sector-agnostic. The protocol translator handles Modbus, DNP3, BACnet, IEC 61850, OPC UA. The digital twin models power, water, and telecom simultaneously. The governance framework handles any M-of-N authority structure.

The end state is a sovereign orchestration layer that any nation can deploy — air-gapped, on their own hardware, with their own keys, under their own authority — to protect infrastructure they didn't build from threats they can't fully predict.

The market for this is every nation that has critical infrastructure and doesn't fully trust the hardware it runs on. That's all of them.

## What I'm doing next

Regardless of external funding or support, the next 3 months are:

1. **Pilot conversations** with UK water authorities and Environment Agency contacts to validate the shadow-link discovery on real (not synthetic) SCADA historian data.
2. **Digital twin calibration** against the Carlisle Storm Desmond dataset and at least one additional historical UK flood event.
3. **Formal safety assessment** — engaging an independent safety assessor to review the safety case and STPA analysis.
4. **Hardware TEE integration** — moving from software attestation fallback to actual Intel SGX or AMD SEV enclaves for Logic-Lock enforcement.

This is happening whether anyone funds it or not. The problem is real, the architecture works, and the window before quantum computing makes current signature schemes obsolete is closing.

---

*Munin: named for the raven in Norse mythology who flies across the world and reports back what he sees. Munin sees. Humans decide.*
