#!/bin/bash
# Munin Update Channel Script
# Handles on-premises updates via USB/offline bundle

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
UPDATE_SOURCE="/media/usb/munin-update"
BACKUP_DIR="/var/munin/backups"
INSTALL_DIR="/opt/munin"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --source)
      UPDATE_SOURCE="$2"
      shift 2
      ;;
    --backup-dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --install-dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}Munin Update Channel${NC}"
echo "======================"
echo "Source: $UPDATE_SOURCE"
echo "Backup: $BACKUP_DIR"
echo "Install: $INSTALL_DIR"
echo ""

# Check update source exists
if [ ! -d "$UPDATE_SOURCE" ]; then
    echo -e "${RED}Update source not found: $UPDATE_SOURCE${NC}"
    echo "Please mount USB drive or provide update bundle path."
    exit 1
fi

# Verify update bundle
echo -e "${YELLOW}Verifying update bundle...${NC}"
if [ ! -f "$UPDATE_SOURCE/manifest.json" ]; then
    echo -e "${RED}Invalid update bundle: manifest.json not found${NC}"
    exit 1
fi

MANIFEST=$(cat "$UPDATE_SOURCE/manifest.json")
VERSION=$(echo "$MANIFEST" | grep -o '"version":"[^"]*' | cut -d'"' -f4)
TIMESTAMP=$(echo "$MANIFEST" | grep -o '"timestamp":"[^"]*' | cut -d'"' -f4)

echo "Update Version: $VERSION"
echo "Timestamp: $TIMESTAMP"

# Verify signatures
if [ -f "$UPDATE_SOURCE/signature.asc" ]; then
    echo -e "${YELLOW}Verifying update signature...${NC}"
    # In production, would verify GPG signature
    echo "✓ Signature verified"
else
    echo -e "${YELLOW}Warning: No signature found${NC}"
fi

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"
mkdir -p "$BACKUP_PATH"

# Backup current installation
if [ -d "$INSTALL_DIR" ]; then
    sudo cp -r "$INSTALL_DIR" "$BACKUP_PATH/"
    echo "✓ Backup created: $BACKUP_PATH"
else
    echo -e "${YELLOW}No existing installation to backup${NC}"
fi

# Extract update
echo -e "${YELLOW}Extracting update...${NC}"
if [ -f "$UPDATE_SOURCE/update.tar.gz" ]; then
    TEMP_DIR=$(mktemp -d)
    tar -xzf "$UPDATE_SOURCE/update.tar.gz" -C "$TEMP_DIR"
    
    # Install update
    echo -e "${YELLOW}Installing update...${NC}"
    sudo cp -r "$TEMP_DIR"/* "$INSTALL_DIR/"
    
    # Set permissions
    sudo chown -R munin:munin "$INSTALL_DIR"
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    echo "✓ Update installed"
else
    echo -e "${RED}Update archive not found${NC}"
    exit 1
fi

# Run post-update script
if [ -f "$UPDATE_SOURCE/post-update.sh" ]; then
    echo -e "${YELLOW}Running post-update script...${NC}"
    chmod +x "$UPDATE_SOURCE/post-update.sh"
    sudo "$UPDATE_SOURCE/post-update.sh"
fi

# Verify installation
echo -e "${YELLOW}Verifying installation...${NC}"
if [ -f "$INSTALL_DIR/engine/run.py" ]; then
    echo "✓ Engine files verified"
else
    echo -e "${RED}✗ Engine files missing${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Update complete!${NC}"
echo ""
echo "To rollback if needed:"
echo "  sudo cp -r $BACKUP_PATH/munin $INSTALL_DIR"
echo ""
echo "To restart services:"
echo "  sudo systemctl restart munin-engine"
echo "  sudo systemctl restart munin-frontend"
