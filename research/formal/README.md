# Formal Verification with TLA+ / TLC

This directory contains TLA+ specifications for Munin's core protocols.

## Prerequisites

Install the TLA+ tools (TLC model checker + TLAPS proof system).

### Option A: TLA+ Toolbox (GUI)

Download from <https://github.com/tlaplus/tlaplus/releases>.  The Toolbox
bundles TLC and a spec editor.

### Option B: Command-line TLC

```bash
# 1. Download the tla2tools JAR (requires Java 11+)
curl -LO https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar

# 2. Verify Java is available
java -version   # must be >= 11

# 3. (Optional) Create an alias
alias tlc='java -jar /path/to/tla2tools.jar'
```

### Option C: VS Code Extension

Install the **TLA+ Nightly** extension from the VS Code marketplace.  It
provides syntax highlighting, model checking, and inline error reporting.

## Running the Model Checker

### PacketProtocol

The specification models the packet authorization protocol with quorum
signing, conflict detection, and an append-only audit chain.

1. Create a configuration file `PacketProtocol.cfg` (or use the one
   provided):

```
CONSTANTS
    Signers = {"s1", "s2", "s3"}
    M = 2
    MaxPackets = 3
    ConflictPairs = {{1, 2}}

INIT Init
NEXT Next

INVARIANTS
    QuorumRequired
    NoConflict
```

2. Run TLC:

```bash
java -jar tla2tools.jar -config PacketProtocol.cfg PacketProtocol.tla
```

TLC will exhaustively explore the state space and report any invariant
violations.  A successful run prints `Model checking completed. No error
has been found.`

## What the Invariants Guarantee

| Invariant        | Meaning                                                    |
|------------------|------------------------------------------------------------|
| QuorumRequired   | No packet is authorized without at least M distinct signatures |
| NoConflict       | Two conflicting packets cannot both be authorized          |
| AuditMonotonic   | The audit log never shrinks (append-only)                  |

## Extending the Specs

- Add new actions to `Next` to model additional protocol steps.
- Add temporal properties (liveness) using `Spec` with fairness.
- Increase `MaxPackets` and `Signers` to explore larger state spaces
  (note: state space grows exponentially).
