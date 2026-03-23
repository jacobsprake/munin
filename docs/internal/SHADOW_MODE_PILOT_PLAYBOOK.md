# Shadow Mode Pilot Playbook

Complete guide for running a 6-12 month passive shadow mode deployment.

## Overview

Shadow Mode allows Munin to observe and learn from human operators without executing any commands. This provides a zero-risk pilot period where Munin demonstrates value before asking for trust.

## Duration

- **Minimum**: 6 months (180 days)
- **Recommended**: 12 months (365 days)
- **Maximum**: 18 months (for comprehensive evaluation)

## Prerequisites

1. **Engine Pipeline Running**: Munin engine must be operational and processing telemetry
2. **Incident Logging**: System must log all human operator actions during incidents
3. **Data Access**: Access to historical incident data for replay evaluation
4. **Stakeholder Buy-in**: Operators and management must understand shadow mode is passive only

## Setup

### 1. Initialize Shadow Mode Engine

```python
from shadow_simulation import ShadowModeEngine

# Initialize for 12-month pilot
engine = ShadowModeEngine(shadow_mode_duration_days=365)

# Configure cost models (optional - customize for your jurisdiction)
from shadow_simulation import ShadowModeEngine

custom_cost_models = {
    'flood': {
        'economic': {'rate_per_second': 150.0},
        'social': {'rate_per_second': 75.0},
        'environmental': {'rate_per_second': 35.0}
    }
}

engine = ShadowModeEngine(
    shadow_mode_duration_days=365,
    cost_models=custom_cost_models
)
```

### 2. Configure Incident Logging

Ensure your incident management system logs:
- Incident ID and type
- Human operator actions (commands, coordination, decisions)
- Action timestamps and durations
- Target nodes/assets
- Outcomes (success/partial/failure)

### 3. Set Up Data Collection

Create a process to regularly:
1. Extract incident logs from your systems
2. Transform to Munin's normalized format
3. Feed into shadow mode engine

## Operation

### Daily Operations

**Morning Routine:**
1. Check shadow mode status: `engine.is_active`
2. Review overnight incidents processed
3. Verify data collection is functioning

**During Incidents:**
1. Human operators respond normally (no changes to workflow)
2. Munin runs in parallel, generating predictions
3. All actions are recorded automatically

**End of Day:**
1. Review shadow mode metrics
2. Check for any errors or warnings
3. Archive daily data

### Weekly Review

**Metrics to Track:**
- Number of incidents observed
- Average time saved per incident
- Total damage prevented estimate
- Improvement ratio trends
- Correlation statistics (for soak testing)

**Review Process:**
1. Generate weekly shadow report: `engine.generate_shadow_mode_report()`
2. Review top improvements
3. Identify any anomalies or concerns
4. Share summary with stakeholders

### Monthly Deep Dive

**Analysis:**
1. Run replay harness on historical incidents
2. Compare Munin predictions vs. actual outcomes
3. Validate cost model assumptions
4. Review correlation statistics for consistency

**Reporting:**
1. Generate comprehensive monthly report
2. Include:
   - Summary statistics
   - Top 10 improvements
   - Cost-benefit analysis
   - Recommendations

## Data Collection

### Incident Log Format

```json
{
  "incident_id": "incident_flood_20260115_001",
  "timestamp": "2026-01-15T14:30:00Z",
  "type": "flood",
  "human_actions": [
    {
      "action_type": "coordination",
      "description": "Coordinated pump isolation across 3 agencies",
      "target_nodes": ["pump_01", "pump_02"],
      "duration_seconds": 14400,
      "outcome": "success",
      "operator_id": "operator_001",
      "coordination_parties": ["Water Authority", "Emergency Services"]
    }
  ]
}
```

### Automated Collection Script

```python
from shadow_simulation import ShadowModeEngine
from incident_id_standard import generate_incident_id
import json
from pathlib import Path

def collect_incident(incident_data: dict, engine: ShadowModeEngine):
    """Collect and process an incident."""
    incident_id = incident_data['incident_id']
    
    # Record human actions
    for action in incident_data.get('human_actions', []):
        engine.record_human_action(
            action_type=action['action_type'],
            description=action['description'],
            target_nodes=action['target_nodes'],
            duration_seconds=action['duration_seconds'],
            outcome=action['outcome'],
            operator_id=action.get('operator_id'),
            coordination_parties=action.get('coordination_parties', [])
        )
    
    # Generate Munin prediction
    munin_prediction = engine.generate_munin_prediction(
        incident_id,
        incident_data,
        graph,  # Load from engine/out/graph.json
        evidence  # Load from engine/out/evidence.json
    )
    
    # Compare
    human_action = engine.human_actions[-1]  # Last recorded
    comparison = engine.compare_human_vs_munin(
        incident_id,
        human_action,
        munin_prediction
    )
    
    return comparison
```

## Evaluation

### Key Metrics

1. **Time Saved**: Total seconds saved across all incidents
2. **Damage Prevented**: Estimated economic/social/environmental damage prevented
3. **Improvement Ratio**: Average speedup (e.g., 10x faster)
4. **Correlation**: Consistency between Munin predictions and human actions

### Success Criteria

**Minimum Viable:**
- 50+ incidents observed
- Average improvement ratio > 2x
- Total damage prevented > $1M (or equivalent)

**Strong Performance:**
- 100+ incidents observed
- Average improvement ratio > 5x
- Total damage prevented > $10M
- Correlation > 0.7 (high consistency)

### Reporting

**Monthly Report Template:**

```markdown
# Shadow Mode Monthly Report - [Month Year]

## Summary
- Incidents Observed: [N]
- Total Time Saved: [X hours]
- Total Damage Prevented: $[Y]
- Average Improvement: [Z]x faster

## Top Improvements
1. [Incident ID]: [Time saved], [Damage prevented]
2. ...

## Trends
- Improvement ratio: [trending up/down/stable]
- Correlation: [value] (target: >0.7)

## Recommendations
- [Action items]
```

## Troubleshooting

### Common Issues

**No incidents being processed:**
- Check incident log format matches expected schema
- Verify data collection script is running
- Check engine logs for errors

**Low improvement ratios:**
- Review cost models - may need adjustment
- Check if human response times are realistic
- Verify Munin predictions are being generated correctly

**High correlation variance:**
- Review evidence quality
- Check graph stability
- Consider longer pilot period

## Transition to Active Mode

After successful shadow mode pilot:

1. **Review Final Report**: Comprehensive 6-12 month analysis
2. **Stakeholder Approval**: Get sign-off from operators and management
3. **Configuration**: Update Munin to active mode (with safeguards)
4. **Training**: Train operators on Munin's active capabilities
5. **Phased Rollout**: Start with low-consequence actions, gradually increase

## Support

For questions or issues:
- Check engine logs: `engine/out/engine_log.jsonl`
- Review shadow report: `engine/out/shadow_report.json`
- Contact Munin support team

## Appendix

### Cost Model Customization

See `engine/shadow_simulation.py` `_get_default_cost_models()` for template.

### Replay Harness Usage

```python
from shadow_replay import ShadowReplayHarness

harness = ShadowReplayHarness(engine)
results = harness.batch_replay(
    incidents=incidents,
    human_actions_map=human_actions_map,
    graph=graph,
    evidence=evidence
)
harness.save_replay_results(Path("engine/out/replay_results.json"))
```
