'use client';

import { useEffect, useState } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Tabs from '@/components/ui/Tabs';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { loadGraphData, loadEvidenceData } from '@/lib/loadData';
import { GraphData, EvidenceData, Node, Edge } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { Search, Filter, Map } from 'lucide-react';

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [evidenceData, setEvidenceData] = useState<EvidenceData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [activeTab, setActiveTab] = useState('Edge Evidence');
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const { 
    setSelectedNode: setStoreNode, 
    setSelectedEdge: setStoreEdge,
    showShadowLinksOnly,
    setShowShadowLinksOnly,
    warRoomMode,
  } = useAppStore();

  useEffect(() => {
    async function fetchData() {
      try {
        const [graph, evidence] = await Promise.all([
          loadGraphData(),
          loadEvidenceData(),
        ]);
        setGraphData(graph);
        setEvidenceData(evidence);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setStoreNode(node.id);
    setStoreEdge(null);
    setActiveTab('Node');
  };

  const handleEdgeClick = (edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setStoreEdge(edge.id);
    setStoreNode(null);
    setActiveTab('Edge Evidence');
  };

  const relevantEvidence = selectedEdge
    ? (evidenceData?.windows || []).filter((e) => e.edgeId === selectedEdge.id)
    : [];

  const counterexamples = relevantEvidence.filter((e) => e.supportType === 'counterexample');

  const rightPanelContent = (
    <>
      <Tabs
        items={selectedNode ? ['Node', 'Sensor Health'] : ['Edge Evidence', 'Sensor Health']}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="p-4 space-y-4">
        {!selectedNode && !selectedEdge && (
          <div className="text-text-muted text-body text-center py-8">
            Select a node or edge to view evidence
          </div>
        )}

        {selectedNode && activeTab === 'Node' && (
          <div className="space-y-4">
            <div>
              <div className="text-label mono text-text-muted mb-1">NODE ID</div>
              <div className="text-body-mono mono text-text-primary">{selectedNode.id}</div>
            </div>
            <div>
              <div className="text-label mono text-text-muted mb-1">LABEL</div>
              <div className="text-body mono text-text-primary">{selectedNode.label}</div>
            </div>
            <div>
              <div className="text-label mono text-text-muted mb-1">SECTOR</div>
              <div className="text-body mono text-text-primary uppercase">{selectedNode.sector}</div>
            </div>
            <div>
              <div className="text-label mono text-text-muted mb-1">HEALTH</div>
              <div className="flex items-center gap-2">
                <Badge status={selectedNode.health.status === 'ok' ? 'ok' : 'degraded'}>
                  {selectedNode.health.status.toUpperCase()}
                </Badge>
                <span className="text-data-number mono text-text-primary">
                  {Math.round(selectedNode.health.score * 100)}%
                </span>
              </div>
            </div>
            {selectedNode.lat && selectedNode.lon && (
              <div>
                <div className="text-label mono text-text-muted mb-1">COORDINATES</div>
                <div className="text-body-mono mono text-text-primary">
                  {selectedNode.lat.toFixed(4)}, {selectedNode.lon.toFixed(4)}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedEdge && activeTab === 'Edge Evidence' && (
          <div className="space-y-4">
            <div>
              <div className="text-label mono text-text-muted mb-1">EDGE</div>
              <div className="text-body mono text-text-primary">
                {graphData?.nodes.find((n) => n.id === selectedEdge.source)?.label || selectedEdge.source}
                {' → '}
                {graphData?.nodes.find((n) => n.id === selectedEdge.target)?.label || selectedEdge.target}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-label mono text-text-muted mb-1">CONFIDENCE</div>
                <div className="text-data-number mono text-text-primary">
                  {selectedEdge.confidenceScore.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-label mono text-text-muted mb-1">LAG</div>
                <div className="text-data-number mono text-text-primary">
                  {selectedEdge.inferredLagSeconds.toFixed(2)}s
                </div>
              </div>
              <div>
                <div className="text-label mono text-text-muted mb-1">STABILITY</div>
                <div className="text-data-number mono text-text-primary">
                  {selectedEdge.stabilityScore?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-label mono text-text-muted mb-2">EVIDENCE WINDOWS</div>
              <div className="space-y-2">
                {relevantEvidence.slice(0, 6).map((ev) => (
                  <Card key={ev.id} variant="evidence" className="p-3">
                    <div className="text-label mono text-text-muted mb-1">
                      {format(new Date(ev.startTs), 'MMM dd HH:mm')} - {format(new Date(ev.endTs), 'HH:mm')}
                    </div>
                    <div className="flex items-center gap-4 text-body-mono mono">
                      <span className="text-text-secondary">Corr:</span>
                      <span className="text-text-primary">{ev.correlation.toFixed(3)}</span>
                      <span className="text-text-secondary">Lag:</span>
                      <span className="text-text-primary">{ev.lagSeconds.toFixed(2)}s</span>
                    </div>
                    {ev.qualityContext && (
                      <div className="text-label mono text-text-muted mt-1">
                        Quality: {Math.round((1 - ev.qualityContext.missingness) * 100)}%
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {counterexamples.length > 0 && (
              <div>
                <div className="text-label mono text-text-muted mb-2">COUNTEREXAMPLES</div>
                <div className="space-y-2">
                  {counterexamples.map((ev) => (
                    <Card key={ev.id} variant="evidence" className="p-3 border-safety-amber/30">
                      <div className="text-label mono text-safety-amber mb-1">COUNTEREXAMPLE</div>
                      <div className="text-body-mono mono text-text-secondary">
                        {format(new Date(ev.startTs), 'MMM dd HH:mm')} - {format(new Date(ev.endTs), 'HH:mm')}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1">
                Export Evidence Pack (JSON)
              </Button>
              <Button variant="ghost">
                Open Supporting Signals
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (!graphData) {
    return (
      <CommandShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-muted font-mono">Loading graph data...</div>
        </div>
      </CommandShell>
    );
  }

  const filteredEdges = showShadowLinksOnly
    ? graphData.edges.filter((e) => e.isShadowLink)
    : graphData.edges;

  const filteredGraphData = {
    ...graphData,
    edges: filteredEdges,
  };

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle={selectedNode ? 'Node Details' : selectedEdge ? 'Edge Evidence' : 'Context'}
      rightPanelCollapsed={rightPanelCollapsed}
      onRightPanelToggle={() => setRightPanelCollapsed(!rightPanelCollapsed)}
    >
      <div className="relative w-full h-full bg-base-950">
        {/* Filter bar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-base-900/90 overlay-glass border border-base-700 rounded px-3 py-2">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search assets..."
              className="flex-1 bg-transparent border-none text-body text-text-primary placeholder:text-text-muted focus:outline-none mono"
            />
          </div>
          <div className="flex items-center gap-2 bg-base-900/90 overlay-glass border border-base-700 rounded px-3 py-2">
            <input
              type="checkbox"
              id="shadow-links-only"
              checked={showShadowLinksOnly}
              onChange={(e) => setShowShadowLinksOnly(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="shadow-links-only" className="text-label mono text-text-primary cursor-pointer">
              Shadow Links Only
            </label>
          </div>
          <button className="bg-base-900/90 overlay-glass border border-base-700 rounded px-3 py-2 hover:bg-base-800">
            <Filter className="w-4 h-4 text-text-secondary" />
          </button>
          <button className="bg-base-900/90 overlay-glass border border-base-700 rounded px-3 py-2 hover:bg-base-800">
            <Map className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute top-20 left-4 z-10 bg-base-900/90 overlay-glass border border-base-700 rounded p-3">
          <div className="text-label mono text-text-primary mb-2">LEGEND</div>
          <div className="space-y-2 text-body-mono mono text-text-secondary">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-safety-cobalt" />
              <span>Shadow Link</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-safety-emerald" />
              <span>Health: OK</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-safety-amber" />
              <span>Health: Degraded</span>
            </div>
          </div>
        </div>

        {/* Graph canvas */}
        <GraphCanvas
          data={filteredGraphData}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
        />

        {/* War Room: Critical Dependencies */}
        {warRoomMode && (
          <div className="absolute bottom-4 left-4 z-10 w-80 bg-base-900/90 overlay-glass border border-base-700 rounded p-3">
            <div className="text-label mono text-text-primary mb-2">TOP 5 CRITICAL DEPENDENCIES</div>
            <div className="space-y-1 text-body-mono mono">
              {filteredEdges
                .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
                .slice(0, 5)
                .map((edge) => (
                  <div key={edge.id} className="flex items-center justify-between text-text-secondary">
                    <span>
                      {graphData.nodes.find((n) => n.id === edge.source)?.label} →{' '}
                      {graphData.nodes.find((n) => n.id === edge.target)?.label}
                    </span>
                    <span className="text-safety-cobalt">C={edge.confidenceScore.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </CommandShell>
  );
}
