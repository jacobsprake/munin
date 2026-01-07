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
  const { 
    selectedNodeId, 
    selectedEdgeId, 
    showShadowLinksOnly, 
    blastRadiusDepth,
    setShowShadowLinksOnly,
    setBlastRadiusDepth
  } = useAppStore();

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-300);
      fgRef.current.d3Force('link')?.distance(100);
    }
  }, []);

  const getNodeColor = (node: Node) => {
    if (selectedNodeId === node.id) return '#3B82F6'; // safety-cobalt
    if (node.health.status === 'warning') return '#F6B73C'; // safety-amber
    if (node.health.status === 'degraded') return '#F6B73C'; // safety-amber
    if (node.health.status === 'ok') return '#22C55E'; // safety-emerald
    return '#6D7E90'; // text-muted
  };

  const getEdgeColor = (edge: Edge) => {
    if (selectedEdgeId === edge.id) return '#3B82F6'; // safety-cobalt
    if (edge.isShadowLink) return '#F6B73C'; // safety-amber for shadow links
    const alpha = Math.max(0.3, edge.confidenceScore);
    return `rgba(109, 126, 144, ${alpha})`; // text-muted with confidence-based opacity
  };

  const getDownstreamNodes = (nodeId: string, maxDepth: number = 1): Set<string> => {
    const downstream = new Set<string>();
    const visited = new Set<string>();
    const queue: Array<[string, number]> = [[nodeId, 0]];

    while (queue.length > 0) {
      const [current, depth] = queue.shift()!;
      if (visited.has(current) || depth > maxDepth) continue;
      visited.add(current);

      data.edges
        .filter((e) => e.source === current)
        .forEach((e) => {
          downstream.add(e.target);
          queue.push([e.target, depth + 1]);
        });
    }

    return downstream;
  };

  // Filter edges based on shadow link toggle
  const filteredEdges = showShadowLinksOnly
    ? data.edges.filter((e) => e.isShadowLink === true)
    : data.edges;

  const filteredData = {
    nodes: data.nodes,
    links: filteredEdges,
  };

  const highlightedNodes = selectedNodeId
    ? new Set([selectedNodeId, ...getDownstreamNodes(selectedNodeId, blastRadiusDepth)])
    : new Set(data.nodes.map((n) => n.id));

  return (
    <div className="w-full h-full bg-base-950 relative">
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-base-900/90 backdrop-blur-sm border border-base-700 rounded p-3 space-y-2">
          <label className="flex items-center gap-2 text-xs font-mono text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showShadowLinksOnly}
              onChange={(e) => setShowShadowLinksOnly(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Show Shadow Links Only</span>
          </label>
          {showShadowLinksOnly && (
            <div className="text-xs text-safety-amber font-mono pl-6">
              Inferred from telemetry, not in registry
            </div>
          )}
        </div>
        {selectedNodeId && (
          <div className="bg-base-900/90 backdrop-blur-sm border border-base-700 rounded p-3">
            <div className="text-xs font-mono text-text-secondary mb-2">Blast Radius Depth</div>
            <div className="flex gap-2">
              {[1, 2, 3].map((depth) => (
                <button
                  key={depth}
                  onClick={() => setBlastRadiusDepth(depth)}
                  className={`px-2 py-1 text-xs font-mono rounded ${
                    blastRadiusDepth === depth
                      ? 'bg-safety-cobalt/20 text-safety-cobalt border border-safety-cobalt'
                      : 'bg-base-800 text-text-secondary hover:bg-base-700'
                  }`}
                >
                  {depth}-hop
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <ForceGraph2D
        ref={fgRef}
        graphData={filteredData}
        nodeLabel={(node: Node) => `${node.label}\n${node.sector} • ${node.kind}`}
        nodeColor={(node: Node) => getNodeColor(node)}
        nodeVal={(node: Node) => 8 + node.health.score * 4}
        nodeOpacity={(node: Node) => (highlightedNodes.has(node.id) ? 1 : 0.2)}
        linkLabel={(link: Edge) => {
          const shadowNote = link.isShadowLink ? '\n[SHADOW LINK]' : '';
          return `Confidence: ${(link.confidenceScore * 100).toFixed(1)}%\nLag: ${link.inferredLagSeconds}s${shadowNote}`;
        }}
        linkColor={(link: Edge) => getEdgeColor(link)}
        linkWidth={(link: Edge) => {
          if (selectedEdgeId === link.id) return 3;
          if (link.isShadowLink) return 2;
          return 1 + link.confidenceScore;
        }}
        linkOpacity={(link: Edge) => {
          if (selectedEdgeId === link.id) return 1;
          if (selectedNodeId) {
            const sourceHighlighted = highlightedNodes.has(link.source);
            const targetHighlighted = highlightedNodes.has(link.target);
            return sourceHighlighted && targetHighlighted ? 0.8 : 0.1;
          }
          if (showShadowLinksOnly && !link.isShadowLink) return 0;
          return 0.4;
        }}
        onNodeClick={(node: Node) => {
          onNodeClick?.(node);
        }}
        onLinkClick={(link: Edge) => {
          onEdgeClick?.(link);
        }}
        backgroundColor="#0B0F14"
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

