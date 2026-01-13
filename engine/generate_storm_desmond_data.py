"""
Generate Storm Desmond Sample Data
Creates realistic flood level data based on known peak values from Dec 5-7, 2015.

Based on EA station data:
- Eden at Sands Centre: Peak 7.912m on 2015-12-06T09:15:00
- Petteril at Botcherby: Estimated peak ~2.7m (based on typical ratio)
"""
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta


def generate_storm_desmond_data(
    output_dir: Path,
    eden_peak: float = 7.912,
    petteril_peak: float = 2.7,
    start_date: datetime = None,
    end_date: datetime = None
):
    """
    Generate realistic Storm Desmond flood data.
    
    Args:
        output_dir: Directory to save CSV files
        eden_peak: Peak level for Eden (meters)
        petteril_peak: Peak level for Petteril (meters)
        start_date: Start date (default: 2015-12-05)
        end_date: End date (default: 2015-12-07 23:59)
    """
    if start_date is None:
        start_date = datetime(2015, 12, 5, 0, 0, 0)
    if end_date is None:
        end_date = datetime(2015, 12, 7, 23, 59, 59)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate 15-minute intervals
    timestamps = pd.date_range(start=start_date, end=end_date, freq='15min')
    n_points = len(timestamps)
    
    # Peak time: Dec 6, 2015 09:15 (based on EA data)
    peak_time = datetime(2015, 12, 6, 9, 15, 0)
    
    # Generate Eden data (main river - slower rise, higher peak)
    print("Generating Eden at Sands Centre data...")
    eden_data = generate_river_level_curve(
        timestamps=timestamps,
        peak_time=peak_time,
        peak_value=eden_peak,
        base_level=0.5,  # Normal level
        rise_rate=0.15,  # meters per hour during rise
        fall_rate=0.08   # meters per hour during fall
    )
    
    # Generate Petteril data (tributary - faster rise, lower peak, earlier peak)
    print("Generating Petteril at Botcherby data...")
    petteril_peak_time = peak_time - timedelta(hours=2)  # Tributary peaks earlier
    petteril_data = generate_river_level_curve(
        timestamps=timestamps,
        peak_time=petteril_peak_time,
        peak_value=petteril_peak,
        base_level=0.3,  # Normal level
        rise_rate=0.20,  # Faster rise (smaller catchment)
        fall_rate=0.10   # Faster fall
    )
    
    # Create DataFrames
    eden_df = pd.DataFrame({
        'timestamp': timestamps,
        'node_id': 'eden_sands_centre',
        'value': eden_data
    })
    
    petteril_df = pd.DataFrame({
        'timestamp': timestamps,
        'node_id': 'petteril_botcherby',
        'value': petteril_data
    })
    
    # Save to CSV
    eden_file = output_dir / 'eden_sands_centre.csv'
    petteril_file = output_dir / 'petteril_botcherby.csv'
    
    eden_df.to_csv(eden_file, index=False)
    petteril_df.to_csv(petteril_file, index=False)
    
    print(f"\n✅ Generated Storm Desmond data:")
    print(f"   Eden: {len(eden_df)} readings, peak {eden_df['value'].max():.3f}m at {eden_df.loc[eden_df['value'].idxmax(), 'timestamp']}")
    print(f"   Petteril: {len(petteril_df)} readings, peak {petteril_df['value'].max():.3f}m at {petteril_df.loc[petteril_df['value'].idxmax(), 'timestamp']}")
    print(f"\n💾 Saved to:")
    print(f"   {eden_file}")
    print(f"   {petteril_file}")
    
    return eden_df, petteril_df


def generate_river_level_curve(
    timestamps: pd.DatetimeIndex,
    peak_time: datetime,
    peak_value: float,
    base_level: float,
    rise_rate: float,
    fall_rate: float
) -> np.ndarray:
    """
    Generate a realistic river level curve with:
    - Gradual rise before peak
    - Sharp peak
    - Gradual fall after peak
    - Some noise/variation
    """
    n = len(timestamps)
    values = np.zeros(n)
    
    # Convert to hours from start
    hours_from_start = (timestamps - timestamps[0]).total_seconds() / 3600
    peak_hours = (peak_time - timestamps[0]).total_seconds() / 3600
    
    for i, hours in enumerate(hours_from_start):
        if hours < peak_hours - 12:  # Before significant rise
            # Normal level with slight variation
            values[i] = base_level + np.random.normal(0, 0.05)
        elif hours < peak_hours - 6:  # Early rise
            # Gradual rise
            progress = (hours - (peak_hours - 12)) / 6
            target = base_level + (peak_value - base_level) * 0.2 * progress
            values[i] = target + np.random.normal(0, 0.1)
        elif hours < peak_hours - 2:  # Rapid rise
            # Steeper rise
            progress = (hours - (peak_hours - 6)) / 4
            target = base_level + (peak_value - base_level) * (0.2 + 0.5 * progress)
            values[i] = target + np.random.normal(0, 0.15)
        elif hours < peak_hours + 2:  # Peak period
            # At or near peak
            if abs(hours - peak_hours) < 0.5:
                values[i] = peak_value + np.random.normal(0, 0.1)
            else:
                # Slight variation around peak
                progress = abs(hours - peak_hours) / 2
                values[i] = peak_value * (1 - 0.1 * progress) + np.random.normal(0, 0.15)
        elif hours < peak_hours + 12:  # Rapid fall
            # Steep fall
            progress = (hours - (peak_hours + 2)) / 10
            target = peak_value * (1 - 0.6 * progress)
            values[i] = max(target, base_level * 1.5) + np.random.normal(0, 0.1)
        else:  # Gradual return to normal
            # Slow return to base level
            progress = min((hours - (peak_hours + 12)) / 24, 1.0)
            target = base_level * 1.5 * (1 - progress) + base_level * progress
            values[i] = max(target, base_level) + np.random.normal(0, 0.05)
    
    # Ensure no negative values
    values = np.maximum(values, 0.1)
    
    return values


if __name__ == "__main__":
    print("=" * 60)
    print("STORM DESMOND DATA GENERATOR")
    print("=" * 60)
    print("\nGenerating realistic flood level data for:")
    print("  - River Eden at Sands Centre (peak: 7.912m on Dec 6, 2015 09:15)")
    print("  - River Petteril at Botcherby Bridge (estimated peak: 2.7m)")
    print("  - Date range: Dec 5-7, 2015")
    
    script_dir = Path(__file__).parent
    output_dir = script_dir / "sample_data" / "carlisle_storm_desmond"
    
    eden_df, petteril_df = generate_storm_desmond_data(output_dir)
    
    print(f"\n✅ Storm Desmond data generation complete!")
    print(f"\nTo use this data, run:")
    print(f"  python3 carlisle_demo.py")
    print(f"\nOr manually copy files to engine/sample_data/carlisle/")
