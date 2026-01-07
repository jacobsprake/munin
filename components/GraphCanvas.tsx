'use client';

import { useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphData, Node, Edge } from '@/lib/types';
import { useAppStore } from '@/lib/store';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (node: Node) => void;
  onEdgeClick?: (edge: Edge) => void;
}

export default function GraphCanvas({ data, onNodeClick, onEdgeClick }: GraphCanvasProps) {
  const fgRef = useRef<any>();
  const { selectedNodeId, selectedEdgeId } = useAppStore();

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-300);
      fgRef.current.d3Force('link')?.distance(100);
    }
  }, []);

  const getNodeColor = (node: Node) => {
    if (selectedNodeId === node.id) return '#3b82f6'; // cobalt
    if (node.health.status === 'warning') return '#f59e0b'; // amber
    if (node.health.status === 'degraded') return '#ef4444'; // red
    if (node.health.status === 'ok') return '#10b981'; // emerald
    return '#64748b'; // slate
  };

  const getEdgeColor = (edge: Edge) => {
    if (selectedEdgeId === edge.id) return '#3b82f6'; // cobalt
    const alpha = Math.max(0.3, edge.confidenceScore);
    return `rgba(100, 116, 139, ${alpha})`; // slate with confidence-based opacity
  };

  const getDownstreamNodes = (nodeId: string): Set<string> => {
    const downstream = new Set<string>();
    const visited = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      data.edges
        .filter((e) => e.source === current)
        .forEach((e) => {
          downstream.add(e.target);
          queue.push(e.target);
        });
    }

    return downstream;
  };

  const highlightedNodes = selectedNodeId
    ? new Set([selectedNodeId, ...getDownstreamNodes(selectedNodeId)])
    : new Set(data.nodes.map((n) => n.id));

  return (
    <div className="w-full h-full bg-charcoal-200">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        nodeLabel={(node: Node) => `${node.label}\n${node.sector} • ${node.kind}`}
        nodeColor={(node: Node) => getNodeColor(node)}
        nodeVal={(node: Node) => 8 + node.health.score * 4}
        nodeOpacity={(node: Node) => (highlightedNodes.has(node.id) ? 1 : 0.2)}
        linkLabel={(link: Edge) =>
          `Confidence: ${(link.confidenceScore * 100).toFixed(1)}%\nLag: ${link.inferredLagSeconds}s`
        }
        linkColor={(link: Edge) => getEdgeColor(link)}
        linkWidth={(link: Edge) => (selectedEdgeId === link.id ? 3 : 1 + link.confidenceScore)}
        linkOpacity={(link: Edge) => {
          if (selectedEdgeId === link.id) return 1;
          if (selectedNodeId) {
            const sourceHighlighted = highlightedNodes.has(link.source);
            const targetHighlighted = highlightedNodes.has(link.target);
            return sourceHighlighted && targetHighlighted ? 0.8 : 0.1;
          }
          return 0.4;
        }}
        onNodeClick={(node: Node) => {
          onNodeClick?.(node);
        }}
        onLinkClick={(link: Edge) => {
          onEdgeClick?.(link);
        }}
        backgroundColor="#0f0f0f"
        cooldownTicks={100}
        onEngineStop={() => {
          if (fgRef.current) {
            fgRef.current.zoomToFit(400, 20);
          }
        }}
      />
    </div>
  );
}

