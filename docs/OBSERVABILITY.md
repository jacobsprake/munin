# Observability Architecture

Complete observability architecture for Munin's control room interfaces.

## Overview

Munin provides comprehensive observability through:

- **Metrics**: Prometheus-compatible metrics export
- **Tracing**: Distributed trace IDs for end-to-end request tracking
- **Logging**: Structured JSON logs with correlation IDs
- **Health Checks**: Liveness and readiness probes

## Metrics

### Endpoints

- `/api/metrics` - Prometheus-compatible metrics
- `/api/metrics/export` - Export metrics in CSV/JSON format

### Key Metrics

- `munin_nodes_total` - Total infrastructure nodes
- `munin_edges_total` - Total dependency edges
- `munin_incidents_total` - Total incidents detected
- `munin_packets_total` - Total handshake packets generated
- `munin_engine_jobs_total` - Total engine jobs executed
- `munin_engine_job_duration_seconds` - Average job duration

## Tracing

### Trace ID Propagation

Trace IDs flow through:
1. Frontend requests (via `x-trace-id` header)
2. API routes (logged in structured logs)
3. Engine pipeline (via CLI args)
4. Audit log entries

### Correlation IDs

- **Incident IDs**: Link incidents → packets → audits
- **Packet IDs**: Link packets → approvals → executions
- **Run IDs**: Link engine runs → outputs → reports

## Logging

### Structured Logs

All logs are JSON-formatted with:
- Timestamp
- Level (debug, info, warn, error)
- Trace ID
- Correlation IDs
- Context data

### Log Locations

- Engine: `engine/out/engine_log.jsonl`
- API: Application logs (stdout/stderr)
- Audit: Immutable audit log

## Health Checks

### Endpoints

- `/api/health` - Basic health check
- `/api/health/liveness` - Kubernetes liveness probe
- `/api/health/readiness` - Kubernetes readiness probe

### Readiness Checks

- Database connectivity
- Engine output directory exists
- Configuration files present
- Data directory accessible

## QA Dashboard

### Endpoint

- `/api/qa/dashboard` - Internal QA dashboard

### Metrics

- Test results (pass/fail, last run time)
- System invariants (graph structure, signatures)
- Engine job status
- System health

## Integration

### Prometheus

```yaml
scrape_configs:
  - job_name: 'munin'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

### Grafana

Import dashboards from `docs/grafana/` directory.

## Best Practices

1. **Always include trace IDs** in logs and API responses
2. **Use correlation IDs** to link related operations
3. **Monitor key metrics** for performance regressions
4. **Set up alerts** for critical failures
5. **Review QA dashboard** regularly for system health
