#!/bin/bash
# Demo Verification Script
# Ensures all demo components are working correctly

set -e

echo "🔍 Munin Demo Verification"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check if command exists
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 found"
        return 0
    else
        echo -e "${RED}✗${NC} $1 not found"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

echo "📋 Prerequisites Check"
echo "---------------------"
check_command node
check_command npm
check_command python3
check_command pip3
echo ""

echo "📦 Dependencies Check"
echo "---------------------"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} node_modules missing - run: npm install"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -d "venv" ]; then
    echo -e "${GREEN}✓${NC} Python venv exists"
else
    echo -e "${YELLOW}⚠${NC} Python venv missing - run: python3 -m venv venv"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo "📁 Critical Files Check"
echo "----------------------"
check_file package.json
check_file engine/requirements.txt
check_file engine/run.py
check_file engine/carlisle_demo.py
check_file playbooks/carlisle_flood_gate_coordination.yaml
check_file app/layout.tsx
check_file app/page.tsx
echo ""

echo "🔧 Engine Output Check"
echo "---------------------"
if [ -d "engine/out" ]; then
    echo -e "${GREEN}✓${NC} engine/out directory exists"
    
    if [ -f "engine/out/graph.json" ]; then
        echo -e "${GREEN}✓${NC} graph.json exists"
    else
        echo -e "${YELLOW}⚠${NC} graph.json missing - run: npm run engine"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if [ -f "engine/out/incidents.json" ]; then
        echo -e "${GREEN}✓${NC} incidents.json exists"
    else
        echo -e "${YELLOW}⚠${NC} incidents.json missing - run: npm run engine"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if [ -d "engine/out/packets" ]; then
        PACKET_COUNT=$(find engine/out/packets -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$PACKET_COUNT" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} $PACKET_COUNT packet(s) found"
        else
            echo -e "${YELLOW}⚠${NC} No packets found - run: npm run engine"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${YELLOW}⚠${NC} packets directory missing - run: npm run engine"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} engine/out directory missing - run: npm run engine"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo "🌐 API Routes Check"
echo "-----------------"
check_file app/api/graph/route.ts
check_file app/api/incidents/route.ts
check_file app/api/packets/route.ts
check_file app/api/decisions/route.ts
check_file app/api/readiness/route.ts
echo ""

echo "🎨 UI Pages Check"
echo "----------------"
check_file app/graph/page.tsx
check_file app/simulation/page.tsx
check_file app/handshakes/page.tsx
check_file app/decisions/page.tsx
check_file app/readiness/page.tsx
check_file app/carlisle-dashboard/page.tsx
echo ""

echo "📊 Database Check"
echo "----------------"
if [ -f "data/munin.db" ]; then
    echo -e "${GREEN}✓${NC} Database file exists"
    DB_SIZE=$(du -h data/munin.db | cut -f1)
    echo -e "  Database size: $DB_SIZE"
else
    echo -e "${YELLOW}⚠${NC} Database will be created on first run"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo "🔐 Configuration Check"
echo "-------------------"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
else
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}⚠${NC} .env missing but .env.example exists - copy .env.example to .env"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${YELLOW}⚠${NC} No .env file (may be optional)"
        WARNINGS=$((WARNINGS + 1))
    fi
fi
echo ""

echo "📝 Summary"
echo "---------"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ Demo is ready!${NC}"
    echo ""
    echo "To run the demo:"
    echo "  1. npm run engine    # Generate engine output"
    echo "  2. npm run dev       # Start Next.js server"
    echo "  3. Open http://localhost:3000"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Demo has $WARNINGS warning(s) but should work${NC}"
    echo ""
    echo "To run the demo:"
    echo "  1. npm run engine    # Generate engine output"
    echo "  2. npm run dev       # Start Next.js server"
    echo "  3. Open http://localhost:3000"
    exit 0
else
    echo -e "${RED}✗ Demo has $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before running the demo."
    exit 1
fi
