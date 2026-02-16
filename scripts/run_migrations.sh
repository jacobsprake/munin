#!/bin/bash
# PostgreSQL Migration Runner
# Applies all migrations in order to PostgreSQL database

set -e

# Configuration
DB_NAME="${DB_NAME:-munin}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
MIGRATIONS_DIR="$(dirname "$0")/../migrations"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Munin Database Migration Runner${NC}"
echo "=================================="
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql not found. Please install PostgreSQL client.${NC}"
    exit 1
fi

# Check database connection
echo -e "${YELLOW}Testing database connection...${NC}"
if ! PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to database.${NC}"
    echo "Please check:"
    echo "  - Database exists: CREATE DATABASE $DB_NAME;"
    echo "  - User has permissions"
    echo "  - Connection settings (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD)"
    exit 1
fi
echo -e "${GREEN}✓ Connection successful${NC}"
echo ""

# Create migrations tracking table if it doesn't exist
echo -e "${YELLOW}Setting up migration tracking...${NC}"
PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
EOF
echo -e "${GREEN}✓ Migration tracking ready${NC}"
echo ""

# Get list of migration files in order
MIGRATION_FILES=(
    "001_audit_log.sql"
    "002_decisions.sql"
    "003_decision_signatures.sql"
    "004_users_keys.sql"
    "005_checkpoints.sql"
)

# Apply migrations
for migration in "${MIGRATION_FILES[@]}"; do
    migration_path="$MIGRATIONS_DIR/$migration"
    
    if [ ! -f "$migration_path" ]; then
        echo -e "${RED}Error: Migration file not found: $migration_path${NC}"
        exit 1
    fi
    
    migration_version=$(basename "$migration" .sql)
    
    # Check if migration already applied
    if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1 FROM schema_migrations WHERE version = '$migration_version';" | grep -q 1; then
        echo -e "${YELLOW}⏭  Skipping $migration (already applied)${NC}"
        continue
    fi
    
    echo -e "${YELLOW}Applying $migration...${NC}"
    
    # Apply migration
    if PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_path"; then
        # Record migration
        PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (version) VALUES ('$migration_version');"
        echo -e "${GREEN}✓ Applied $migration${NC}"
    else
        echo -e "${RED}✗ Failed to apply $migration${NC}"
        exit 1
    fi
    echo ""
done

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}All migrations applied successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify tables: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
echo "  2. Test audit log: INSERT INTO audit_log (ts, event_type, payload_json, entry_hash) VALUES (NOW(), 'TEST', '{}', 'test');"
echo "  3. Test decisions: INSERT INTO decisions (decision_id, incident_id, playbook_id, status, policy_json) VALUES (gen_random_uuid(), 'test', 'test', 'PENDING', '{}');"
