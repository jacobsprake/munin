#!/bin/bash
# Munin Installation Script
# Provisions Munin on a bare-metal sovereign node (no internet required)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DEPLOYMENT_MODE="demo"
INSTALL_DIR="/opt/munin"
DATA_DIR="/var/munin/data"
LOG_DIR="/var/munin/logs"
CONFIG_DIR="/etc/munin"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)
      DEPLOYMENT_MODE="$2"
      shift 2
      ;;
    --install-dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
    --data-dir)
      DATA_DIR="$2"
      shift 2
      ;;
    --config-dir)
      CONFIG_DIR="$2"
      shift 2
      ;;
    --air-gap-enabled)
      AIR_GAP_ENABLED=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}Munin Installation Script${NC}"
echo "================================"
echo "Deployment Mode: $DEPLOYMENT_MODE"
echo "Install Directory: $INSTALL_DIR"
echo "Data Directory: $DATA_DIR"
echo "Config Directory: $CONFIG_DIR"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is required but not installed.${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✓ Python $PYTHON_VERSION found"

# Check Node.js (for Next.js frontend)
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Frontend will not be available.${NC}"
    NODE_AVAILABLE=false
else
    NODE_VERSION=$(node --version)
    echo "✓ Node.js $NODE_VERSION found"
    NODE_AVAILABLE=true
fi

# Create directories
echo -e "${YELLOW}Creating directories...${NC}"
sudo mkdir -p "$INSTALL_DIR"
sudo mkdir -p "$DATA_DIR"
sudo mkdir -p "$LOG_DIR"
sudo mkdir -p "$CONFIG_DIR"
sudo mkdir -p "$INSTALL_DIR/engine"
sudo mkdir -p "$INSTALL_DIR/app"
echo "✓ Directories created"

# Copy files
echo -e "${YELLOW}Copying files...${NC}"
sudo cp -r "$PROJECT_ROOT/engine"/* "$INSTALL_DIR/engine/"
if [ "$NODE_AVAILABLE" = true ]; then
    sudo cp -r "$PROJECT_ROOT/app" "$INSTALL_DIR/"
    sudo cp -r "$PROJECT_ROOT/components" "$INSTALL_DIR/"
    sudo cp -r "$PROJECT_ROOT/lib" "$INSTALL_DIR/"
    sudo cp "$PROJECT_ROOT/package.json" "$INSTALL_DIR/"
    sudo cp "$PROJECT_ROOT/next.config.js" "$INSTALL_DIR/" 2>/dev/null || true
fi
sudo cp -r "$PROJECT_ROOT/config" "$INSTALL_DIR/"
sudo cp -r "$PROJECT_ROOT/playbooks" "$INSTALL_DIR/" 2>/dev/null || true
echo "✓ Files copied"

# Install Python dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
if [ -f "$PROJECT_ROOT/requirements.txt" ]; then
    sudo pip3 install -r "$PROJECT_ROOT/requirements.txt" --no-index --find-links "$PROJECT_ROOT/vendor" 2>/dev/null || \
    sudo pip3 install -r "$PROJECT_ROOT/requirements.txt" || \
    echo -e "${YELLOW}Warning: Could not install all Python dependencies. Install manually if needed.${NC}"
else
    echo -e "${YELLOW}No requirements.txt found. Skipping Python dependencies.${NC}"
fi

# Install Node.js dependencies (if Node.js available)
if [ "$NODE_AVAILABLE" = true ]; then
    echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
    cd "$INSTALL_DIR"
    sudo npm install --production --no-audit --no-fund 2>/dev/null || \
    echo -e "${YELLOW}Warning: Could not install all Node.js dependencies. Install manually if needed.${NC}"
fi

# Create configuration
echo -e "${YELLOW}Creating configuration...${NC}"
sudo cp "$PROJECT_ROOT/config/deployment-profiles.yaml" "$CONFIG_DIR/deployment-profiles.yaml"

# Create systemd service file
echo -e "${YELLOW}Creating systemd service...${NC}"
sudo tee "$CONFIG_DIR/munin.service" > /dev/null <<EOF
[Unit]
Description=Munin Infrastructure Orchestration
After=network.target

[Service]
Type=simple
User=munin
WorkingDirectory=$INSTALL_DIR
Environment="DEPLOYMENT_MODE=$DEPLOYMENT_MODE"
Environment="DATA_DIR=$DATA_DIR"
Environment="LOG_DIR=$LOG_DIR"
ExecStart=/usr/bin/python3 -m engine.run --data-dir $DATA_DIR --out-dir $DATA_DIR/output
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Create munin user
if ! id "munin" &>/dev/null; then
    echo -e "${YELLOW}Creating munin user...${NC}"
    sudo useradd -r -s /bin/false -d "$INSTALL_DIR" munin
fi

# Set permissions
echo -e "${YELLOW}Setting permissions...${NC}"
sudo chown -R munin:munin "$INSTALL_DIR"
sudo chown -R munin:munin "$DATA_DIR"
sudo chown -R munin:munin "$LOG_DIR"
sudo chmod +x "$INSTALL_DIR/engine/run.py"

# Install systemd service
if [ -d "/etc/systemd/system" ]; then
    echo -e "${YELLOW}Installing systemd service...${NC}"
    sudo cp "$CONFIG_DIR/munin.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    echo "✓ Systemd service installed"
    echo ""
    echo -e "${GREEN}To start Munin, run:${NC}"
    echo "  sudo systemctl start munin"
    echo ""
    echo -e "${GREEN}To enable Munin on boot, run:${NC}"
    echo "  sudo systemctl enable munin"
fi

# Verify installation
echo -e "${YELLOW}Verifying installation...${NC}"
if [ -f "$INSTALL_DIR/engine/run.py" ]; then
    echo "✓ Engine files installed"
else
    echo -e "${RED}✗ Engine files missing${NC}"
    exit 1
fi

if [ -f "$CONFIG_DIR/deployment-profiles.yaml" ]; then
    echo "✓ Configuration files installed"
else
    echo -e "${RED}✗ Configuration files missing${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review configuration: $CONFIG_DIR/deployment-profiles.yaml"
echo "2. Configure data sources: $DATA_DIR"
echo "3. Start Munin: sudo systemctl start munin"
echo "4. Check logs: tail -f $LOG_DIR/engine_log.jsonl"
echo ""
echo "For air-gap verification, run:"
echo "  python3 -m munin.airgap.verify --wizard"
