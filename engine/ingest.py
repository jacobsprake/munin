"""Ingest historian-like CSV files and normalize to time-series format."""
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import sqlite3
import os

def ingest_historian_data(data_dir: Path, db_path: Path | None = None, recursive: bool = True) -> pd.DataFrame:
    """Load and normalize all CSV files from data_dir, optionally merging DB sensor_readings."""
    all_data = []

    # Recursive or flat CSV glob
    if recursive:
        csv_files = list(data_dir.rglob("*.csv"))
    else:
        csv_files = list(data_dir.glob("*.csv"))

    for csv_file in csv_files:
        try:
            df = pd.read_csv(csv_file)
            if 'node_id' not in df.columns and 'nodeId' in df.columns:
                df = df.rename(columns={'nodeId': 'node_id'})
            if 'timestamp' not in df.columns:
                continue
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['source_file'] = csv_file.stem
            all_data.append(df)
        except Exception as e:
            print(f"Warning: skip {csv_file}: {e}")

    # Load from SQLite sensor_readings if DB path provided
    if db_path and db_path.exists():
        try:
            conn = sqlite3.connect(str(db_path))
            df_db = pd.read_sql_query(
                "SELECT timestamp, node_id, value FROM sensor_readings WHERE timestamp > datetime('now', '-168 hours') ORDER BY timestamp",
                conn,
            )
            conn.close()
            if len(df_db) > 0:
                df_db['timestamp'] = pd.to_datetime(df_db['timestamp'])
                df_db['source_file'] = 'sensor_readings'
                all_data.append(df_db)
        except Exception as e:
            print(f"Warning: DB ingest failed: {e}")

    if not all_data:
        raise ValueError(
            f"No data to ingest. Checked: {data_dir} (recursive={recursive}), "
            f"db={db_path} (exists={db_path.exists() if db_path else False})"
        )

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

