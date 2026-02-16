# Performance Budget

Target runtimes and resource usage for engine pipeline stages.

## Target Runtimes

### Graph Inference

| Nodes | Samples | Target Runtime | Max Runtime |
|-------|---------|---------------|-------------|
| 1,000  | 10,000  | < 30s         | 60s         |
| 5,000  | 50,000  | < 2min        | 5min        |
| 10,000 | 100,000 | < 5min        | 10min       |
| 50,000 | 500,000 | < 20min       | 40min       |
| 100,000| 1M      | < 45min       | 90min       |

### Memory Usage

| Nodes | Samples | Target RAM | Max RAM |
|-------|---------|------------|---------|
| 1,000  | 10,000  | < 500MB    | 1GB      |
| 5,000  | 50,000  | < 2GB      | 4GB      |
| 10,000 | 100,000 | < 4GB      | 8GB      |
| 50,000 | 500,000 | < 16GB     | 32GB     |
| 100,000| 1M      | < 32GB     | 64GB     |

## Performance Regression Thresholds

- **Runtime**: New commits must not exceed budget by >20%
- **Memory**: New commits must not exceed budget by >30%
- **Throughput**: Must maintain or improve nodes/sec and samples/sec

## Hardware Sizing Guidance

See `docs/PERFORMANCE_SIZING.md` for detailed hardware recommendations.
