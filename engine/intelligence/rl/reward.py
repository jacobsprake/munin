"""
Multi-objective reward function for infrastructure response optimisation.

Balances four objectives:
  1. Minimise authorization latency
  2. Minimise cascade damage (affected assets)
  3. Ensure compliance (all required signatures obtained)
  4. Maintain audit trail completeness
"""

from __future__ import annotations


def compute_reward(
    authorization_latency_minutes: float,
    cascade_affected_count: int,
    all_signatures_obtained: bool,
    audit_trail_complete: bool,
) -> float:
    """Compute the multi-objective response reward.

    Parameters
    ----------
    authorization_latency_minutes : float
        Total authorization processing time in minutes.
    cascade_affected_count : int
        Number of infrastructure assets affected by the cascade.
    all_signatures_obtained : bool
        Whether all required ministry signatures have been obtained.
    audit_trail_complete : bool
        Whether the audit trail is complete and valid.

    Returns
    -------
    float
        Total reward (negative = bad, less negative = better).

    Notes
    -----
    Reward decomposition:
        latency_reward    = -1.0 * authorization_latency_minutes
        damage_reward     = -0.5 * cascade_affected_count
        compliance_penalty = -100.0 if not all_signatures_obtained else 0.0
        audit_penalty      = -50.0 if not audit_trail_complete else 0.0
    """
    latency_reward = -1.0 * authorization_latency_minutes
    damage_reward = -0.5 * cascade_affected_count
    compliance_penalty = -100.0 if not all_signatures_obtained else 0.0
    audit_penalty = -50.0 if not audit_trail_complete else 0.0

    return latency_reward + damage_reward + compliance_penalty + audit_penalty


def compute_reward_detailed(
    authorization_latency_minutes: float,
    cascade_affected_count: int,
    all_signatures_obtained: bool,
    audit_trail_complete: bool,
) -> dict:
    """Same as compute_reward but returns the breakdown.

    Returns
    -------
    dict with keys: 'total', 'latency', 'damage', 'compliance', 'audit'.
    """
    latency_reward = -1.0 * authorization_latency_minutes
    damage_reward = -0.5 * cascade_affected_count
    compliance_penalty = -100.0 if not all_signatures_obtained else 0.0
    audit_penalty = -50.0 if not audit_trail_complete else 0.0

    total = latency_reward + damage_reward + compliance_penalty + audit_penalty

    return {
        "total": total,
        "latency": latency_reward,
        "damage": damage_reward,
        "compliance": compliance_penalty,
        "audit": audit_penalty,
    }
