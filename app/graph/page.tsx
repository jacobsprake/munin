'use client';

import { useEffect, useState } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import EvidencePanel from '@/components/EvidencePanel';
import StatusStrip from '@/components/StatusStrip';
import { loadGraphData, loadEvidenceData } from '@/lib/loadData';
import { GraphData, EvidenceData, Node, Edge } from '@/lib/types';
import { useAppStore } from '@/lib/store';

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [evidenceData, setEvidenceData] = useState<EvidenceData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const { setSelectedNode: setStoreNode, setSelectedEdge: setStoreEdge } = useAppStore();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    async function fetchData() {
      try {
        const [graph, evidence] = await Promise.all([
          loadGraphData(),
          loadEvidenceData(),
        ]);
        setGraphData(graph);
        setEvidenceData(evidence);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setStoreNode(node.id);
    setStoreEdge(null);
  };

  const handleEdgeClick = (edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setStoreEdge(edge.id);
    setStoreNode(null);
  };

  if (!graphData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-500 font-mono">Loading graph data...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <GraphCanvas
            data={graphData}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
          />
        </div>
        <EvidencePanel
          node={selectedNode}
          edge={selectedEdge}
          evidence={evidenceData?.windows || []}
        />
      </div>
      <StatusStrip lastUpdate={lastUpdate} ingestStatus="active" />
    </div>
  );
}

