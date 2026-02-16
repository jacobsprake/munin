"""Performance benchmarking for graph inference on synthetic datasets."""
import pandas as pd
import numpy as np
import json
import time
from pathlib import Path
from typing import Dict, List
from infer_graph import build_graph
from config import get_config


def generate_synthetic_dataset(n_nodes: int, n_samples: int, seed: int = 42) -> pd.DataFrame:
    """Generate synthetic time-series data for benchmarking."""
    np.random.seed(seed)
    timestamps = pd.date_range('2026-01-01', periods=n_samples, freq='1min')
    
    data = {}
    for i in range(n_nodes):
        # Create correlated series
        base = np.random.randn(n_samples)
        if i > 0:
            # Add correlation with previous node
            base = 0.7 * base + 0.3 * data[f'node_{i-1:02d}']
        data[f'node_{i:02d}'] = base
    
    return pd.DataFrame(data, index=timestamps)


def benchmark_graph_inference(n_nodes: int, n_samples: int, output_dir: Path) -> Dict:
    """Benchmark graph inference for given dataset size."""
    print(f"Benchmarking: {n_nodes} nodes, {n_samples} samples...")
    
    # Generate synthetic data
    df = generate_synthetic_dataset(n_nodes, n_samples)
    
    # Save to temp CSV
    temp_input = output_dir / f"benchmark_input_{n_nodes}n_{n_samples}s.csv"
    df.to_csv(temp_input)
    
    # Benchmark graph inference
    temp_output = output_dir / f"benchmark_output_{n_nodes}n_{n_samples}s.json"
    
    start_time = time.time()
    build_graph(temp_input, temp_output)
    elapsed_time = time.time() - start_time
    
    # Load result to get edge count
    with open(temp_output, 'r') as f:
        graph = json.load(f)
    
    num_edges = len(graph.get('edges', []))
    num_nodes_result = len(graph.get('nodes', []))
    
    # Cleanup
    temp_input.unlink()
    temp_output.unlink()
    
    return {
        'n_nodes': n_nodes,
        'n_samples': n_samples,
        'elapsed_seconds': elapsed_time,
        'edges_inferred': num_edges,
        'nodes_inferred': num_nodes_result,
        'throughput_nodes_per_sec': n_nodes / elapsed_time if elapsed_time > 0 else 0,
        'throughput_samples_per_sec': n_samples / elapsed_time if elapsed_time > 0 else 0
    }


def run_benchmarks(output_dir: Path):
    """Run benchmarks across multiple dataset sizes."""
    output_dir.mkdir(exist_ok=True)
    
    # Benchmark configurations
    configs = [
        (100, 1000),   # Small
        (500, 5000),   # Medium
        (1000, 10000), # Large
        (5000, 50000), # Very large
        (10000, 100000) # Extreme
    ]
    
    results = []
    
    for n_nodes, n_samples in configs:
        try:
            result = benchmark_graph_inference(n_nodes, n_samples, output_dir)
            results.append(result)
            print(f"  Completed: {result['elapsed_seconds']:.2f}s, {result['edges_inferred']} edges")
        except Exception as e:
            print(f"  Failed: {e}")
            results.append({
                'n_nodes': n_nodes,
                'n_samples': n_samples,
                'error': str(e)
            })
    
    # Save results
    perf_profile = {
        'benchmark_timestamp': pd.Timestamp.now().isoformat(),
        'config_version': get_config().version,
        'results': results
    }
    
    output_path = output_dir / "perf_profile.json"
    with open(output_path, 'w') as f:
        json.dump(perf_profile, f, indent=2)
    
    print(f"\nPerformance profile saved to {output_path}")
    return perf_profile


if __name__ == "__main__":
    script_dir = Path(__file__).parent
    out_dir = script_dir / "out"
    run_benchmarks(out_dir)
