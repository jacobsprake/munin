'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Mirror, Play, FileText, AlertTriangle } from 'lucide-react';

interface SimulationResult {
  simulationId: string;
  scenario: {
    type: string;
    name: string;
    failureNodes: string[];
  };
  status: string;
  survivalProbability?: number;
  affectedNodes?: string[];
  recoveryTimeHours?: number;
  recommendedPlaybooks?: string[];
}

interface AuditReport {
  summary: {
    totalSimulations: number;
    averageSurvivalProbability: number;
    averageRecoveryTimeHours: number;
    scenarioCoverage: string[];
  };
  recommendations: string[];
}

export default function SovereignDigitalTwinPanel() {
  const [simulations, setSimulations] = useState<SimulationResult[]>([]);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [scenarioData, setScenarioData] = useState({
    type: 'flood',
    name: '',
    description: '',
    failureNodes: '',
    cascadeDepth: 3,
    severity: 0.9
  });

  useEffect(() => {
    loadDigitalTwinStatus();
  }, []);

  const loadDigitalTwinStatus = async () => {
    try {
      const response = await fetch('/api/sovereign/digital-twin?action=status');
      const data = await response.json();
      
      if (data.status === 'ok') {
        // Load simulations and audit report
        loadAuditReport();
      }
    } catch (error) {
      console.error('Failed to load digital twin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditReport = async () => {
    try {
      const response = await fetch('/api/sovereign/digital-twin?action=audit_report');
      const data = await response.json();
      
      if (data.status === 'ok') {
        setAuditReport(data.report);
      }
    } catch (error) {
      console.error('Failed to load audit report:', error);
    }
  };

  const handleRunSimulation = async () => {
    try {
      const response = await fetch('/api/sovereign/digital-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_simulation',
          scenarioType: scenarioData.type,
          name: scenarioData.name,
          description: scenarioData.description,
          failureNodes: scenarioData.failureNodes.split(',').map(s => s.trim()),
          cascadeDepth: scenarioData.cascadeDepth,
          severity: scenarioData.severity
        })
      });

      const result = await response.json();
      
      if (result.status === 'ok') {
        setShowScenarioModal(false);
        loadDigitalTwinStatus();
      }
    } catch (error) {
      console.error('Failed to run simulation:', error);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-text-muted">Loading digital twin status...</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Mirror className="w-5 h-5 text-safety-amber" />
        <h3 className="text-panel-title mono font-semibold text-text-primary">
          MUNIN-MIRROR (DIGITAL TWIN)
        </h3>
      </div>

      <div className="text-body mono text-text-secondary">
        High-fidelity, physics-based simulation of the nation's infrastructure.
        Run stress tests (500-year floods, cyber-attacks) and rehearse
        Authoritative Handshakes in a sandbox. This is the "National Resilience Audit."
      </div>

      {auditReport && (
        <div className="p-4 bg-base-800 rounded border border-base-700 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-safety-amber" />
            <div className="text-label mono text-safety-amber">RESILIENCE AUDIT REPORT</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <div className="text-text-muted">Total Simulations:</div>
              <div className="text-text-primary">{auditReport.summary.totalSimulations}</div>
            </div>
            <div>
              <div className="text-text-muted">Avg Survival:</div>
              <div className="text-safety-emerald">
                {(auditReport.summary.averageSurvivalProbability * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-text-muted">Avg Recovery:</div>
              <div className="text-text-primary">
                {auditReport.summary.averageRecoveryTimeHours.toFixed(1)}h
              </div>
            </div>
            <div>
              <div className="text-text-muted">Scenarios:</div>
              <div className="text-text-primary">
                {auditReport.summary.scenarioCoverage.length}
              </div>
            </div>
          </div>
          {auditReport.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-base-700">
              <div className="text-xs font-mono text-text-muted mb-2">RECOMMENDATIONS:</div>
              {auditReport.recommendations.map((rec, idx) => (
                <div key={idx} className="text-xs font-mono text-text-secondary mb-1">
                  • {rec}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => setShowScenarioModal(true)}
        >
          <Play className="w-4 h-4 mr-1" />
          Run Stress Test
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            const response = await fetch('/api/sovereign/digital-twin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'generate_audit_report' })
            });
            if (response.ok) {
              loadAuditReport();
            }
          }}
        >
          <FileText className="w-4 h-4 mr-1" />
          Generate Audit Report
        </Button>
      </div>

      {showScenarioModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-base-900 border border-base-700 rounded p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-mono font-semibold text-text-primary mb-4 uppercase">
              CREATE STRESS TEST SCENARIO
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  SCENARIO TYPE
                </label>
                <select
                  value={scenarioData.type}
                  onChange={(e) => setScenarioData({ ...scenarioData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                >
                  <option value="flood">500-Year Flood</option>
                  <option value="cyber_attack">Cyber Attack (50% Grid)</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="power_blackout">Power Blackout</option>
                  <option value="drought">Drought</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  NAME
                </label>
                <input
                  type="text"
                  value={scenarioData.name}
                  onChange={(e) => setScenarioData({ ...scenarioData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  FAILURE NODES (comma-separated)
                </label>
                <input
                  type="text"
                  value={scenarioData.failureNodes}
                  onChange={(e) => setScenarioData({ ...scenarioData, failureNodes: e.target.value })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                  placeholder="node1, node2, node3"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  CASCADE DEPTH
                </label>
                <input
                  type="number"
                  value={scenarioData.cascadeDepth}
                  onChange={(e) => setScenarioData({ ...scenarioData, cascadeDepth: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  SEVERITY (0.0 - 1.0)
                </label>
                <input
                  type="number"
                  value={scenarioData.severity}
                  onChange={(e) => setScenarioData({ ...scenarioData, severity: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                  min="0"
                  max="1"
                  step="0.1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowScenarioModal(false)}
                  className="flex-1"
                >
                  CANCEL
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleRunSimulation}
                  className="flex-1"
                >
                  RUN SIMULATION
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 bg-base-800 rounded border border-safety-amber/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-safety-amber" />
          <div className="text-label mono text-safety-amber">NATIONAL RESILIENCE AUDIT</div>
        </div>
        <div className="text-xs font-mono text-text-secondary">
          Every year, the government pays you to prove that they *could* survive
          a catastrophe. This is Simulation-as-a-Service for sovereign resilience.
        </div>
      </div>
    </Card>
  );
}


