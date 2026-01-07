# Munin Backend Architecture

## Overview

The Munin backend is a hybrid system that combines:
- **Next.js API Routes** for HTTP endpoints
- **SQLite Database** for persistent storage (PostgreSQL-ready)
- **Python Engine** for data processing and inference
- **File-based fallback** for backward compatibility

## Architecture Components

### 1. Database Layer (`lib/db/`)

**SQLite Database** with the following schema:
- `sensor_readings` - Real-time telemetry data
- `nodes` - Infrastructure nodes (substations, pumps, etc.)
- `edges` - Dependency relationships between nodes
- `evidence_windows` - Time-windowed evidence for edges
- `incidents` - Simulated incident scenarios
- `handshake_packets` - Authoritative handshake execution packets
- `audit_log` - Immutable audit trail
- `engine_jobs` - Background job tracking
- `users` - Authentication and authorization

**Key Files:**
- `lib/db/index.ts` - Database initialization and connection
- `lib/db/schema.ts` - TypeScript type definitions
- `lib/db/repositories.ts` - Data access layer (repositories pattern)

### 2. API Endpoints

#### Data Ingestion
- `POST /api/sensors/data` - Ingest real-time sensor telemetry
- `GET /api/sensors/data?nodeId=X&start=Y&end=Z` - Query sensor readings

#### Graph & Evidence
- `GET /api/graph` - Get dependency graph (nodes + edges)
- `GET /api/evidence?edgeId=X` - Get evidence windows (optionally filtered by edge)

#### Incidents & Packets
- `GET /api/incidents?id=X&type=Y` - Get incidents (with filtering)
- `GET /api/packets?id=X&status=Y` - Get handshake packets (with filtering)
- `POST /api/authorize` - Authorize a packet (requires authentication)

#### Engine Control
- `POST /api/engine/run` - Trigger Python engine pipeline
- `GET /api/engine/run?jobId=X` - Get job status
- `POST /api/engine/sync` - Manually sync engine outputs to database

#### System
- `GET /api/health` - System health and status
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/users` - Create new user

### 3. Data Flow

```
Sensor Data → POST /api/sensors/data → Database
                                    ↓
Python Engine → run.py → JSON files → POST /api/engine/sync → Database
                                    ↓
Frontend → GET /api/* → Database (with file fallback)
```

### 4. Background Processing

The Python engine runs asynchronously:
1. `POST /api/engine/run` creates a job record
2. Spawns Python process in background
3. Job status tracked in `engine_jobs` table
4. On completion, outputs can be synced to database via `/api/engine/sync`

### 5. Authentication

Basic authentication system:
- Passphrases hashed with SHA-256
- Users stored in `users` table
- `/api/authorize` requires valid credentials
- Roles: `operator`, `admin` (extensible)

## Database Setup

The database is automatically initialized on first use. The SQLite file is created at:
- Development: `data/munin.db`
- Production: Set `DATABASE_PATH` environment variable

## Migration Path to PostgreSQL

The schema is designed to be PostgreSQL-compatible. To migrate:

1. Replace `better-sqlite3` with `pg` or `postgres` client
2. Update connection string in `lib/db/index.ts`
3. Adjust SQL syntax if needed (SQLite is mostly compatible)
4. Update data types (e.g., `DATETIME` → `TIMESTAMP`)

## Real-Time Updates

Currently, the system uses polling. For production real-time updates:

1. **WebSockets**: Add WebSocket server (e.g., using `ws` package)
2. **SSE**: Use Server-Sent Events (requires custom Next.js server)
3. **Message Queue**: Integrate Redis Pub/Sub or similar

See `app/api/events/route.ts` for placeholder structure.

## API Usage Examples

### Ingest Sensor Data
```bash
curl -X POST http://localhost:3000/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "node_01",
    "timestamp": "2026-01-07T10:00:00Z",
    "value": 123.45
  }'
```

### Batch Ingest
```bash
curl -X POST http://localhost:3000/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '[
    {"nodeId": "node_01", "timestamp": "2026-01-07T10:00:00Z", "value": 123.45},
    {"nodeId": "node_02", "timestamp": "2026-01-07T10:00:00Z", "value": 67.89}
  ]'
```

### Trigger Engine Run
```bash
curl -X POST http://localhost:3000/api/engine/run
```

### Sync Engine Outputs
```bash
curl -X POST http://localhost:3000/api/engine/sync
```

### Query Sensor Data
```bash
curl "http://localhost:3000/api/sensors/data?nodeId=node_01&start=2026-01-07T00:00:00Z&end=2026-01-07T23:59:59Z"
```

### Create User
```bash
curl -X POST http://localhost:3000/api/auth/users \
  -H "Content-Type: application/json" \
  -d '{
    "operatorId": "operator_01",
    "passphrase": "secure_password",
    "role": "operator"
  }'
```

## Dependencies

Required npm packages:
- `better-sqlite3` - SQLite database client
- `@types/better-sqlite3` - TypeScript types

Install with:
```bash
npm install better-sqlite3 @types/better-sqlite3
```

## Environment Variables

- `DATABASE_PATH` - Path to SQLite database file (default: `data/munin.db`)
- `DEPLOYMENT_MODE` - Deployment mode: `lab_demo`, `on_prem_ot`, `sovereign_cloud`

## Backward Compatibility

All API endpoints maintain backward compatibility:
1. First attempt to read from database
2. If database is empty, fall back to file-based approach
3. Automatically sync file data to database on first read

This ensures existing workflows continue to work while new data flows through the database.

## Performance Considerations

- **SQLite WAL Mode**: Enabled for better concurrency
- **Batch Inserts**: Use `insertBatch` methods for bulk operations
- **Indexes**: Added on frequently queried columns (node_id, timestamp, etc.)
- **Connection Pooling**: SQLite doesn't need pooling, but PostgreSQL migration should include it

## Security Notes

- Passphrases are hashed (SHA-256) before storage
- In production, use stronger hashing (bcrypt, argon2)
- Add JWT tokens for session management
- Implement rate limiting on public endpoints
- Add CORS configuration for cross-origin requests
- Validate all inputs to prevent SQL injection (prepared statements used throughout)

## Future Enhancements

1. **Real-time Streaming**: WebSocket/SSE implementation
2. **Advanced Authentication**: JWT tokens, OAuth2
3. **Query Optimization**: Add more indexes, query caching
4. **Background Jobs**: Proper job queue (Bull, BullMQ)
5. **Data Retention**: Automatic cleanup of old sensor readings
6. **Backup/Recovery**: Automated database backups
7. **Monitoring**: Metrics and logging integration
8. **API Versioning**: Versioned API endpoints

