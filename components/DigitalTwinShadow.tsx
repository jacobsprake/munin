'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { GraphData, Node, Edge } from '@/lib/types';
import { Ghost, AlertTriangle, Play, Square } from 'lucide-react';

interface DigitalTwinShadowProps {
  graphData: GraphData;
  onShadowChange?: (shadowGraph: GraphData) => void;
}

interface ShadowScenario {
  id: string;
  name: string;
  description: string;
  failureNodeId: string;
  cascadeDepth: number;
}

const SHADOW_SCENARIOS: ShadowScenario[] = [
  {
    id: 'dam_failure',
    name: 'Dam Failure',
    description: 'Simulate catastrophic dam failure and downstream cascade',
    failureNodeId: 'reservoir_alpha',
    cascadeDepth: 3
  },
  {
    id: 'power_blackout',
    name: 'Regional Power Blackout',
    description: 'Simulate complete power grid failure affecting all sectors',
    failureNodeId: 'substation_north_01',
    cascadeDepth: 4
  },
  {
    id: 'pump_cascade',
    name: 'Pump Station Cascade Failure',
    description: 'Simulate multiple pump station failures in sequence',
    failureNodeId: 'pump_station_01',
    cascadeDepth: 2
  }
];

export default function DigitalTwinShadow({ graphData, onShadowChange }: DigitalTwinShadowProps) {
  const [isActive, setIsActive] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ShadowScenario | null>(null);
  const [shadowGraph, setShadowGraph] = useState<GraphData | null>(null);
  const [simulationTime, setSimulationTime] = useState(0);

  useEffect(() => {
    if (isActive && selectedScenario) {
      generateShadowGraph(selectedScenario);
    } else {
      setShadowGraph(null);
      setSimulationTime(0);
    }
  }, [isActive, selectedScenario]);

  useEffect(() => {
    if (shadowGraph && onShadowChange) {
      onShadowChange(shadowGraph);
    }
  }, [shadowGraph, onShadowChange]);

  const generateShadowGraph = (scenario: ShadowScenario) => {
    // Create a shadow copy of the graph
    const shadow: GraphData = {
      nodes: graphData.nodes.map(node => ({ ...node })),
      edges: graphData.edges.map(edge => ({ ...edge, isShadowLink: true }))
    };

    // Find the failure node
    const failureNode = shadow.nodes.find(n => n.id === scenario.failureNodeId);
    if (!failureNode) return;

    // Mark failure node as critical
    failureNode.health = {
      status: 'warning',
      score: 0.0
    };

    // Simulate cascade through dependency chains
    const affectedNodes = new Set<string>([scenario.failureNodeId]);
    const queue: Array<[string, number]> = [[scenario.failureNodeId, 0]];

    while (queue.length > 0) {
      const [currentId, depth] = queue.shift()!;
      if (depth >= scenario.cascadeDepth) continue;

      // Find downstream nodes
      const downstreamEdges = shadow.edges.filter(e => e.source === currentId);
      for (const edge of downstreamEdges) {
        if (!affectedNodes.has(edge.target)) {
          affectedNodes.add(edge.target);
          queue.push([edge.target, depth + 1]);

          // Degrade health based on cascade depth
          const targetNode = shadow.nodes.find(n => n.id === edge.target);
          if (targetNode) {
            const healthDegradation = 1.0 - (depth + 1) * 0.3;
            targetNode.health = {
              status: depth === 0 ? 'warning' : 'degraded',
              score: Math.max(0, healthDegradation)
            };
          }
        }
      }
    }

    setShadowGraph(shadow);
  };

  const handleStartShadow = (scenario: ShadowScenario) => {
    setSelectedScenario(scenario);
    setIsActive(true);
    setSimulationTime(0);
  };

  const handleStopShadow = () => {
    setIsActive(false);
    setSelectedScenario(null);
    setShadowGraph(null);
    setSimulationTime(0);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ghost className="w-5 h-5 text-safety-amber" />
          <h3 className="text-panel-title mono font-semibold text-text-primary">
            DIGITAL TWIN SHADOW MODE
          </h3>
        </div>
        {isActive && (
          <Badge status="warning" className="animate-pulse">
            ACTIVE
          </Badge>
        )}
      </div>

      {!isActive ? (
        <div className="space-y-3">
          <div className="text-body mono text-text-secondary">
            Run "What-If" scenarios in a parallel shadow environment while the live grid continues operating.
          </div>
          
          <div className="text-label mono text-text-muted mb-2">AVAILABLE SCENARIOS:</div>
          <div className="space-y-2">
            {SHADOW_SCENARIOS.map((scenario) => (
              <div
                key={scenario.id}
                className="p-3 bg-base-800 rounded border border-base-700 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-body-mono mono font-semibold text-text-primary">
                      {scenario.name}
                    </div>
                    <div className="text-xs font-mono text-text-muted mt-1">
                      {scenario.description}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStartShadow(scenario)}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                  <span>Failure Node: {scenario.failureNodeId}</span>
                  <span>•</span>
                  <span>Cascade Depth: {scenario.cascadeDepth}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-base-800 rounded border border-safety-amber/30">
            <div>
              <div className="text-body-mono mono font-semibold text-safety-amber">
                {selectedScenario?.name}
              </div>
              <div className="text-xs font-mono text-text-muted mt-1">
                Shadow simulation running in parallel
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStopShadow}
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          </div>

          {shadowGraph && (
            <div className="space-y-2">
              <div className="text-label mono text-text-muted">SHADOW SIMULATION STATUS:</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-base-800 rounded">
                  <div className="text-text-muted">Affected Nodes:</div>
                  <div className="text-safety-amber">
                    {shadowGraph.nodes.filter(n => n.health.status !== 'ok').length}
                  </div>
                </div>
                <div className="p-2 bg-base-800 rounded">
                  <div className="text-text-muted">Simulation Time:</div>
                  <div className="text-text-primary">T+{simulationTime}s</div>
                </div>
              </div>

              <div className="p-3 bg-base-800 rounded border border-safety-amber/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-safety-amber" />
                  <div className="text-label mono text-safety-amber">PREDICTED CASCADE</div>
                </div>
                <div className="space-y-1 text-xs font-mono text-text-secondary">
                  {shadowGraph.nodes
                    .filter(n => n.health.status !== 'ok')
                    .slice(0, 5)
                    .map(node => (
                      <div key={node.id} className="flex items-center justify-between">
                        <span>{node.label}</span>
                        <Badge status={node.health.status === 'warning' ? 'warning' : 'degraded'} className="text-[10px]">
                          {node.health.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>

              <div className="text-xs font-mono text-text-muted p-2 bg-base-800 rounded">
                💡 This shadow simulation runs independently of the live grid. 
                Use it to rehearse automated responses before a real crisis.
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}


