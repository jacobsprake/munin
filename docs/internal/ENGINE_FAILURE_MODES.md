# Engine Failure Modes

Common failure patterns and remediation procedures.

## Ingest Failures

### File Not Found
- **Error Code**: E1001
- **Symptoms**: Cannot read input CSV files
- **Remediation**: Check data directory path, verify file permissions

### Invalid Format
- **Error Code**: E1002
- **Symptoms**: CSV parsing errors, missing columns
- **Remediation**: Validate CSV format, check column names (timestamp, node_id, value)

### Corrupt Data
- **Error Code**: E1005
- **Symptoms**: NaN values, invalid timestamps
- **Remediation**: Clean input data, handle missing values

## Graph Inference Failures

### Insufficient Data
- **Error Code**: E2001
- **Symptoms**: Not enough samples for correlation
- **Remediation**: Increase data collection period, reduce min_samples threshold

### Memory Error
- **Error Code**: E2003
- **Symptoms**: Out of memory during correlation computation
- **Remediation**: Enable sparse handling, use downsampling, increase RAM

### Computation Failed
- **Error Code**: E2002
- **Symptoms**: Correlation computation errors
- **Remediation**: Check data quality, verify numeric columns

## Incident Simulation Failures

### Invalid Graph
- **Error Code**: E3001
- **Symptoms**: Graph structure errors, missing nodes
- **Remediation**: Validate graph.json, check node IDs

### Simulation Failed
- **Error Code**: E3002
- **Symptoms**: Cascade simulation errors
- **Remediation**: Check graph connectivity, verify incident parameters

## Packet Generation Failures

### Missing Playbook
- **Error Code**: E4001
- **Symptoms**: No matching playbook for incident type
- **Remediation**: Create playbook, check playbook directory

### Generation Failed
- **Error Code**: E4002
- **Symptoms**: Packet creation errors
- **Remediation**: Check playbook format, verify evidence references

## Recovery Procedures

### Resume from Checkpoint
```bash
python -m engine.run --resume-from graph --out-dir engine/out
```

### Verify Outputs
```bash
python engine/tools/sanity_check_outputs.py engine/out
```

### Check Logs
```bash
tail -f engine/out/engine_log.jsonl
```
