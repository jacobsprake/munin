--------------------------- MODULE PacketProtocol ---------------------------
(*
 * TLA+ specification of the Munin packet authorization protocol.
 *
 * Models the lifecycle of command packets from creation through multi-party
 * signing to final authorization, with an append-only audit chain.
 *
 * Safety invariants:
 *   - QuorumRequired:   No packet is authorized without at least M signatures.
 *   - NoConflict:       No two conflicting packets are both authorized.
 *   - AuditMonotonic:   The audit chain length never decreases.
 *
 * To model-check:
 *   tlc PacketProtocol.tla -config PacketProtocol.cfg
 *)
--------------------------------------------------------------------------

EXTENDS Integers, Sequences, FiniteSets

CONSTANTS
    Signers,           \* set of authorized signers (e.g. {"s1","s2","s3"})
    M,                 \* quorum threshold (number of signatures required)
    MaxPackets,        \* bound on total packets for finite model checking
    ConflictPairs      \* set of pairs {p1, p2} that conflict with each other

VARIABLES
    packets,           \* function: packet id -> record [status, sigs, target]
    nextPacketId,      \* monotonically increasing packet id counter
    auditChain         \* sequence of audit log entries (append-only)

vars == <<packets, nextPacketId, auditChain>>

--------------------------------------------------------------------------
(* Type definitions *)

PacketStatus == {"created", "signing", "authorized", "rejected"}

TypeInvariant ==
    /\ nextPacketId \in 1..(MaxPackets + 1)
    /\ \A id \in DOMAIN packets :
        /\ packets[id].status \in PacketStatus
        /\ packets[id].sigs \subseteq Signers
        /\ packets[id].target \in STRING

--------------------------------------------------------------------------
(* Initial state *)

Init ==
    /\ packets = [id \in {} |-> [status |-> "created", sigs |-> {}, target |-> ""]]
    /\ nextPacketId = 1
    /\ auditChain = <<>>

--------------------------------------------------------------------------
(* Actions *)

(*
 * CreatePacket: A new packet enters the system in "created" status.
 *)
CreatePacket(target) ==
    /\ nextPacketId <= MaxPackets
    /\ LET id == nextPacketId
       IN
        /\ packets' = packets @@ (id :> [status |-> "created",
                                          sigs   |-> {},
                                          target |-> target])
        /\ nextPacketId' = nextPacketId + 1
        /\ auditChain' = Append(auditChain,
                                [action |-> "CREATE", packetId |-> id,
                                 target |-> target])

(*
 * SignPacket: An authorized signer adds their signature to a packet.
 *            Packet transitions to "signing" on first signature.
 *)
SignPacket(id, signer) ==
    /\ id \in DOMAIN packets
    /\ signer \in Signers
    /\ packets[id].status \in {"created", "signing"}
    /\ signer \notin packets[id].sigs
    /\ packets' = [packets EXCEPT
        ![id].sigs   = packets[id].sigs \union {signer},
        ![id].status = "signing"]
    /\ auditChain' = Append(auditChain,
                            [action |-> "SIGN", packetId |-> id,
                             signer |-> signer])
    /\ UNCHANGED nextPacketId

(*
 * AuthorizePacket: When a packet has gathered at least M signatures it
 *                  may be authorized — provided no conflicting packet is
 *                  already authorized.
 *)
AuthorizePacket(id) ==
    /\ id \in DOMAIN packets
    /\ packets[id].status = "signing"
    /\ Cardinality(packets[id].sigs) >= M
    \* Conflict check: no conflicting packet already authorized
    /\ \A otherId \in DOMAIN packets :
        (otherId /= id /\ packets[otherId].status = "authorized")
        => ~ ({id, otherId} \in ConflictPairs)
    /\ packets' = [packets EXCEPT ![id].status = "authorized"]
    /\ auditChain' = Append(auditChain,
                            [action |-> "AUTHORIZE", packetId |-> id,
                             sigCount |-> Cardinality(packets[id].sigs)])
    /\ UNCHANGED nextPacketId

(*
 * RejectPacket: A packet can be explicitly rejected (e.g. timeout, veto).
 *)
RejectPacket(id) ==
    /\ id \in DOMAIN packets
    /\ packets[id].status \in {"created", "signing"}
    /\ packets' = [packets EXCEPT ![id].status = "rejected"]
    /\ auditChain' = Append(auditChain,
                            [action |-> "REJECT", packetId |-> id])
    /\ UNCHANGED nextPacketId

--------------------------------------------------------------------------
(* Next-state relation *)

Next ==
    \/ \E t \in {"valve_open", "pump_start", "gate_close", "turbine_adjust"} :
           CreatePacket(t)
    \/ \E id \in DOMAIN packets, s \in Signers :
           SignPacket(id, s)
    \/ \E id \in DOMAIN packets :
           AuthorizePacket(id)
    \/ \E id \in DOMAIN packets :
           RejectPacket(id)

--------------------------------------------------------------------------
(* Fairness — weak fairness on authorization so liveness can be checked *)

Fairness ==
    \A id \in 1..MaxPackets :
        WF_vars(AuthorizePacket(id))

--------------------------------------------------------------------------
(* Specification *)

Spec == Init /\ [][Next]_vars /\ Fairness

--------------------------------------------------------------------------
(* Safety invariants *)

(*
 * QuorumRequired: No packet is authorized unless it has at least M
 * signatures from distinct authorized signers.
 *)
QuorumRequired ==
    \A id \in DOMAIN packets :
        packets[id].status = "authorized"
        => Cardinality(packets[id].sigs) >= M

(*
 * NoConflict: No two packets that are declared as conflicting may both
 * be in "authorized" status simultaneously.
 *)
NoConflict ==
    \A pair \in ConflictPairs :
        ~ (\A id \in pair :
            id \in DOMAIN packets /\ packets[id].status = "authorized")

(*
 * AuditMonotonic: The audit chain is append-only — its length never
 * decreases between states.
 *)
AuditMonotonic ==
    Len(auditChain') >= Len(auditChain)

(* Combined invariant for model-checking *)
SafetyInvariant ==
    /\ QuorumRequired
    /\ NoConflict

==========================================================================
