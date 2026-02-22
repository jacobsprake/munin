# How Munin is fast (single sign-off and time-to-authorize)

## Single sign-off (roadmap item 52)

Munin supports **minimum sign-off** so that in time-critical scenarios a single designated role can authorize a pre-validated playbook step, instead of waiting for multiple agencies.

- **Playbook configuration:** In the playbook YAML, under `approval_required`, any role can be marked with `minimum_sign_off: true`. When that role signs, the decision is **authorized immediately** (threshold = 1).
- **Engine:** `engine/packetize.py` → `determine_multi_sig_requirements()` reads `minimum_sign_off` and sets `threshold: 1` and `minimumSignOffRole`.
- **Result:** Authorization path is **&lt;2 minutes** when the designated officer signs, vs 2–6 hours in traditional cross-agency coordination.

## Time-to-authorize in packets

- Each handshake packet includes `timeToAuthorizeSeconds` (set when the first approval is received) and `timeToAuthorize` (human-readable). The Carlisle dashboard shows **Time-to-Authorize** and **Munin vs traditional** comparison (baseline 2–6 hours, Munin &lt;2 min).

## References

- Playbook example: `playbooks/carlisle_flood_gate_coordination.yaml`
- Packet schema: `engine/packetize.py` (multi-sig and time-to-authorize fields)
- Dashboard: `app/carlisle-dashboard/page.tsx` (metrics and comparison)
