# Backend Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install better-sqlite3 @types/better-sqlite3
```

### 2. Initialize Database

The database will be automatically created on first API call. It will be located at:
- `data/munin.db` (default)

### 3. Sync Existing Data (Optional)

If you have existing engine output files, sync them to the database:

```bash
curl -X POST http://localhost:3000/api/engine/sync
```

Or trigger a new engine run:

```bash
curl -X POST http://localhost:3000/api/engine/run
```

### 4. Create Initial User

```bash
curl -X POST http://localhost:3000/api/auth/users \
  -H "Content-Type: application/json" \
  -d '{
    "operatorId": "admin",
    "passphrase": "your_secure_password",
    "role": "operator"
  }'
```

## What Was Built

### ✅ Database Layer
- SQLite database with 8 tables
- Repository pattern for data access
- Automatic schema initialization
- PostgreSQL-ready migration path

### ✅ API Endpoints

**Data Ingestion:**
- `POST /api/sensors/data` - Real-time sensor telemetry
- `GET /api/sensors/data?nodeId=X` - Query sensor readings

**Graph & Evidence:**
- `GET /api/graph` - Dependency graph (now uses database)
- `GET /api/evidence?edgeId=X` - Evidence windows with filtering

**Incidents & Packets:**
- `GET /api/incidents?id=X&type=Y` - Filtered incident queries
- `GET /api/packets?id=X&status=Y` - Filtered packet queries
- `POST /api/authorize` - Enhanced with database audit logging

**Engine Control:**
- `POST /api/engine/run` - Trigger Python pipeline
- `GET /api/engine/run?jobId=X` - Job status
- `POST /api/engine/sync` - Sync engine outputs to database

**System:**
- `GET /api/health` - System health monitoring
- `POST /api/auth/login` - User authentication
- `POST /api/auth/users` - User creation

### ✅ Features

1. **Backward Compatibility**: All endpoints fall back to file-based approach if database is empty
2. **Automatic Sync**: Engine outputs are automatically synced to database on first read
3. **Background Jobs**: Python engine runs asynchronously with job tracking
4. **Authentication**: Basic auth system with passphrase hashing
5. **Audit Logging**: Dual logging (file + database) for compliance
6. **Query Filtering**: All list endpoints support filtering and pagination

## Architecture

```
┌─────────────────┐
│  Frontend (UI)  │
└────────┬────────┘
         │
┌────────▼────────────────────────┐
│   Next.js API Routes            │
│  - /api/sensors/data            │
│  - /api/graph                   │
│  - /api/incidents               │
│  - /api/packets                 │
│  - /api/engine/run              │
│  - /api/auth/*                  │
└────────┬────────────────────────┘
         │
┌────────▼────────┐      ┌──────────────┐
│  SQLite Database│      │ Python Engine │
│  - sensor_reads │◄─────┤  run.py      │
│  - nodes        │      │  (async)     │
│  - edges        │      └──────────────┘
│  - evidence     │
│  - incidents    │
│  - packets      │
│  - audit_log    │
└─────────────────┘
```

## Database Schema

### Tables

1. **sensor_readings** - Real-time telemetry
2. **nodes** - Infrastructure nodes
3. **edges** - Dependency relationships
4. **evidence_windows** - Time-windowed evidence
5. **incidents** - Incident simulations
6. **handshake_packets** - Execution packets
7. **audit_log** - Immutable audit trail
8. **engine_jobs** - Background job tracking
9. **users** - Authentication

See `lib/db/index.ts` for full schema definitions.

## Usage Examples

### Ingest Sensor Data
```typescript
// Single reading
await fetch('/api/sensors/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nodeId: 'node_01',
    timestamp: new Date().toISOString(),
    value: 123.45
  })
});

// Batch readings
await fetch('/api/sensors/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify([
    { nodeId: 'node_01', timestamp: '...', value: 123 },
    { nodeId: 'node_02', timestamp: '...', value: 456 }
  ])
});
```

### Query with Filters
```typescript
// Get incidents by type
const incidents = await fetch('/api/incidents?type=flood').then(r => r.json());

// Get packets by status
const packets = await fetch('/api/packets?status=authorized').then(r => r.json());

// Get evidence for specific edge
const evidence = await fetch('/api/evidence?edgeId=edge_01').then(r => r.json());
```

### Trigger Engine Run
```typescript
const job = await fetch('/api/engine/run', { method: 'POST' }).then(r => r.json());
// Check status later
const status = await fetch(`/api/engine/run?jobId=${job.jobId}`).then(r => r.json());
```

## Migration to Production

### PostgreSQL Migration

1. Install PostgreSQL client:
   ```bash
   npm install pg @types/pg
   ```

2. Update `lib/db/index.ts`:
   - Replace `better-sqlite3` with `pg`
   - Update connection string
   - Adjust SQL syntax if needed

3. Set environment variable:
   ```bash
   DATABASE_URL=postgresql://user:pass@host:5432/munin
   ```

### Enhanced Authentication

1. Add JWT tokens:
   ```bash
   npm install jsonwebtoken @types/jsonwebtoken
   ```

2. Implement session management
3. Add role-based access control (RBAC)

### Real-Time Updates

1. Add WebSocket support:
   ```bash
   npm install ws @types/ws
   ```

2. Or use Redis Pub/Sub for distributed systems

## Troubleshooting

### Database Not Created
- Ensure `data/` directory is writable
- Check file permissions
- Set `DATABASE_PATH` environment variable if needed

### Engine Jobs Not Running
- Verify Python 3 is installed
- Check `engine/run.py` exists
- Review job status: `GET /api/engine/run?jobId=<id>`

### Authentication Failing
- Verify user exists: Check `users` table
- Ensure passphrase is correct
- Check SHA-256 hashing is working

## Next Steps

1. **Install dependencies**: `npm install better-sqlite3 @types/better-sqlite3`
2. **Test endpoints**: Use curl or Postman
3. **Sync existing data**: `POST /api/engine/sync`
4. **Create users**: `POST /api/auth/users`
5. **Start ingesting**: `POST /api/sensors/data`

For detailed API documentation, see `BACKEND.md`.

