"""CLI entry point for engine module: python -m engine.run"""
import sys
from pathlib import Path

# Add engine directory to path
engine_dir = Path(__file__).parent
sys.path.insert(0, str(engine_dir))

from run import main

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Run Munin engine pipeline',
        prog='python -m engine.run'
    )
    parser.add_argument(
        '--data-dir',
        type=Path,
        help='Input data directory (default: engine/sample_data)'
    )
    parser.add_argument(
        '--out-dir',
        type=Path,
        help='Output directory (default: engine/out)'
    )
    parser.add_argument(
        '--playbooks-dir',
        type=Path,
        help='Playbooks directory (default: playbooks/)'
    )
    parser.add_argument(
        '--config',
        type=Path,
        help='Config JSON file (default: use defaults)'
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed for deterministic execution (default: 42)'
    )
    parser.add_argument(
        '--replay-run',
        type=Path,
        help='Replay a previous run from engine_log.jsonl file'
    )
    
    args = parser.parse_args()
    
    # Handle replay mode
    if args.replay_run:
        from engine.tools.replay_run import replay_from_log
        replay_from_log(args.replay_run)
        return
    
    main(
        data_dir=args.data_dir,
        out_dir=args.out_dir,
        playbooks_dir=args.playbooks_dir,
        config_path=args.config,
        seed=args.seed
    )
