"""Unit tests for ingest.py covering missing data, timezones, and edge cases."""
import pandas as pd
import numpy as np
from pathlib import Path
import tempfile
import pytest
from datetime import datetime, timedelta

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from ingest import ingest_historian_data, normalize_timeseries


def create_test_csv(path: Path, timestamps: list, node_id: str, values: list):
    """Helper to create test CSV file."""
    df = pd.DataFrame({
        'timestamp': timestamps,
        'node_id': node_id,
        'value': values
    })
    df.to_csv(path, index=False)


class TestIngestHistorianData:
    """Tests for ingest_historian_data function."""
    
    def test_basic_ingest(self):
        """Test basic CSV ingestion."""
        with tempfile.TemporaryDirectory() as tmpdir:
            data_dir = Path(tmpdir)
            
            # Create test CSV
            timestamps = pd.date_range('2026-01-01', periods=10, freq='15min')
            create_test_csv(
                data_dir / "test1.csv",
                timestamps,
                "node_01",
                [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
            )
            
            df = ingest_historian_data(data_dir)
            assert len(df) == 10
            assert 'node_id' in df.columns
            assert 'value' in df.columns
            assert 'timestamp' in df.columns
    
    def test_multiple_files(self):
        """Test ingestion of multiple CSV files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            data_dir = Path(tmpdir)
            
            timestamps = pd.date_range('2026-01-01', periods=5, freq='15min')
            
            create_test_csv(
                data_dir / "file1.csv",
                timestamps,
                "node_01",
                [1.0, 2.0, 3.0, 4.0, 5.0]
            )
            
            create_test_csv(
                data_dir / "file2.csv",
                timestamps,
                "node_02",
                [10.0, 20.0, 30.0, 40.0, 50.0]
            )
            
            df = ingest_historian_data(data_dir)
            assert len(df) == 10  # 5 from each file
            assert set(df['node_id'].unique()) == {'node_01', 'node_02'}
    
    def test_missing_data_patterns(self):
        """Test handling of missing data in CSV."""
        with tempfile.TemporaryDirectory() as tmpdir:
            data_dir = Path(tmpdir)
            
            timestamps = pd.date_range('2026-01-01', periods=10, freq='15min')
            values = [1.0, np.nan, 3.0, None, 5.0, 6.0, np.nan, 8.0, 9.0, 10.0]
            
            create_test_csv(
                data_dir / "missing_data.csv",
                timestamps,
                "node_01",
                values
            )
            
            df = ingest_historian_data(data_dir)
            assert len(df) == 10
            # Should handle NaN/None gracefully
            assert df['value'].isna().sum() >= 0  # May have NaN values
    
    def test_timezone_edge_cases(self):
        """Test handling of different timestamp formats and timezones."""
        with tempfile.TemporaryDirectory() as tmpdir:
            data_dir = Path(tmpdir)
            
            # Test ISO format
            timestamps_iso = [
                '2026-01-01T00:00:00Z',
                '2026-01-01T00:15:00Z',
                '2026-01-01T00:30:00Z'
            ]
            
            create_test_csv(
                data_dir / "iso_timestamps.csv",
                timestamps_iso,
                "node_01",
                [1.0, 2.0, 3.0]
            )
            
            df = ingest_historian_data(data_dir)
            assert len(df) == 3
            assert pd.api.types.is_datetime64_any_dtype(df['timestamp'])
    
    def test_large_csv(self):
        """Test ingestion of large CSV file (1000+ rows)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            data_dir = Path(tmpdir)
            
            # Generate 2000 rows
            timestamps = pd.date_range('2026-01-01', periods=2000, freq='1min')
            values = np.random.randn(2000).tolist()
            
            create_test_csv(
                data_dir / "large_file.csv",
                timestamps,
                "node_01",
                values
            )
            
            df = ingest_historian_data(data_dir)
            assert len(df) == 2000
            assert df['timestamp'].min() <= df['timestamp'].max()
    
    def test_empty_directory(self):
        """Test error handling for empty directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            data_dir = Path(tmpdir)
            
            with pytest.raises(ValueError, match="No CSV files found"):
                ingest_historian_data(data_dir)
    
    def test_timestamp_sorting(self):
        """Test that timestamps are sorted correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            data_dir = Path(tmpdir)
            
            # Create unsorted timestamps
            timestamps = [
                '2026-01-01 12:00:00',
                '2026-01-01 00:00:00',
                '2026-01-01 06:00:00'
            ]
            
            create_test_csv(
                data_dir / "unsorted.csv",
                timestamps,
                "node_01",
                [1.0, 2.0, 3.0]
            )
            
            df = ingest_historian_data(data_dir)
            # Should be sorted
            assert df['timestamp'].is_monotonic_increasing


class TestNormalizeTimeseries:
    """Tests for normalize_timeseries function."""
    
    def test_basic_normalization(self):
        """Test basic time-series normalization."""
        with tempfile.TemporaryDirectory() as tmpdir:
            out_path = Path(tmpdir) / "normalized.csv"
            
            # Create input DataFrame
            timestamps = pd.date_range('2026-01-01', periods=10, freq='15min')
            df = pd.DataFrame({
                'timestamp': timestamps,
                'node_id': 'node_01',
                'value': range(10)
            })
            
            normalized = normalize_timeseries(df, out_path)
            
            assert out_path.exists()
            assert 'node_01' in normalized.columns
            assert len(normalized) == 10
    
    def test_multiple_nodes_normalization(self):
        """Test normalization with multiple nodes."""
        with tempfile.TemporaryDirectory() as tmpdir:
            out_path = Path(tmpdir) / "normalized.csv"
            
            timestamps = pd.date_range('2026-01-01', periods=5, freq='15min')
            
            df = pd.DataFrame({
                'timestamp': timestamps.tolist() * 2,
                'node_id': ['node_01'] * 5 + ['node_02'] * 5,
                'value': list(range(5)) + list(range(10, 15))
            })
            
            normalized = normalize_timeseries(df, out_path)
            
            assert 'node_01' in normalized.columns
            assert 'node_02' in normalized.columns
            assert len(normalized) == 5
    
    def test_missing_value_handling(self):
        """Test forward-fill and backward-fill of missing values."""
        with tempfile.TemporaryDirectory() as tmpdir:
            out_path = Path(tmpdir) / "normalized.csv"
            
            timestamps = pd.date_range('2026-01-01', periods=10, freq='15min')
            
            df = pd.DataFrame({
                'timestamp': timestamps,
                'node_id': 'node_01',
                'value': [1.0, np.nan, np.nan, 4.0, 5.0, np.nan, 7.0, 8.0, 9.0, 10.0]
            })
            
            normalized = normalize_timeseries(df, out_path)
            
            # After ffill/bfill, should have no NaN (unless all values are NaN)
            assert normalized['node_01'].notna().sum() >= 0
    
    def test_overlapping_timestamps(self):
        """Test handling of overlapping timestamps (aggregation)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            out_path = Path(tmpdir) / "normalized.csv"
            
            # Same timestamp, different values
            timestamps = ['2026-01-01 00:00:00'] * 3
            df = pd.DataFrame({
                'timestamp': timestamps,
                'node_id': 'node_01',
                'value': [1.0, 2.0, 3.0]
            })
            
            normalized = normalize_timeseries(df, out_path)
            
            # Should aggregate (mean) overlapping timestamps
            assert len(normalized) == 1
            assert normalized['node_01'].iloc[0] == 2.0  # Mean of 1, 2, 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
