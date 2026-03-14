#!/bin/bash
# Complete Demo Setup Script
# Sets up everything needed for a perfect demo

set -e

echo "🚀 Munin Demo Setup"
echo "==================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18-22."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ] || [ "$NODE_VERSION" -gt 22 ]; then
    echo -e "${YELLOW}⚠ Warning: Node.js version $NODE_VERSION detected. Recommended: 18-22${NC}"
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.11+."
    exit 1
fi

echo "📦 Installing Node.js dependencies..."
npm install

echo ""
echo "🐍 Setting up Python environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✓ Created Python virtual environment"
fi

source venv/bin/activate 2>/dev/null || . venv/bin/activate
pip install -q -r engine/requirements.txt
echo "✓ Python dependencies installed"

echo ""
echo "🗄️  Creating data directory..."
mkdir -p data
mkdir -p engine/out
mkdir -p engine/out/packets
echo "✓ Directories created"

echo ""
echo "🔧 Generating demo data..."
npm run engine || {
    echo -e "${YELLOW}⚠ Engine run had issues, but continuing...${NC}"
}

echo ""
echo "👤 Seeding demo operator..."
npm run seed:demo 2>/dev/null || {
    echo -e "${YELLOW}⚠ Seed skipped (DB may not be initialized yet; run 'npm run seed:demo' after first 'npm run dev')${NC}"
}

echo ""
echo "✅ Demo setup complete!"
echo ""
echo "To start the demo:"
echo "  1. npm run dev"
echo "  2. Open http://localhost:3000"
echo "  3. Login: flood_officer_01 / demo (or run 'npm run seed:demo' if not yet created)"
echo ""
echo "To verify everything:"
echo "  ./scripts/verify_demo.sh"
