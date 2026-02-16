"""
Replay Run Tool

Replays a previous engine run from engine_log.jsonl, reproducing the exact same
pipeline execution with the same inputs and configuration.
"""
import json
import sys
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime

# Add engine directory to path
script_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(script_dir))

from engine.run import main
from engine.config import EngineConfig


def extract_run_config_from_log(log_path: Path) -> Dict:
    """Extract configuration from engine log file."""
    config = {
        'seed': 42,
        'data_dir': None,
        'out_dir': None,
        'playbooks_dir': None,
        'config_path': None
    }
    
    if not log_path.exists():
        raise FileNotFoundError(f"Log file not found: {log_path}")
    
    # Read log file and extract configuration
    with open(log_path, 'r') as f:
        for line in f:
            try:
                entry = json.loads(line.strip())
                
                # Look for config metadata entries
                if entry.get('phase') == 'config' or 'config' in entry.get('message', '').lower():
                    if 'seed' in entry.get('data', {}):
                        config['seed'] = entry['data']['seed']
                    if 'dataDir' in entry.get('data', {}):
                        config['data_dir'] = entry['data']['dataDir']
                    if 'outDir' in entry.get('data', {}):
                        config['out_dir'] = entry['data']['outDir']
                    if 'playbooksDir' in entry.get('data', {}):
                        config['playbooks_dir'] = entry['data']['playbooksDir']
                
                # Look for config_version.json path
                if 'configPath' in entry.get('data', {}):
                    config['config_path'] = entry['data']['configPath']
            
            except json.JSONDecodeError:
                continue
    
    # Try to find config_version.json in the same directory as log
    log_dir = log_path.parent
    config_version_path = log_dir / "config_version.json"
    
    if config_version_path.exists():
        with open(config_version_path, 'r') as f:
            config_data = json.load(f)
            config['seed'] = config_data.get('seed', config['seed'])
            config['config_path'] = str(config_version_path)
            
            # Extract paths from config metadata
            if 'config' in config_data:
                engine_config = config_data['config']
                # Could extract more config here if needed
    
    return config


def replay_from_log(log_path: Path, output_dir: Optional[Path] = None):
    """Replay a previous run from engine log."""
    print("=" * 60)
    print("REPLAY MODE - Reproducing Previous Run")
    print("=" * 60)
    print(f"Log file: {log_path}")
    print()
    
    # Extract configuration
    try:
        config = extract_run_config_from_log(log_path)
    except Exception as e:
        print(f"Error extracting config from log: {e}")
        sys.exit(1)
    
    print("Extracted configuration:")
    print(f"  Seed: {config['seed']}")
    print(f"  Data dir: {config['data_dir']}")
    print(f"  Output dir: {config['out_dir']}")
    print(f"  Playbooks dir: {config['playbooks_dir']}")
    print()
    
    # Validate paths
    if config['data_dir'] and not Path(config['data_dir']).exists():
        print(f"Warning: Data directory not found: {config['data_dir']}")
        print("Using default data directory")
        config['data_dir'] = None
    
    # Use provided output dir or create replay-specific one
    if output_dir:
        config['out_dir'] = output_dir
    elif config['out_dir']:
        # Create replay subdirectory
        original_out = Path(config['out_dir'])
        replay_out = original_out.parent / f"{original_out.name}_replay_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        config['out_dir'] = replay_out
    
    # Replay the run
    print("Replaying pipeline...")
    print()
    
    main(
        data_dir=Path(config['data_dir']) if config['data_dir'] else None,
        out_dir=Path(config['out_dir']) if config['out_dir'] else None,
        playbooks_dir=Path(config['playbooks_dir']) if config['playbooks_dir'] else None,
        config_path=Path(config['config_path']) if config['config_path'] else None,
        seed=config['seed']
    )
    
    print()
    print("=" * 60)
    print("REPLAY COMPLETE")
    print("=" * 60)
    print(f"Output directory: {config['out_dir']}")
    print()
    print("To verify reproducibility, compare outputs:")
    print(f"  python engine/tools/verify_run_reproducibility.py \\")
    print(f"    --run1 {log_path.parent} \\")
    print(f"    --run2 {config['out_dir']}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Replay a previous engine run from log file'
    )
    parser.add_argument(
        'log_file',
        type=Path,
        help='Path to engine_log.jsonl file'
    )
    parser.add_argument(
        '--output-dir',
        type=Path,
        help='Output directory for replayed run (default: create replay subdirectory)'
    )
    
    args = parser.parse_args()
    
    replay_from_log(args.log_file, args.output_dir)
