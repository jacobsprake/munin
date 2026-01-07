"""Ingest historian-like CSV files and normalize to time-series format."""
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

def ingest_historian_data(data_dir: Path) -> pd.DataFrame:
    """Load and normalize all CSV files from sample_data directory."""
    all_data = []
    
    csv_files = list(data_dir.glob("*.csv"))
    if not csv_files:
        raise ValueError(f"No CSV files found in {data_dir}")
    
    for csv_file in csv_files:
        df = pd.read_csv(csv_file)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['source_file'] = csv_file.stem
        all_data.append(df)
    
    combined = pd.concat(all_data, ignore_index=True)
    combined = combined.sort_values('timestamp')
    
    return combined

def normalize_timeseries(df: pd.DataFrame, output_path: Path):
    """Normalize and save time-series data."""
    # Pivot to wide format with node_id as columns
    normalized = df.pivot_table(
        index='timestamp',
        columns='node_id',
        values='value',
        aggfunc='mean'
    )
    
    # Fill missing values with forward fill then backward fill
    normalized = normalized.ffill().bfill()
    
    # Save as CSV (simpler than parquet for prototype)
    normalized.to_csv(output_path)
    print(f"Normalized time-series saved to {output_path}")
    
    return normalized

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    data_dir = script_dir / "sample_data"
    out_dir = script_dir / "out"
    out_dir.mkdir(exist_ok=True)
    
    df = ingest_historian_data(data_dir)
    normalize_timeseries(df, out_dir / "normalized_timeseries.csv")

