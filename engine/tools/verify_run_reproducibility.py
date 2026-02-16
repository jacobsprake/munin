"""
Verify Run Reproducibility Tool

Compares two engine run outputs to verify they are identical (within tolerance).
"""
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple
import argparse
from datetime import datetime

# Add engine directory to path
script_dir = Path(__file__).parent.parent
sys.path.insert(0, str(script_dir))


def compare_json_files(
    file1: Path,
    file2: Path,
    tolerance: float = 1e-10
) -> Tuple[bool, List[str]]:
    """Compare two JSON files and return (match, errors)."""
    errors = []
    
    if not file1.exists():
        errors.append(f"File 1 not found: {file1}")
        return False, errors
    
    if not file2.exists():
        errors.append(f"File 2 not found: {file2}")
        return False, errors
    
    with open(file1, 'r') as f:
        data1 = json.load(f)
    
    with open(file2, 'r') as f:
        data2 = json.load(f)
    
    # Compare structure
    if type(data1) != type(data2):
        errors.append(f"Type mismatch: {type(data1)} vs {type(data2)}")
        return False, errors
    
    # Recursive comparison
    def compare_values(v1, v2, path="", errors_list=None):
        if errors_list is None:
            errors_list = []
        
        if isinstance(v1, dict) and isinstance(v2, dict):
            keys1 = set(v1.keys())
            keys2 = set(v2.keys())
            
            if keys1 != keys2:
                missing1 = keys1 - keys2
                missing2 = keys2 - keys1
                if missing1:
                    errors_list.append(f"{path}: Missing keys in file2: {missing1}")
                if missing2:
                    errors_list.append(f"{path}: Missing keys in file1: {missing2}")
            
            for key in keys1.intersection(keys2):
                compare_values(v1[key], v2[key], f"{path}.{key}" if path else key, errors_list)
        
        elif isinstance(v1, list) and isinstance(v2, list):
            if len(v1) != len(v2):
                errors_list.append(f"{path}: Length mismatch: {len(v1)} vs {len(v2)}")
                return
            
            for i, (item1, item2) in enumerate(zip(v1, v2)):
                compare_values(item1, item2, f"{path}[{i}]", errors_list)
        
        elif isinstance(v1, (int, float)) and isinstance(v2, (int, float)):
            if abs(v1 - v2) > tolerance:
                errors_list.append(f"{path}: Value mismatch: {v1} vs {v2} (diff: {abs(v1 - v2)})")
        
        elif v1 != v2:
            errors_list.append(f"{path}: Value mismatch: {v1} vs {v2}")
    
    compare_values(data1, data2, errors_list=errors)
    
    return len(errors) == 0, errors


def compare_runs(run1_dir: Path, run2_dir: Path, tolerance: float = 1e-10) -> Dict:
    """Compare two engine run directories."""
    results = {
        'run1': str(run1_dir),
        'run2': str(run2_dir),
        'timestamp': datetime.now().isoformat(),
        'matches': {},
        'errors': [],
        'summary': {}
    }
    
    # Files to compare
    files_to_check = [
        'graph.json',
        'evidence.json',
        'incidents.json',
        'config_version.json',
    ]
    
    # Compare each file
    for filename in files_to_check:
        file1 = run1_dir / filename
        file2 = run2_dir / filename
        
        match, errors = compare_json_files(file1, file2, tolerance)
        results['matches'][filename] = match
        if errors:
            results['errors'].extend([f"{filename}: {e}" for e in errors])
    
    # Compare packets directory
    packets1_dir = run1_dir / "packets"
    packets2_dir = run2_dir / "packets"
    
    if packets1_dir.exists() and packets2_dir.exists():
        packet_files1 = sorted(packets1_dir.glob("*.json"))
        packet_files2 = sorted(packets2_dir.glob("*.json"))
        
        if len(packet_files1) != len(packet_files2):
            results['errors'].append(
                f"packets/: Count mismatch: {len(packet_files1)} vs {len(packet_files2)}"
            )
        else:
            packet_matches = []
            for p1, p2 in zip(packet_files1, packet_files2):
                match, errors = compare_json_files(p1, p2, tolerance)
                packet_matches.append(match)
                if errors:
                    results['errors'].extend([f"{p1.name}: {e}" for e in errors])
            
            results['matches']['packets'] = all(packet_matches)
    
    # Summary
    all_match = all(results['matches'].values())
    results['summary'] = {
        'reproducible': all_match,
        'files_checked': len(results['matches']),
        'files_match': sum(1 for m in results['matches'].values() if m),
        'total_errors': len(results['errors'])
    }
    
    return results


def main():
    parser = argparse.ArgumentParser(
        description='Verify engine run reproducibility'
    )
    parser.add_argument('--run1', type=Path, required=True, help='First run directory')
    parser.add_argument('--run2', type=Path, required=True, help='Second run directory')
    parser.add_argument('--tolerance', type=float, default=1e-10, help='Floating-point tolerance')
    parser.add_argument('--output', type=Path, help='Output JSON report path')
    
    args = parser.parse_args()
    
    if not args.run1.exists():
        print(f"Error: Run 1 directory not found: {args.run1}")
        sys.exit(1)
    
    if not args.run2.exists():
        print(f"Error: Run 2 directory not found: {args.run2}")
        sys.exit(1)
    
    print(f"Comparing runs:")
    print(f"  Run 1: {args.run1}")
    print(f"  Run 2: {args.run2}")
    print(f"  Tolerance: {args.tolerance}")
    print()
    
    results = compare_runs(args.run1, args.run2, args.tolerance)
    
    # Print summary
    print("Comparison Results:")
    print(f"  Reproducible: {results['summary']['reproducible']}")
    print(f"  Files Checked: {results['summary']['files_checked']}")
    print(f"  Files Match: {results['summary']['files_match']}")
    print(f"  Total Errors: {results['summary']['total_errors']}")
    print()
    
    # Print file-by-file results
    print("File-by-File Results:")
    for filename, match in results['matches'].items():
        status = "✓" if match else "✗"
        print(f"  {status} {filename}")
    
    # Print errors
    if results['errors']:
        print()
        print("Errors:")
        for error in results['errors'][:20]:  # Limit to first 20
            print(f"  - {error}")
        if len(results['errors']) > 20:
            print(f"  ... and {len(results['errors']) - 20} more errors")
    
    # Save report
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nReport saved to: {args.output}")
    
    # Exit with error code if not reproducible
    sys.exit(0 if results['summary']['reproducible'] else 1)


if __name__ == "__main__":
    main()
