"""
EA API Polling Script
Polls Environment Agency flood monitoring API every 15 minutes
and triggers playbook when thresholds are exceeded.
"""
import time
import json
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from ea_flood_client import EAFloodClient

# Import carlisle config (handle different export formats)
try:
    from carlisle_config import STATIONS, FLOOD_THRESHOLDS
except ImportError:
    # Fallback: define stations if config doesn't export them
    STATIONS = [
        {'station_id': '762600', 'node_id': 'eden_sands_centre', 'label': 'River Eden at Sands Centre'},
        {'station_id': '764070', 'node_id': 'petteril_botcherby', 'label': 'River Petteril at Botcherby Bridge'},
    ]
    FLOOD_THRESHOLDS = {
        'eden_sands_centre': {'warning': 2.5, 'alert': 3.0, 'critical': 3.5},
        'petteril_botcherby': {'warning': 1.8, 'alert': 2.2, 'critical': 2.5},
    }

# Configuration
POLL_INTERVAL_SECONDS = 15 * 60  # 15 minutes
API_BASE_URL = "http://localhost:3000/api"  # Next.js API
DATA_DIR = Path(__file__).parent / "sample_data" / "carlisle"
OUTPUT_DIR = Path(__file__).parent / "out" / "carlisle_polling"

class ThresholdMonitor:
    """Monitors EA API and triggers playbooks when thresholds exceeded."""
    
    def __init__(self, poll_interval: int = POLL_INTERVAL_SECONDS):
        self.poll_interval = poll_interval
        self.client = EAFloodClient()
        self.last_check = {}
        self.triggered_incidents = set()
        
    def check_station(self, station_id: str, node_id: str, threshold: float) -> Optional[Dict]:
        """Check if station reading exceeds threshold."""
        try:
            # Find level measure for station
            measure_id = self.client.find_level_measure(station_id)
            if not measure_id:
                print(f"⚠️  No level measure found for station {station_id}")
                return None
            
            # Get latest reading
            latest = self.client.get_latest_reading(measure_id)
            
            if not latest:
                return None
            
            value = latest.get('value', 0)
            timestamp = latest.get('dateTime', '')
            
            # Check threshold
            if value > threshold:
                return {
                    'station_id': station_id,
                    'node_id': node_id,
                    'value': value,
                    'threshold': threshold,
                    'timestamp': timestamp,
                    'exceeded': True
                }
            
            return None
            
        except Exception as e:
            print(f"⚠️  Error checking station {station_id}: {e}")
            return None
    
    def check_all_stations(self) -> List[Dict]:
        """Check all configured stations for threshold breaches."""
        alerts = []
        
        for station_config in STATIONS:
            station_id = station_config['station_id']
            node_id = station_config['node_id']
            threshold = FLOOD_THRESHOLDS.get(node_id, {}).get('warning', 0)
            
            if threshold == 0:
                continue  # No threshold configured
            
            result = self.check_station(station_id, node_id, threshold)
            if result and result['exceeded']:
                alerts.append(result)
        
        return alerts
    
    def trigger_playbook(self, alert: Dict) -> bool:
        """Trigger playbook via API when threshold exceeded."""
        incident_id = f"threshold_breach_{alert['node_id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Check if already triggered for this incident
        if incident_id in self.triggered_incidents:
            return False
        
        try:
            # Create incident data
            incident_data = {
                'id': incident_id,
                'type': 'flood',
                'title': f"Flood threshold exceeded: {alert['node_id']}",
                'start_ts': alert['timestamp'],
                'timeline': [{
                    'timestamp': alert['timestamp'],
                    'event': 'threshold_breach',
                    'impactedNodeIds': [alert['node_id']],
                    'severity': 'warning'
                }],
                'trigger': {
                    'type': 'threshold_breach',
                    'node_id': alert['node_id'],
                    'value': alert['value'],
                    'threshold': alert['threshold']
                }
            }
            
            # Save incident data
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            incident_path = OUTPUT_DIR / f"{incident_id}.json"
            with open(incident_path, 'w') as f:
                json.dump(incident_data, f, indent=2)
            
            # Trigger via API (if available)
            try:
                response = requests.post(
                    f"{API_BASE_URL}/engine/run",
                    json={
                        'incident_id': incident_id,
                        'playbook_id': 'carlisle_flood_gate_coordination.yaml'
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    print(f"✅ Playbook triggered for {alert['node_id']}")
                    self.triggered_incidents.add(incident_id)
                    return True
                else:
                    print(f"⚠️  API returned status {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                print(f"⚠️  API not available: {e}")
                print(f"   Incident saved to: {incident_path}")
                print(f"   Run manually: python3 packetize.py")
            
            return True
            
        except Exception as e:
            print(f"❌ Error triggering playbook: {e}")
            return False
    
    def run_once(self) -> Dict:
        """Run one polling cycle."""
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking thresholds...")
        
        alerts = self.check_all_stations()
        
        if alerts:
            print(f"⚠️  {len(alerts)} threshold breach(es) detected:")
            for alert in alerts:
                print(f"   - {alert['node_id']}: {alert['value']:.2f} > {alert['threshold']:.2f}")
                self.trigger_playbook(alert)
        else:
            print("✓ All stations within thresholds")
        
        return {
            'timestamp': datetime.now().isoformat(),
            'alerts': len(alerts),
            'stations_checked': len(STATIONS)
        }
    
    def run_continuous(self):
        """Run continuous polling loop."""
        print("=" * 60)
        print("EA API Polling Monitor")
        print("=" * 60)
        print(f"Poll interval: {self.poll_interval / 60:.0f} minutes")
        print(f"Stations monitored: {len(STATIONS)}")
        print("Press Ctrl+C to stop")
        print("=" * 60)
        
        try:
            while True:
                self.run_once()
                print(f"\nNext check in {self.poll_interval / 60:.0f} minutes...")
                time.sleep(self.poll_interval)
                
        except KeyboardInterrupt:
            print("\n\nStopping monitor...")
            print(f"Total incidents triggered: {len(self.triggered_incidents)}")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Poll EA API and trigger playbooks')
    parser.add_argument('--once', action='store_true', help='Run once instead of continuous')
    parser.add_argument('--interval', type=int, default=POLL_INTERVAL_SECONDS, 
                       help='Poll interval in seconds (default: 900 = 15 minutes)')
    
    args = parser.parse_args()
    
    monitor = ThresholdMonitor(poll_interval=args.interval)
    
    if args.once:
        monitor.run_once()
    else:
        monitor.run_continuous()
