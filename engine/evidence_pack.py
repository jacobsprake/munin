"""Generate evidence packs for edges."""
import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional

def compute_provenance_hash(data: Dict) -> str:
    """Compute provenance hash for data."""
    json_str = json.dumps(data, sort_keys=True)
    return hashlib.sha256(json_str.encode()).hexdigest()

def build_evidence_pack(
    edge: Dict,
    evidence_windows: List[Dict],
    graph: Dict,
    sensor_health: Optional[Dict] = None
) -> Dict:
    """Build a complete evidence pack for an edge."""
    
    # Filter evidence windows for this edge
    relevant_windows = [w for w in evidence_windows if w.get('edgeId') == edge['id']]
    
    # Get source and target node info
    source_node = next((n for n in graph['nodes'] if n['id'] == edge['source']), None)
    target_node = next((n for n in graph['nodes'] if n['id'] == edge['target']), None)
    
    # Build sensor health summary
    sensor_health_summary = {}
    if sensor_health:
        if edge['source'] in sensor_health:
            sensor_health_summary['source'] = sensor_health[edge['source']]
        if edge['target'] in sensor_health:
            sensor_health_summary['target'] = sensor_health[edge['target']]
    
    # Compute aggregate metrics
    if relevant_windows:
        avg_correlation = sum(w.get('correlation', 0) for w in relevant_windows) / len(relevant_windows)
        avg_robustness = sum(w.get('robustness', 0) for w in relevant_windows) / len(relevant_windows)
    else:
        avg_correlation = 0.0
        avg_robustness = 0.0
    
    evidence_pack = {
        'edgeId': edge['id'],
        'edgeMetadata': {
            'source': edge['source'],
            'target': edge['target'],
            'sourceNode': {
                'id': source_node['id'] if source_node else edge['source'],
                'label': source_node.get('label', edge['source']) if source_node else edge['source'],
                'sector': source_node.get('sector', 'unknown') if source_node else 'unknown',
                'kind': source_node.get('kind', 'unknown') if source_node else 'unknown',
            },
            'targetNode': {
                'id': target_node['id'] if target_node else edge['target'],
                'label': target_node.get('label', edge['target']) if target_node else edge['target'],
                'sector': target_node.get('sector', 'unknown') if target_node else 'unknown',
                'kind': target_node.get('kind', 'unknown') if target_node else 'unknown',
            },
            'confidenceScore': edge.get('confidenceScore', 0.0),
            'inferredLagSeconds': edge.get('inferredLagSeconds', 0),
            'stabilityScore': edge.get('stabilityScore', 0.0),
            'isShadowLink': edge.get('isShadowLink', False),
            'evidenceWindowCount': len(relevant_windows),
            'confounderNotes': edge.get('confounderNotes', []),
        },
        'windows': relevant_windows,
        'aggregateMetrics': {
            'averageCorrelation': float(avg_correlation),
            'averageRobustness': float(avg_robustness),
            'windowCount': len(relevant_windows),
        },
        'sensorHealthSummary': sensor_health_summary,
        'provenance': {
            'generatedAt': None,  # Will be set by caller
            'dataHash': None,  # Will be computed
            'modelVersion': 'prototype_v1',
        }
    }
    
    # Compute provenance hash
    from datetime import datetime
    evidence_pack['provenance']['generatedAt'] = datetime.now().isoformat()
    evidence_pack['provenance']['dataHash'] = compute_provenance_hash(evidence_pack)
    
    return evidence_pack

def export_evidence_pack_json(evidence_pack: Dict, output_path: Path):
    """Export evidence pack as JSON."""
    with open(output_path, 'w') as f:
        json.dump(evidence_pack, f, indent=2)
    print(f"Evidence pack exported to {output_path}")

def export_evidence_pack_summary(evidence_pack: Dict) -> str:
    """Generate a human-readable summary of the evidence pack."""
    edge_meta = evidence_pack['edgeMetadata']
    summary_lines = [
        f"Evidence Pack: {evidence_pack['edgeId']}",
        f"Source: {edge_meta['sourceNode']['label']} ({edge_meta['sourceNode']['sector']})",
        f"Target: {edge_meta['targetNode']['label']} ({edge_meta['targetNode']['sector']})",
        f"",
        f"Edge Properties:",
        f"  Confidence: {edge_meta['confidenceScore']:.1%}",
        f"  Inferred Lag: {edge_meta['inferredLagSeconds']}s",
        f"  Stability Score: {edge_meta['stabilityScore']:.1%}",
        f"  Shadow Link: {'Yes' if edge_meta['isShadowLink'] else 'No'}",
        f"  Evidence Windows: {edge_meta['evidenceWindowCount']}",
        f"",
        f"Aggregate Metrics:",
        f"  Average Correlation: {evidence_pack['aggregateMetrics']['averageCorrelation']:.3f}",
        f"  Average Robustness: {evidence_pack['aggregateMetrics']['averageRobustness']:.1%}",
    ]
    
    if edge_meta['confounderNotes']:
        summary_lines.append(f"")
        summary_lines.append(f"Confounder Notes:")
        for note in edge_meta['confounderNotes']:
            summary_lines.append(f"  - {note}")
    
    if evidence_pack['sensorHealthSummary']:
        summary_lines.append(f"")
        summary_lines.append(f"Sensor Health:")
        for node_key, health in evidence_pack['sensorHealthSummary'].items():
            summary_lines.append(f"  {node_key}: {health.get('status', 'unknown')} ({health.get('score', 0):.1%})")
    
    summary_lines.append(f"")
    summary_lines.append(f"Provenance Hash: {evidence_pack['provenance']['dataHash']}")
    
    return "\n".join(summary_lines)


