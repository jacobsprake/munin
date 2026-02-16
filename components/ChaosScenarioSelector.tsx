'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { AlertTriangle, Zap, Droplets, Shield } from 'lucide-react';

interface ChaosScenario {
  id: string;
  scenario_type: string;
  title: string;
  severity: number;
  impact_metrics: {
    lives_at_risk: number;
    gdp_at_risk_millions: number;
    time_to_recovery_hours: number;
    total_nodes_impacted: number;
    sectors_affected: string[];
  };
}

export default function ChaosScenarioSelector({
  onSelectScenario,
}: {
  onSelectScenario?: (scenario: ChaosScenario) => void;
}) {
  const [scenarios, setScenarios] = useState<ChaosScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchScenarios();
  }, [selectedType]);

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedType !== 'all') {
        params.set('type', selectedType);
      }
      const res = await fetch(`/api/chaos?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setScenarios(data.scenarios || []);
      }
    } catch (error) {
      console.error('Failed to fetch chaos scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const scenarioTypes = [
    { value: 'all', label: 'All Scenarios' },
    { value: 'flood', label: 'Floods' },
    { value: 'cyber', label: 'Cyber Attacks' },
    { value: 'earthquake', label: 'Earthquakes' },
    { value: 'substation', label: 'Power Failures' },
  ];

  const getScenarioIcon = (type: string) => {
    if (type.includes('flood')) return <Droplets className="w-4 h-4" />;
    if (type.includes('cyber') || type.includes('ransomware') || type.includes('ddos')) return <Shield className="w-4 h-4" />;
    if (type.includes('earthquake')) return <AlertTriangle className="w-4 h-4" />;
    if (type.includes('substation') || type.includes('power')) return <Zap className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const getSeverityBadge = (severity: number) => {
    if (severity >= 0.8) return 'warning';
    if (severity >= 0.5) return 'active';
    return 'ok';
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="text-label mono text-text-muted">CHAOS SCENARIOS</div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-base-800 border border-base-700 text-text-primary text-body px-3 py-1 rounded mono"
        >
          {scenarioTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="text-body-mono mono text-text-muted text-center py-4">Loading scenarios...</div>
      ) : scenarios.length === 0 ? (
        <div className="text-body-mono mono text-text-muted text-center py-4">
          No scenarios available. Run chaos simulator engine first.
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {scenarios.slice(0, 10).map((scenario) => (
            <div
              key={scenario.id}
              className="p-2 bg-base-800 rounded border border-base-700 hover:border-safety-cobalt cursor-pointer transition-colors"
              onClick={() => onSelectScenario?.(scenario)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {getScenarioIcon(scenario.scenario_type)}
                  <span className="text-body mono text-text-primary">{scenario.title}</span>
                </div>
                <Badge status={getSeverityBadge(scenario.severity)}>
                  {Math.round(scenario.severity * 100)}%
                </Badge>
              </div>
              <div className="text-xs mono text-text-secondary">
                {scenario.impact_metrics.total_nodes_impacted} nodes | {scenario.impact_metrics.sectors_affected.length} sectors
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
