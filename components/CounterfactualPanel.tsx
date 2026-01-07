'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Brain, TrendingUp, AlertTriangle } from 'lucide-react';

interface CounterfactualResult {
  scenario_id: string;
  intervention: {
    node_id: string;
    action: string;
    value: number;
  };
  predictions: Array<{
    node_id: string;
    timestamp: string;
    predicted_value: number;
    confidence_band: {
      lower: number;
      upper: number;
    };
    time_to_impact: number;
  }>;
  cascade_path: string[];
  overall_confidence: number;
  time_horizon_minutes: number;
  confidence_level: number;
}

interface CounterfactualPanelProps {
  onRunSimulation?: (result: CounterfactualResult) => void;
}

export default function CounterfactualPanel({ onRunSimulation }: CounterfactualPanelProps) {
  const [nodeId, setNodeId] = useState('substation_01');
  const [action, setAction] = useState('shutdown');
  const [value, setValue] = useState('0');
  const [targetNodes, setTargetNodes] = useState('pump_01,pump_02,reservoir_01');
  const [timeHorizon, setTimeHorizon] = useState('120');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CounterfactualResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/counterfactual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intervention: {
            node_id: nodeId,
            action: action,
            value: parseFloat(value)
          },
          targetNodes: targetNodes.split(',').map(s => s.trim()),
          timeHorizonMinutes: parseInt(timeHorizon)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Simulation failed');
      }

      const data = await response.json();
      setResult(data.result);
      if (onRunSimulation) {
        onRunSimulation(data.result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-safety-cobalt" />
            <h3 className="text-sm font-mono font-semibold text-text-primary">
              Counterfactual Simulation
            </h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted font-mono mb-1">
                Intervention Node ID
              </label>
              <Input
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
                placeholder="substation_01"
                className="font-mono"
              />
            </div>
            
            <div>
              <label className="block text-xs text-text-muted font-mono mb-1">
                Action
              </label>
              <Input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="shutdown"
                className="font-mono"
              />
            </div>
            
            <div>
              <label className="block text-xs text-text-muted font-mono mb-1">
                Value
              </label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                className="font-mono"
              />
            </div>
            
            <div>
              <label className="block text-xs text-text-muted font-mono mb-1">
                Target Nodes (comma-separated)
              </label>
              <Input
                value={targetNodes}
                onChange={(e) => setTargetNodes(e.target.value)}
                placeholder="pump_01,pump_02"
                className="font-mono"
              />
            </div>
            
            <div>
              <label className="block text-xs text-text-muted font-mono mb-1">
                Time Horizon (minutes)
              </label>
              <Input
                type="number"
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(e.target.value)}
                placeholder="120"
                className="font-mono"
              />
            </div>
            
            <Button
              onClick={handleRun}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Running Simulation...' : 'Run Counterfactual'}
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-mono">{error}</span>
            </div>
          </div>
        </Card>
      )}

      {result && (
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-safety-emerald" />
              <h3 className="text-sm font-mono font-semibold text-text-primary">
                Simulation Results
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Overall Confidence:</span>
                <span className="text-text-primary">
                  {(result.overall_confidence * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Cascade Path Length:</span>
                <span className="text-text-primary">{result.cascade_path.length} nodes</span>
              </div>
              
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Predictions:</span>
                <span className="text-text-primary">{result.predictions.length}</span>
              </div>
              
              <div className="pt-3 border-t border-base-700">
                <div className="text-xs font-mono text-text-muted mb-2">Cascade Path:</div>
                <div className="flex flex-wrap gap-1">
                  {result.cascade_path.slice(0, 10).map((nodeId, idx) => (
                    <Badge key={idx} status="ok" className="text-[10px]">
                      {nodeId}
                    </Badge>
                  ))}
                  {result.cascade_path.length > 10 && (
                    <Badge status="ok" className="text-[10px]">
                      +{result.cascade_path.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
              
              {result.predictions.length > 0 && (
                <div className="pt-3 border-t border-base-700">
                  <div className="text-xs font-mono text-text-muted mb-2">Top Predictions:</div>
                  <div className="space-y-2">
                    {result.predictions.slice(0, 5).map((pred, idx) => (
                      <div key={idx} className="p-2 bg-base-800 rounded border border-base-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-text-primary">{pred.node_id}</span>
                          <span className="text-xs font-mono text-text-muted">
                            {Math.floor(pred.time_to_impact / 60)}m
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-text-secondary">
                            {pred.predicted_value.toFixed(2)}
                          </span>
                          <span className="text-xs font-mono text-text-muted">
                            [{pred.confidence_band.lower.toFixed(2)}, {pred.confidence_band.upper.toFixed(2)}]
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

