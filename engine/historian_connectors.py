"""
Historian Connectors

Connectors for common SCADA historians (PI, eDNA, Wonderware, etc.)
"""
from typing import Dict, List, Optional, Iterator
from pathlib import Path
from datetime import datetime, timedelta
import pandas as pd
import csv
from abc import ABC, abstractmethod


class HistorianConnector(ABC):
    """Base class for historian connectors."""
    
    @abstractmethod
    def connect(self, connection_string: str) -> bool:
        """Connect to historian."""
        pass
    
    @abstractmethod
    def query(
        self,
        tags: List[str],
        start_time: datetime,
        end_time: datetime,
        interval: Optional[str] = None
    ) -> pd.DataFrame:
        """Query historian for tag data."""
        pass
    
    @abstractmethod
    def stream(
        self,
        tags: List[str],
        callback: callable
    ) -> Iterator[Dict]:
        """Stream real-time data from historian."""
        pass


class CSVHistorianConnector(HistorianConnector):
    """CSV-based historian connector (for offline/demo use)."""
    
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.connected = False
    
    def connect(self, connection_string: str) -> bool:
        """Connect to CSV historian (just check directory exists)."""
        self.connected = self.data_dir.exists()
        return self.connected
    
    def query(
        self,
        tags: List[str],
        start_time: datetime,
        end_time: datetime,
        interval: Optional[str] = None
    ) -> pd.DataFrame:
        """Query CSV files for tag data."""
        if not self.connected:
            raise ConnectionError("Not connected to historian")
        
        data_frames = []
        
        for tag in tags:
            csv_file = self.data_dir / f"{tag}.csv"
            if not csv_file.exists():
                continue
            
            df = pd.read_csv(csv_file, parse_dates=['timestamp'], index_col='timestamp')
            
            # Filter by time range
            mask = (df.index >= start_time) & (df.index <= end_time)
            df_filtered = df[mask]
            
            if len(df_filtered) > 0:
                data_frames.append(df_filtered)
        
        if not data_frames:
            return pd.DataFrame()
        
        # Combine all tags
        result = pd.concat(data_frames, axis=1)
        return result
    
    def stream(
        self,
        tags: List[str],
        callback: callable
    ) -> Iterator[Dict]:
        """Stream CSV data (simulated streaming)."""
        # In production, would tail CSV files or use file watchers
        for tag in tags:
            csv_file = self.data_dir / f"{tag}.csv"
            if csv_file.exists():
                with open(csv_file, 'r') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        yield {
                            'tag': tag,
                            'timestamp': row['timestamp'],
                            'value': float(row['value']),
                            'quality': row.get('quality', 'GOOD')
                        }


class PIHistorianConnector(HistorianConnector):
    """OSIsoft PI System connector."""
    
    def __init__(self):
        self.pi_server = None
        self.connected = False
    
    def connect(self, connection_string: str) -> bool:
        """Connect to PI Server."""
        # In production, would use PI SDK or PI Web API
        # For now, simulate connection
        try:
            # Would do: self.pi_server = connect_to_pi(connection_string)
            self.connected = True
            return True
        except Exception:
            self.connected = False
            return False
    
    def query(
        self,
        tags: List[str],
        start_time: datetime,
        end_time: datetime,
        interval: Optional[str] = None
    ) -> pd.DataFrame:
        """Query PI Server for tag data."""
        if not self.connected:
            raise ConnectionError("Not connected to PI Server")
        
        # In production, would use PI SDK:
        # data = pi_server.query(tags, start_time, end_time, interval)
        # return pd.DataFrame(data)
        
        # Simulated
        return pd.DataFrame()
    
    def stream(
        self,
        tags: List[str],
        callback: callable
    ) -> Iterator[Dict]:
        """Stream real-time data from PI Server."""
        # In production, would use PI SDK subscriptions
        yield {}


class StreamingIngestionDaemon:
    """Daemon that tails historian outputs into Munin."""
    
    def __init__(
        self,
        connector: HistorianConnector,
        output_dir: Path,
        tags: List[str],
        deduplication_window_seconds: int = 60
    ):
        self.connector = connector
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.tags = tags
        self.deduplication_window = timedelta(seconds=deduplication_window_seconds)
        self.last_seen: Dict[str, datetime] = {}
        self.running = False
    
    def start(self):
        """Start streaming ingestion."""
        self.running = True
        
        for data_point in self.connector.stream(self.tags, self._process_data_point):
            if not self.running:
                break
            
            # Deduplication
            tag = data_point['tag']
            timestamp = datetime.fromisoformat(data_point['timestamp'])
            
            last_seen_time = self.last_seen.get(tag)
            if last_seen_time and (timestamp - last_seen_time) < self.deduplication_window:
                continue  # Skip duplicate
            
            self.last_seen[tag] = timestamp
            
            # De-jitter (handle timestamp noise)
            timestamp_normalized = self._de_jitter(timestamp, tag)
            
            # Write to output
            self._write_data_point(tag, timestamp_normalized, data_point['value'], data_point.get('quality', 'GOOD'))
    
    def stop(self):
        """Stop streaming ingestion."""
        self.running = False
    
    def _process_data_point(self, data_point: Dict):
        """Process a single data point."""
        # Callback for processing
        pass
    
    def _de_jitter(self, timestamp: datetime, tag: str) -> datetime:
        """De-jitter timestamps (handle clock skew)."""
        # Round to nearest minute for de-jittering
        return timestamp.replace(second=0, microsecond=0)
    
    def _write_data_point(self, tag: str, timestamp: datetime, value: float, quality: str):
        """Write data point to output file."""
        output_file = self.output_dir / f"{tag}_stream.csv"
        
        with open(output_file, 'a') as f:
            f.write(f"{timestamp.isoformat()},{tag},{value},{quality}\n")


def backfill_historian_data(
    connector: HistorianConnector,
    tags: List[str],
    start_time: datetime,
    end_time: datetime,
    output_dir: Path,
    batch_size: int = 1000,
    throttle_seconds: float = 1.0
) -> int:
    """Backfill historical data from historian with throttling."""
    import time
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    total_points = 0
    
    # Query in batches
    current_start = start_time
    batch_num = 0
    
    while current_start < end_time:
        current_end = min(current_start + timedelta(days=1), end_time)
        
        try:
            df = connector.query(tags, current_start, current_end)
            
            if len(df) > 0:
                # Save batch
                batch_file = output_dir / f"backfill_batch_{batch_num:04d}.csv"
                df.to_csv(batch_file)
                total_points += len(df)
            
            # Throttle
            time.sleep(throttle_seconds)
            
            current_start = current_end
            batch_num += 1
        
        except Exception as e:
            print(f"Error in batch {batch_num}: {e}")
            continue
    
    return total_points
