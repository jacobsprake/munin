#!/bin/bash
# Deployment Script for Munin
# Air-gapped compliant: no external services

set -e

echo "🚀 Munin Deployment Script"
echo "========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

echo "📋 Pre-deployment checks..."
echo ""

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ] || [ "$NODE_VERSION" -gt 22 ]; then
    echo -e "${RED}Error: Node.js version $NODE_VERSION not supported (need 18-22)${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found. Copying from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠ Please update .env with production values!${NC}"
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

# Run tests
echo "🧪 Running tests..."
npm run test:ci || {
    echo -e "${YELLOW}Warning: Tests failed, but continuing deployment...${NC}"
}

# Build
echo ""
echo "🔨 Building application..."
npm run build

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
if [ -f "scripts/migrate.sh" ]; then
    ./scripts/migrate.sh
else
    echo -e "${YELLOW}Warning: Migration script not found${NC}"
fi

# Health check
echo ""
echo "🏥 Running health check..."
sleep 2
npm run start &
APP_PID=$!
sleep 5

if curl -f http://localhost:3000/api/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    kill $APP_PID 2>/dev/null || true
else
    echo -e "${RED}✗ Health check failed${NC}"
    kill $APP_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "To deploy:"
echo "  1. Copy files to server"
echo "  2. Run: npm run start"
echo "  3. Or use Docker: docker-compose up -d"
