'use client';

import CommandShell from '@/components/CommandShell';
import { Map, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { ExpansionStep } from '@/lib/types';

const expansionSteps: ExpansionStep[] = [
  {
    step: 1,
    sector: 'water',
    dataSources: [
      'SCADA historian (reservoir levels)',
      'Flow sensors (pump stations)',
      'Pressure sensors (distribution)',
    ],
    inferenceCoverageTarget: 85,
    expectedShadowLinkTypes: [
      'Reservoir → Pump dependency',
      'Pump → Distribution pressure',
      'Cross-region flow dependencies',
    ],
    regulatoryFrameworks: [
      '2026 Flood Resilience Act',
      '2026 Drought Resilience Act',
      'Water Infrastructure Standards',
    ],
    approvalFlows: [
      'Water Operations Director',
      'Regional Coordinator',
      'Emergency Response Team',
    ],
  },
  {
    step: 2,
    sector: 'power',
    dataSources: [
      'Grid frequency telemetry',
      'Substation load data',
      'Transformer health sensors',
    ],
    inferenceCoverageTarget: 80,
    expectedShadowLinkTypes: [
      'Substation → Pump power dependency',
      'Grid frequency → Water pump operation',
      'Transformer → Distribution cascade',
    ],
    regulatoryFrameworks: [
      'NERC Reliability Standards',
      'EOP-011 (Emergency Operations)',
      'Grid Stability Protocols',
    ],
    approvalFlows: [
      'Grid Operations Manager',
      'NERC Compliance Officer',
      'Cross-Sector Coordinator',
    ],
  },
  {
    step: 3,
    sector: 'telecom',
    dataSources: [
      'Cell tower uptime metrics',
      'Backhaul link status',
      'Substation communication health',
    ],
    inferenceCoverageTarget: 75,
    expectedShadowLinkTypes: [
      'Substation → Tower power dependency',
      'Tower → Grid monitoring dependency',
      'Communication → Control system dependency',
    ],
    regulatoryFrameworks: [
      'FCC Emergency Communications',
      'Critical Infrastructure Protection',
      'Telecom Resilience Standards',
    ],
    approvalFlows: [
      'Telecom Operations Director',
      'Critical Infrastructure Coordinator',
      'National Security Liaison',
    ],
  },
];

export default function ExpansionPage() {
  return (
    <CommandShell>
      <div className="flex-1 flex flex-col overflow-hidden bg-base-950">
        <div className="p-6 border-b border-base-700">
          <div className="flex items-center gap-3 mb-2">
            <Map className="w-5 h-5 text-safety-cobalt" />
            <h1 className="text-display-title font-mono text-text-primary">Expansion Map</h1>
          </div>
          <p className="text-body text-text-secondary">
            Three-step expansion roadmap: Water → Power → Telecom
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl space-y-6">
            {expansionSteps.map((step) => (
              <div
                key={step.step}
                className="p-6 bg-base-900 rounded border border-base-700"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-safety-cobalt/20 border border-safety-cobalt flex items-center justify-center">
                    <span className="text-sm font-mono text-safety-cobalt font-semibold">
                      {step.step}
                    </span>
                  </div>
                  <h2 className="text-panel-title font-mono text-text-primary uppercase">
                    {step.sector}
                  </h2>
                  {step.step === 1 && (
                    <span className="px-2 py-1 bg-safety-emerald/20 border border-safety-emerald rounded text-xs font-mono text-safety-emerald">
                      ACTIVE
                    </span>
                  )}
                  {step.step > 1 && (
                    <span className="px-2 py-1 bg-base-800 border border-base-700 rounded text-xs font-mono text-text-muted">
                      PLANNED
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-label font-mono text-text-muted mb-2 uppercase">
                      Data Sources
                    </div>
                    <div className="space-y-2">
                      {step.dataSources.map((source, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-body-mono font-mono text-text-secondary"
                        >
                          <CheckCircle className="w-3 h-3 text-safety-emerald mt-0.5 flex-shrink-0" />
                          <span>{source}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-label font-mono text-text-muted mb-2 uppercase">
                      Targets
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-mono text-text-muted mb-1">
                          Inference Coverage
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-base-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-safety-cobalt"
                              style={{ width: `${step.inferenceCoverageTarget}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono text-text-primary">
                            {step.inferenceCoverageTarget}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-base-700">
                  <div className="text-label font-mono text-text-muted mb-2 uppercase">
                    Expected Shadow Link Types
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {step.expectedShadowLinkTypes.map((type, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-base-800 border border-base-700 rounded text-xs font-mono text-text-secondary"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-base-700 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-label font-mono text-text-muted mb-2 uppercase">
                      Regulatory Frameworks
                    </div>
                    <div className="space-y-1">
                      {step.regulatoryFrameworks.map((framework, idx) => (
                        <div
                          key={idx}
                          className="text-body-mono font-mono text-text-secondary"
                        >
                          • {framework}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-label font-mono text-text-muted mb-2 uppercase">
                      Approval Flows
                    </div>
                    <div className="space-y-1">
                      {step.approvalFlows.map((flow, idx) => (
                        <div
                          key={idx}
                          className="text-body-mono font-mono text-text-secondary"
                        >
                          • {flow}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CommandShell>
  );
}
