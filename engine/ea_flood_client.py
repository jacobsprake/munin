"""
Environment Agency (EA) Flood Monitoring API Client
Fetches river level and rainfall telemetry from EA open data services.

API Reference: https://environment.data.gov.uk/flood-monitoring/doc/reference
"""
import requests
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pathlib import Path
import json
import time


class EAFloodClient:
    """Client for Environment Agency flood monitoring API."""
    
    BASE_URL = "https://environment.data.gov.uk/flood-monitoring"
    
    def __init__(self, cache_dir: Optional[Path] = None):
        """
        Initialize EA Flood Client.
        
        Args:
            cache_dir: Optional directory to cache API responses
        """
        self.cache_dir = cache_dir
        if cache_dir:
            cache_dir.mkdir(parents=True, exist_ok=True)
    
    def get_station_info(self, station_id: str) -> Dict:
        """
        Get station information.
        
        Args:
            station_id: EA station reference (e.g., "762600" for Sands Centre)
        
        Returns:
            Station metadata dictionary
        """
        url = f"{self.BASE_URL}/id/stations/{station_id}.json"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()['items']
    
    def get_measures_for_station(self, station_id: str) -> List[Dict]:
        """
        Get all measures (sensors) for a station.
        
        Args:
            station_id: EA station reference
        
        Returns:
            List of measure dictionaries
        """
        url = f"{self.BASE_URL}/id/stations/{station_id}/measures.json"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()['items']
    
    def find_level_measure(self, station_id: str) -> Optional[str]:
        """
        Find the water level (stage) measure ID for a station.
        
        Args:
            station_id: EA station reference
        
        Returns:
            Measure ID for water level, or None if not found
        """
        measures = self.get_measures_for_station(station_id)
        for measure in measures:
            param = measure.get('parameter', '')
            if 'level' in param.lower() or 'stage' in param.lower():
                return measure.get('@id', '').split('/')[-1]
        return None
    
    def find_rainfall_measure(self, station_id: str) -> Optional[str]:
        """
        Find the rainfall measure ID for a station.
        
        Args:
            station_id: EA station reference
        
        Returns:
            Measure ID for rainfall, or None if not found
        """
        measures = self.get_measures_for_station(station_id)
        for measure in measures:
            param = measure.get('parameter', '')
            if 'rainfall' in param.lower() or 'rain' in param.lower():
                return measure.get('@id', '').split('/')[-1]
        return None
    
    def search_rainfall_stations(self, area_name: Optional[str] = None) -> List[Dict]:
        """
        Search for rainfall monitoring stations.
        
        Args:
            area_name: Filter by area name (e.g., "Carlisle")
        
        Returns:
            List of matching rainfall stations
        """
        url = f"{self.BASE_URL}/id/stations.json"
        params = {'parameter': 'rainfall'}
        if area_name:
            params['label'] = area_name
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()['items']
    
    def get_readings(
        self,
        measure_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[Dict]:
        """
        Get readings for a measure within a date range.
        
        Args:
            measure_id: EA measure ID (e.g., "764070-level-stage-i-15_min-m")
            start_date: Start date for readings (default: last 24 hours)
            end_date: End date for readings (default: now)
            limit: Maximum number of readings to return
        
        Returns:
            List of reading dictionaries with dateTime and value
        """
        url = f"{self.BASE_URL}/id/measures/{measure_id}/readings.json"
        
        params = {'_limit': limit}
        if start_date:
            params['startdate'] = start_date.strftime('%Y-%m-%d')
        if end_date:
            params['enddate'] = end_date.strftime('%Y-%m-%d')
        
        # Check cache first
        cache_key = None
        if self.cache_dir and start_date and end_date:
            cache_key = self.cache_dir / f"{measure_id}_{start_date.date()}_{end_date.date()}.json"
            if cache_key.exists():
                with open(cache_key, 'r') as f:
                    return json.load(f)
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        readings = data.get('items', [])
        
        # Cache the response
        if cache_key:
            with open(cache_key, 'w') as f:
                json.dump(readings, f, indent=2)
        
        return readings
    
    def get_readings_as_dataframe(
        self,
        measure_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        node_id: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Get readings as a pandas DataFrame in Munin format.
        
        Args:
            measure_id: EA measure ID
            start_date: Start date
            end_date: End date
            node_id: Node ID to use (default: derived from measure_id)
        
        Returns:
            DataFrame with columns: timestamp, node_id, value
        """
        readings = self.get_readings(measure_id, start_date, end_date)
        
        if not readings:
            return pd.DataFrame(columns=['timestamp', 'node_id', 'value'])
        
        # Extract node_id from measure_id if not provided
        if not node_id:
            # Extract station part from measure_id (e.g., "764070-level-stage-i-15_min-m" -> "764070")
            parts = measure_id.split('-')
            node_id = parts[0] if parts else measure_id
        
        data = []
        for reading in readings:
            try:
                timestamp = pd.to_datetime(reading['dateTime'])
                value = float(reading['value'])
                data.append({
                    'timestamp': timestamp,
                    'node_id': node_id,
                    'value': value
                })
            except (KeyError, ValueError) as e:
                print(f"Warning: Skipping invalid reading: {e}")
                continue
        
        df = pd.DataFrame(data)
        if not df.empty:
            df = df.sort_values('timestamp')
        
        return df
    
    def get_latest_reading(self, measure_id: str) -> Optional[Dict]:
        """
        Get the most recent reading for a measure.
        
        Args:
            measure_id: EA measure ID
        
        Returns:
            Latest reading dictionary or None
        """
        readings = self.get_readings(measure_id, limit=1)
        return readings[0] if readings else None
    
    def search_stations(self, river_name: Optional[str] = None, label: Optional[str] = None) -> List[Dict]:
        """
        Search for stations by river name or label.
        
        Args:
            river_name: Filter by river name (e.g., "Eden")
            label: Filter by station label (e.g., "Sands Centre")
        
        Returns:
            List of matching stations
        """
        url = f"{self.BASE_URL}/id/stations.json"
        params = {}
        if river_name:
            params['riverName'] = river_name
        if label:
            params['label'] = label
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()['items']


def fetch_carlisle_stations_data(
    start_date: datetime,
    end_date: datetime,
    output_dir: Path,
    cache_dir: Optional[Path] = None
) -> Dict[str, pd.DataFrame]:
    """
    Fetch data for Carlisle stations (Eden at Sands Centre, Petteril at Botcherby).
    
    Args:
        start_date: Start date for data fetch
        end_date: End date for data fetch
        output_dir: Directory to save CSV files
        cache_dir: Optional cache directory for API responses
    
    Returns:
        Dictionary mapping node_id to DataFrame
    """
    client = EAFloodClient(cache_dir=cache_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Carlisle station configuration
    stations = {
        'eden_sands_centre': {
            'station_id': '762600',  # Sands Centre, Carlisle
            'node_id': 'eden_sands_centre',
            'label': 'River Eden at Sands Centre, Carlisle',
            'measure_type': 'level'
        },
        'petteril_botcherby': {
            'station_id': '764070',  # Botcherby Bridge, Carlisle
            'node_id': 'petteril_botcherby',
            'label': 'River Petteril at Botcherby Bridge, Carlisle',
            'measure_type': 'level'
        },
        'caldew_carlisle': {
            'station_id': '764080',  # Caldew at Carlisle (example - verify actual ID)
            'node_id': 'caldew_carlisle',
            'label': 'River Caldew at Carlisle',
            'measure_type': 'level'
        },
        'rainfall_carlisle': {
            'station_id': None,  # Will search for rainfall station
            'node_id': 'rainfall_carlisle',
            'label': 'Rainfall Monitoring - Carlisle Area',
            'measure_type': 'rainfall'
        }
    }
    
    results = {}
    
    for station_key, station_info in stations.items():
        print(f"\nFetching data for {station_info['label']}...")
        station_id = station_info['station_id']
        node_id = station_info['node_id']
        
        try:
            # Find measure based on type
            if station_info.get('measure_type') == 'rainfall':
                # Search for rainfall station if station_id is None
                if station_id is None or station_id.startswith('RAINFALL'):
                    rainfall_stations = client.search_rainfall_stations(area_name='Carlisle')
                    if rainfall_stations:
                        station_id = rainfall_stations[0].get('notation', '')
                        print(f"  Found rainfall station: {station_id}")
                    else:
                        print(f"  Warning: Could not find rainfall station for Carlisle")
                        continue
                
                measure_id = client.find_rainfall_measure(station_id)
                if not measure_id:
                    print(f"  Warning: Could not find rainfall measure for station {station_id}")
                    continue
            else:
                # Find level measure
                measure_id = client.find_level_measure(station_id)
                if not measure_id:
                    print(f"  Warning: Could not find level measure for station {station_id}")
                    continue
            
            print(f"  Found measure: {measure_id}")
            
            # Fetch readings
            df = client.get_readings_as_dataframe(
                measure_id=measure_id,
                start_date=start_date,
                end_date=end_date,
                node_id=node_id
            )
            
            if df.empty:
                print(f"  Warning: No readings found for {station_info['label']}")
                continue
            
            print(f"  Fetched {len(df)} readings from {df['timestamp'].min()} to {df['timestamp'].max()}")
            
            # Save to CSV
            output_file = output_dir / f"{node_id}.csv"
            df.to_csv(output_file, index=False)
            print(f"  Saved to {output_file}")
            
            results[node_id] = df
            
        except Exception as e:
            print(f"  Error fetching data for {station_info['label']}: {e}")
            continue
    
    return results


if __name__ == "__main__":
    # Example: Fetch Storm Desmond data (Dec 5-7, 2015)
    script_dir = Path(__file__).parent
    data_dir = script_dir / "sample_data" / "carlisle"
    cache_dir = script_dir / "cache" / "ea_api"
    
    # Storm Desmond window
    start_date = datetime(2015, 12, 5)
    end_date = datetime(2015, 12, 7, 23, 59, 59)
    
    print("=" * 60)
    print("CARLISLE FLOOD MONITORING DATA FETCH")
    print("=" * 60)
    print(f"Date range: {start_date.date()} to {end_date.date()}")
    print(f"Output directory: {data_dir}")
    
    results = fetch_carlisle_stations_data(
        start_date=start_date,
        end_date=end_date,
        output_dir=data_dir,
        cache_dir=cache_dir
    )
    
    print(f"\n{'=' * 60}")
    print(f"Fetch complete: {len(results)} stations")
    for node_id, df in results.items():
        print(f"  {node_id}: {len(df)} readings")
