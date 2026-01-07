'use client';

import { useEffect, useState } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import SimulationScrubber from '@/components/SimulationScrubber';
import StatusStrip from '@/components/StatusStrip';
import { loadGraphData, loadIncidentsData } from '@/lib/loadData';
import { GraphData, IncidentsData, Incident, Node, Edge } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function SimulationPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [incidentsData, setIncidentsData] = useState<IncidentsData | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const { setSelectedIncident: setStoreIncident, simulationTime, setSimulationTime } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [graph, incidents] = await Promise.all([
          loadGraphData(),
          loadIncidentsData(),
        ]);
        setGraphData(graph);
        setIncidentsData(incidents);
        if (incidents.incidents.length > 0 && !selectedIncident) {
          const first = incidents.incidents[0];
          setSelectedIncident(first);
          setStoreIncident(first.id);
          setSimulationTime(parseISO(first.startTs).getTime());
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }
    fetchData();
  }, []);

  const getImpactedNodes = (): Set<string> => {
    if (!selectedIncident || !simulationTime) return new Set();
    return new Set(
      selectedIncident.timeline
        .filter((t) => parseISO(t.ts).getTime() <= simulationTime)
        .flatMap((t) => t.impactedNodeIds)
    );
  };

  const getFilteredGraphData = (): GraphData | null => {
    if (!graphData || !selectedIncident) return graphData;
    const impacted = getImpactedNodes();
    return {
      nodes: graphData.nodes.map((n) => ({
        ...n,
        health: impacted.has(n.id)
          ? { ...n.health, status: 'warning' as const }
          : n.health,
      })),
      edges: graphData.edges,
    };
  };

  const handleGenerateHandshake = () => {
    if (selectedIncident) {
      router.push(`/handshakes?generate=${selectedIncident.id}`);
    }
  };

  if (!graphData || !incidentsData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-500 font-mono">Loading simulation data...</div>
      </div>
    );
  }

  const impactedNodes = getImpactedNodes();
  const currentTimelineEntry = selectedIncident
    ? selectedIncident.timeline
        .filter((t) => parseISO(t.ts).getTime() <= (simulationTime || 0))
        .slice(-1)[0]
    : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <GraphCanvas data={getFilteredGraphData() || graphData} />
        </div>
        <div className="w-96 bg-charcoal-100 border-l border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-mono font-semibold text-foreground uppercase">
              Cascade Prediction
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedIncident && (
              <>
                <div>
                  <div className="text-xs text-slate-500 font-mono mb-1">INCIDENT</div>
                  <div className="text-sm font-mono text-foreground">{selectedIncident.title}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-mono mb-1">TYPE</div>
                  <div className="text-sm font-mono text-foreground uppercase">
                    {selectedIncident.type}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-mono mb-1">BLAST RADIUS</div>
                  <div className="text-lg font-mono text-amber-400">{impactedNodes.size} nodes</div>
                </div>
                {currentTimelineEntry && (
                  <div>
                    <div className="text-xs text-slate-500 font-mono mb-1">CONFIDENCE</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cobalt-500"
                          style={{ width: `${currentTimelineEntry.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono text-foreground">
                        {Math.round(currentTimelineEntry.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-500 font-mono mb-2">TIME TO IMPACT</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedIncident.timeline.map((t, idx) => {
                      const time = parseISO(t.ts).getTime();
                      const isPast = time <= (simulationTime || 0);
                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded border text-xs font-mono ${
                            isPast
                              ? 'bg-amber-900/20 border-amber-700 text-amber-400'
                              : 'bg-slate-900/50 border-slate-700 text-slate-400'
                          }`}
                        >
                          <div className="flex justify-between mb-1">
                            <span>{new Date(time).toLocaleTimeString()}</span>
                            <span>{t.impactedNodeIds.length} nodes</span>
                          </div>
                          <div className="text-xs opacity-75">
                            Confidence: {Math.round(t.confidence * 100)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800">
                  <button
                    onClick={handleGenerateHandshake}
                    className="w-full px-4 py-2 bg-cobalt-900/30 border border-cobalt-700 text-cobalt-400 font-mono text-sm rounded hover:bg-cobalt-900/50 transition-colors glow-cobalt"
                  >
                    GENERATE HANDSHAKE
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {selectedIncident && (
        <SimulationScrubber
          incident={selectedIncident}
          currentTime={simulationTime || parseISO(selectedIncident.startTs).getTime()}
          onTimeChange={(time) => setSimulationTime(time)}
        />
      )}
      <StatusStrip ingestStatus="active" />
    </div>
  );
}

