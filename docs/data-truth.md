# Munin Data Truth: Handling Dirty OT Telemetry

## Philosophy

Munin does not hide the ugly reality of operational technology (OT) data. Instead, it **surfaces data quality issues** and demonstrates robust inference under degradation. This is hyperfluency: understanding protocols, data loss, and physics.

## Dirty Data Realities

### Irregular Sampling
**Problem**: Sensors don't always report at consistent intervals.  
**Handling**: Window-based alignment with tolerance for missing samples. Evidence windows account for irregularity.

### Missing Timestamps
**Problem**: Some data points lack timestamps or have invalid timestamps.  
**Handling**: Timestamp validation and interpolation. Missing timestamps flagged in quality context.

### Duplicated Rows
**Problem**: Historian systems sometimes duplicate entries.  
**Handling**: Deduplication based on timestamp + value. Duplicate detection in preprocessing.

### Stale Values
**Problem**: Sensors can get "stuck" reporting the same value.  
**Handling**: Stuck-at detection via variance analysis. Sensor health monitoring flags stuck sensors.

### Drift
**Problem**: Sensor calibration drifts over time, causing systematic bias.  
**Handling**: Rolling mean shift detection. Drift score in observability metrics. Confidence degrades gracefully.

### Timestamp Skew
**Problem**: Sensor clocks can be wrong, causing temporal misalignment.  
**Handling**: Jitter analysis in intervals. Timestamp skew score. Lag estimation accounts for skew.

## Quality Metrics

### Missingness Rate
- Percentage of missing values in a window
- Threshold: >10% triggers degraded status
- Impact: Reduces evidence window count

### Noise Score
- Coefficient of variation (variance / mean)
- Normalized to 0-1 scale
- High noise reduces confidence

### Drift Score
- Rolling mean shift detection
- Compares first half vs second half of window
- >2 standard deviations = drift detected

### Timestamp Skew Score
- Jitter in sampling intervals
- Standard deviation of intervals / median interval
- High skew widens confidence bands

## Observability Score

Rolled up from individual quality metrics:

```
observability = 1.0 - (
  missingness_rate * 0.4 +
  noise_score * 0.3 +
  drift_score * 0.2 +
  skew_score * 0.1
)
```

**Drivers**: List of specific issues contributing to low observability.

## Evidence Window Quality Context

Each evidence window includes:

```typescript
qualityContext: {
  missingness: number;    // 0-1, percentage missing
  noiseScore: number;     // 0-1, normalized noise
  driftScore: number;     // 0-1, normalized drift
}
```

This allows users to assess evidence quality, not just correlation strength.

## Sensor Degradation Modes (Demo)

For demonstration purposes, Munin can inject degradation:

- **Drift**: Linear drift over time
- **Missingness**: Random missing values
- **Stuck-at**: Constant value after a point
- **Timestamp Skew**: Shifted timestamps
- **Combined**: Multiple degradations

When degradation is active:
- Sensor health status changes
- Edge confidence scores decrease
- Simulation confidence bands widen
- System does NOT collapse

## Protocol Deep-Dive

The Protocol Deep-Dive screen shows:

- Raw hex streams (or sample lines)
- Decoded protocol fields (address, function code, payload)
- Packet timing and retries
- Dirty data showcase toggles

This shows Munin understands the plumbing, not just high-level abstractions.

## Example: Handling Missing Data

```
Original Series: [10, 12, NaN, 14, NaN, 16, 18]
Window: 7 samples, 2 missing (28.6% missingness)

Handling:
1. Drop NaN for correlation computation
2. Flag missingness in quality context
3. Reduce evidence window count
4. Widen confidence bands in simulation
5. Do NOT fail or crash
```

## Example: Detecting Drift

```
First Half Mean: 50.0, Std: 2.0
Second Half Mean: 55.0, Std: 2.0
Mean Difference: 5.0
Pooled Std: 2.0
Drift Score: 5.0 / (2 * 2.0) = 1.25 (> 2.0 threshold)

Result: Drift detected, observability reduced
```

## Best Practices

1. **Surface, Don't Hide**: Show data quality issues in UI
2. **Graceful Degradation**: Reduce confidence, don't fail
3. **Transparency**: Quality context in evidence windows
4. **Robustness**: Multiple windows, stability scores
5. **Hyperfluency**: Understand protocols and physics

## UI Indicators

- **Sensor Health**: Status (ok/degraded/warning) with score
- **Observability**: Score with drivers list
- **Quality Context**: Missingness, noise, drift in evidence windows
- **Confidence Bands**: Wider under degradation
- **Protocol Deep-Dive**: Raw data inspection

## Data Truth Checklist

✅ Handles irregular sampling  
✅ Detects and flags missing data  
✅ Identifies stuck sensors  
✅ Detects drift  
✅ Accounts for timestamp skew  
✅ Surfaces quality issues in UI  
✅ Degrades gracefully under issues  
✅ Provides quality context in evidence  
✅ Shows raw protocol data  
✅ Demonstrates hyperfluency  

## Future Enhancements

- Advanced interpolation methods
- Machine learning for anomaly detection
- Cross-sensor validation
- Historical pattern matching
- Automated calibration detection

