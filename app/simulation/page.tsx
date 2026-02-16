'use client';

import { useEffect, useState } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import SimulationScrubber from '@/components/SimulationScrubber';
import LatencyImpactWidget from '@/components/LatencyImpactWidget';
import CommandShell from '@/components/CommandShell';
import DigitalTwinShadow from '@/components/DigitalTwinShadow';
import AgenticReasoningPanel from '@/components/AgenticReasoningPanel';
import RightPanel from '@/components/RightPanel';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import { loadGraphData, loadIncidentsData } from '@/lib/loadData';
import { GraphData, IncidentsData, Incident, Node } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { parseISO, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import RiverLevelsPanel from '@/components/RiverLevelsPanel';
import ChaosScenarioSelector from '@/components/ChaosScenarioSelector';
import CounterfactualPanel from '@/components/CounterfactualPanel';

export default function SimulationPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [incidentsData, setIncidentsData] = useState<IncidentsData | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const { 
    setSelectedIncident: setStoreIncident, 
    simulationTime, 
    setSimulationTime,
    warRoomMode,
    shadowGraph,
    setShadowGraph,
    shadowModeActive,
    setShadowModeActive,
  } = useAppStore();
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

  const [decisionCreating, setDecisionCreating] = useState(false);
  const [decisionId, setDecisionId] = useState<string | null>(null);

  const handleGenerateHandshake = () => {
    if (selectedIncident) {
      router.push(`/handshakes?generate=${selectedIncident.id}`);
    }
  };

  const handleCreateDecision = async () => {
    if (!selectedIncident) return;
    setDecisionCreating(true);
    setDecisionId(null);
    try {
      const res = await fetch('/api/decisions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: selectedIncident.id,
          playbook_id: 'flood_event_pump_isolation.yaml',
          step_id: null,
          policy: { threshold: 1, required: 1, signers: ['ea_duty_officer', 'regulatory_compliance', 'emergency_services'] },
          previous_decision_hash: null,
        }),
      });
      const data = await res.json();
      if (data.success && data.decision?.decision_id) {
        setDecisionId(data.decision.decision_id);
      } else {
        console.error('Create decision failed:', data);
      }
    } catch (e) {
      console.error('Create decision error:', e);
    } finally {
      setDecisionCreating(false);
    }
  };

  if (!graphData || !incidentsData) {
    return (
      <CommandShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-muted font-mono">Loading simulation data...</div>
        </div>
      </CommandShell>
    );
  }

  const impactedNodes = getImpactedNodes();
  const currentTimelineEntry = selectedIncident
    ? selectedIncident.timeline
        .filter((t) => parseISO(t.ts).getTime() <= (simulationTime || 0))
        .slice(-1)[0]
    : null;

  const upcomingEntries = selectedIncident
    ? selectedIncident.timeline
        .filter((t) => parseISO(t.ts).getTime() > (simulationTime || 0))
        .slice(0, 3)
    : [];

  const cascadeTableRows = selectedIncident
    ? selectedIncident.timeline.map((t) => {
        const timeToImpact = Math.round((parseISO(t.ts).getTime() - parseISO(selectedIncident.startTs).getTime()) / 1000 / 60);
        return [
          <span key="nodes" className="text-body-mono mono">
            {t.impactedNodeIds.length} nodes
          </span>,
          <span key="time" className="text-body-mono mono">
            T+{timeToImpact}m
          </span>,
          <span key="conf" className="text-body-mono mono">
            {(t.confidence * 100).toFixed(0)}%
          </span>,
        ];
      })
    : [];

  const rightPanelContent = selectedIncident ? (
    <div className="p-4 space-y-4">
      <Card variant="playbook">
        <div className="flex items-center justify-between mb-2">
          <div className="text-label mono text-text-muted">INCIDENT</div>
          <Badge status="warning">
            {selectedIncident.type.toUpperCase()}
          </Badge>
        </div>
        <div className="text-panel-title mono font-semibold text-text-primary mb-2">
          {selectedIncident.title}
        </div>
        <div className="flex items-center gap-4">
          <div>
            <div className="text-label mono text-text-muted">SEVERITY</div>
            <div className="text-data-number mono text-safety-amber">HIGH</div>
          </div>
          <div>
            <div className="text-label mono text-text-muted">CONFIDENCE</div>
            <div className="text-data-number mono text-text-primary">
              {currentTimelineEntry ? (currentTimelineEntry.confidence * 100).toFixed(0) : '0'}%
            </div>
          </div>
        </div>
      </Card>

      <RiverLevelsPanel
        stationNodeId="carlisle_river_station_01"
        label="River Eden Level (Live)"
      />

      <div>
        <div className="text-label mono text-text-muted mb-2">PREDICTED CASCADE</div>
        <Table
          headers={['Node', 'Time-to-Impact', 'Confidence']}
          rows={cascadeTableRows}
        />
      </div>

      {currentTimelineEntry && currentTimelineEntry.confidenceBand && (
        <Card>
          <div className="text-label mono text-text-muted mb-2">CONFIDENCE BAND</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-base-800 rounded-full overflow-hidden relative">
              <div
                className="absolute h-full bg-safety-cobalt"
                style={{
                  left: `${currentTimelineEntry.confidenceBand.lower * 100}%`,
                  width: `${(currentTimelineEntry.confidenceBand.upper - currentTimelineEntry.confidenceBand.lower) * 100}%`,
                }}
              />
            </div>
            <span className="text-body-mono mono text-text-secondary">
              {currentTimelineEntry.confidenceBand.lower.toFixed(2)} - {currentTimelineEntry.confidenceBand.upper.toFixed(2)}
            </span>
          </div>
        </Card>
      )}

      <Card variant="playbook">
        <div className="text-label mono text-text-muted mb-2">RECOMMENDED PLAYBOOK</div>
        <div className="text-body mono text-text-primary mb-2">
          flood_event_pump_isolation.yaml
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-body-mono mono">
            <span className="text-text-secondary">Simulated success probability:</span>
            <span className="text-safety-emerald">0.94</span>
          </div>
          <div className="flex items-center justify-between text-body-mono mono">
            <span className="text-text-secondary">Constraints satisfied:</span>
            <span className="text-text-primary">5</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="primary" onClick={handleGenerateHandshake} className="w-full">
            Generate Handshake
          </Button>
          <Button
            variant="secondary"
            onClick={handleCreateDecision}
            disabled={decisionCreating}
            className="w-full"
          >
            {decisionCreating ? 'Creating…' : 'Create decision'}
          </Button>
          {decisionId && (
            <p className="text-body-mono mono text-safety-emerald text-center">
              Decision created: {decisionId.slice(0, 8)}…
            </p>
          )}
        </div>
      </Card>

      <LatencyImpactWidget
        timeToImpact={
          upcomingEntries.length > 0
            ? Math.floor((parseISO(upcomingEntries[0].ts).getTime() - (simulationTime || startTime)) / 1000)
            : undefined
        }
      />

      <DigitalTwinShadow
        graphData={graphData}
        onShadowChange={(shadow) => {
          setShadowGraph(shadow);
          setShadowModeActive(true);
        }}
      />

      {selectedIncident && (
        <AgenticReasoningPanel incidentId={selectedIncident.id} />
      )}

      <ChaosScenarioSelector
        onSelectScenario={(scenario) => {
          // Convert chaos scenario to incident format for simulation
          const chaosIncident: Incident = {
            id: scenario.id,
            title: scenario.title,
            type: scenario.scenario_type,
            startTs: new Date().toISOString(),
            timeline: scenario.impact_metrics ? [{
              ts: new Date().toISOString(),
              impactedNodeIds: [],
              confidence: 0.9
            }] : []
          };
          setSelectedIncident(chaosIncident);
          setStoreIncident(chaosIncident.id);
        }}
      />

      <CounterfactualPanel
        onRunSimulation={(result) => {
          console.log('Counterfactual simulation result:', result);
          // Could integrate with simulation view
        }}
      />

      <Card>
        <div className="text-label mono text-text-muted mb-2">PRE-VALIDATION LOGIC</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-body-mono mono">
            <span className="text-text-secondary">Simulated success probability:</span>
            <span className="text-safety-emerald font-semibold">0.94</span>
          </div>
          <div className="flex items-center justify-between text-body-mono mono">
            <span className="text-text-secondary">Constraints satisfied:</span>
            <span className="text-text-primary">5</span>
          </div>
          <div className="flex items-center justify-between text-body-mono mono">
            <span className="text-text-secondary">Uncertainty:</span>
            <span className="text-safety-amber">Low</span>
          </div>
        </div>
      </Card>
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      Select an incident to view simulation
    </div>
  );

  const startTime = selectedIncident ? parseISO(selectedIncident.startTs).getTime() : Date.now();
  const currentTimeOffset = simulationTime ? Math.floor((simulationTime - startTime) / 1000 / 60) : 0;

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Cascade Prediction"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex overflow-hidden">
        {/* Map Panel - Left 45% */}
        <div className="w-[45%] bg-base-900 border-r border-base-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-base-850 to-base-900">
            {/* Placeholder for map visualization */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-text-muted text-body mono">Map View (Topographic)</div>
            </div>
            {/* Node markers */}
            {graphData.nodes
              .filter((n) => n.lat && n.lon)
              .map((node) => {
                const isImpacted = impactedNodes.has(node.id);
                return (
                  <div
                    key={node.id}
                    className="absolute"
                    style={{
                      left: `${((node.lon! + 180) / 360) * 100}%`,
                      top: `${((90 - node.lat!) / 180) * 100}%`,
                    }}
                  >
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${
                        isImpacted
                          ? 'bg-safety-amber border-safety-amber animate-pulse'
                          : 'bg-safety-emerald border-safety-emerald'
                      }`}
                    />
                  </div>
                );
              })}
          </div>
        </div>

        {/* Graph Panel - Right 55% */}
        <div className="flex-1 relative">
          <GraphCanvas data={getFilteredGraphData() || graphData} />
        </div>
      </div>

      {/* Timeline Scrubber */}
      {selectedIncident && (
        <div className="h-24 bg-base-900 border-t border-base-700">
          <SimulationScrubber
            incident={selectedIncident}
            currentTime={simulationTime || parseISO(selectedIncident.startTs).getTime()}
            onTimeChange={(time) => setSimulationTime(time)}
          />
          <div className="px-6 py-2 flex items-center justify-between text-body-mono mono">
            <div className="flex items-center gap-4 text-text-secondary">
              <span>FLOOD EVENT</span>
              <span>DROUGHT EVENT</span>
              <span>FREQUENCY INSTABILITY</span>
            </div>
            <div className="text-text-primary">
              T+{String(Math.floor(currentTimeOffset / 60)).padStart(2, '0')}:{String(currentTimeOffset % 60).padStart(2, '0')}
            </div>
          </div>
        </div>
      )}
    </CommandShell>
  );
}
