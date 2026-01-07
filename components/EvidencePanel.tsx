'use client';

import { useState } from 'react';
import { Node, Edge, EvidenceWindow, GraphData } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import EvidencePackExportButton from './EvidencePackExportButton';

interface EvidencePanelProps {
  node?: Node | null;
  edge?: Edge | null;
  evidence?: EvidenceWindow[];
  graphData?: GraphData;
}

export default function EvidencePanel({ node, edge, evidence = [], graphData }: EvidencePanelProps) {
  const { setSelectedNode, setSelectedEdge } = useAppStore();
  const [activeTab, setActiveTab] = useState<'evidence' | 'protocol' | 'sensor'>('evidence');

  const relevantEvidence = edge
    ? evidence.filter((e) => e.edgeId === edge.id)
    : [];

  return (
    <div className="w-96 bg-base-900 border-l border-base-700 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-base-700">
        <h2 className="text-sm font-mono font-semibold text-text-primary uppercase mb-3">
          {node ? 'Node Detail' : edge ? 'Edge Evidence' : 'Sensor Health'}
        </h2>
        {edge && (
          <div className="flex gap-2 border-b border-base-700 -mb-4">
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-3 py-2 text-xs font-mono transition-colors ${
                activeTab === 'evidence'
                  ? 'text-safety-cobalt border-b-2 border-safety-cobalt'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              EVIDENCE
            </button>
            <button
              onClick={() => setActiveTab('protocol')}
              className={`px-3 py-2 text-xs font-mono transition-colors ${
                activeTab === 'protocol'
                  ? 'text-safety-cobalt border-b-2 border-safety-cobalt'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              PROTOCOL
            </button>
            <button
              onClick={() => setActiveTab('sensor')}
              className={`px-3 py-2 text-xs font-mono transition-colors ${
                activeTab === 'sensor'
                  ? 'text-safety-cobalt border-b-2 border-safety-cobalt'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              SENSOR
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {node && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-text-muted font-mono mb-1">LABEL</div>
              <div className="text-sm font-mono text-text-primary">{node.label}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted font-mono mb-1">SECTOR</div>
              <div className="text-sm font-mono text-text-primary uppercase">{node.sector}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted font-mono mb-1">KIND</div>
              <div className="text-sm font-mono text-text-primary">{node.kind}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted font-mono mb-1">REGION</div>
              <div className="text-sm font-mono text-text-primary">{node.region}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted font-mono mb-1">HEALTH</div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    node.health.status === 'ok'
                      ? 'bg-safety-emerald'
                      : node.health.status === 'degraded'
                      ? 'bg-safety-amber'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-sm font-mono text-text-primary">
                  {node.health.status.toUpperCase()} ({Math.round(node.health.score * 100)}%)
                </span>
              </div>
            </div>
            {node.observability && (
              <div>
                <div className="text-xs text-text-muted font-mono mb-1">OBSERVABILITY</div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-base-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-safety-cobalt"
                      style={{ width: `${node.observability.score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-text-primary">
                    {Math.round(node.observability.score * 100)}%
                  </span>
                </div>
                {node.observability.drivers.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {node.observability.drivers.map((driver, idx) => (
                      <div key={idx} className="text-xs text-text-muted font-mono">
                        • {driver}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {node.lat && node.lon && (
              <div>
                <div className="text-xs text-text-muted font-mono mb-1">COORDINATES</div>
                <div className="text-sm font-mono text-text-primary">
                  {node.lat.toFixed(4)}, {node.lon.toFixed(4)}
                </div>
              </div>
            )}
          </div>
        )}

        {edge && activeTab === 'evidence' && (
          <div className="space-y-3">
            {edge.isShadowLink && (
              <div className="p-2 bg-safety-amber/20 border border-safety-amber rounded">
                <div className="text-xs font-mono text-safety-amber mb-1">SHADOW LINK</div>
                <div className="text-xs font-mono text-text-secondary">
                  Inferred from telemetry correlation, not present in registry
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-text-muted font-mono mb-1">CONFIDENCE</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-base-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-safety-cobalt"
                    style={{ width: `${edge.confidenceScore * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-text-primary">
                  {Math.round(edge.confidenceScore * 100)}%
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted font-mono mb-1">INFERRED LAG</div>
              <div className="text-sm font-mono text-text-primary">{edge.inferredLagSeconds}s</div>
            </div>
            {edge.stabilityScore !== undefined && (
              <div>
                <div className="text-xs text-text-muted font-mono mb-1">STABILITY</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-base-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-safety-emerald"
                      style={{ width: `${edge.stabilityScore * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-text-primary">
                    {Math.round(edge.stabilityScore * 100)}%
                  </span>
                </div>
              </div>
            )}
            {edge.confounderNotes && edge.confounderNotes.length > 0 && (
              <div>
                <div className="text-xs text-text-muted font-mono mb-1">CONFOUNDER NOTES</div>
                <div className="space-y-1">
                  {edge.confounderNotes.map((note, idx) => (
                    <div key={idx} className="text-xs text-text-secondary font-mono">
                      • {note}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {graphData && (
              <div className="pt-2 border-t border-base-700">
                <EvidencePackExportButton
                  edge={edge}
                  evidenceWindows={evidence}
                  graphData={graphData}
                />
              </div>
            )}
            <div>
              <div className="text-xs text-text-muted font-mono mb-1">EVIDENCE WINDOWS</div>
              <div className="text-sm font-mono text-text-secondary">
                {relevantEvidence.length} supporting windows
              </div>
            </div>
            {relevantEvidence.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-base-700">
                {relevantEvidence.map((ev) => (
                  <div key={ev.id} className="p-2 bg-base-800 rounded border border-base-700">
                    <div className="text-xs text-text-muted font-mono mb-1">
                      {format(new Date(ev.startTs), 'MMM dd, HH:mm')} -{' '}
                      {format(new Date(ev.endTs), 'HH:mm')}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-text-muted">Correlation:</span>
                      <span className="text-xs font-mono text-text-primary">
                        {ev.correlation.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-text-muted">Robustness:</span>
                      <span className="text-xs font-mono text-text-primary">
                        {Math.round(ev.robustness * 100)}%
                      </span>
                    </div>
                    {ev.qualityContext && (
                      <div className="mt-2 pt-2 border-t border-base-700 space-y-1">
                        <div className="text-xs text-text-muted font-mono">Quality Context:</div>
                        <div className="text-xs font-mono text-text-secondary">
                          Missing: {(ev.qualityContext.missingness * 100).toFixed(1)}% | Noise: {ev.qualityContext.noiseScore.toFixed(2)} | Drift: {ev.qualityContext.driftScore.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {ev.supportType && (
                      <div className="mt-1">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                          ev.supportType === 'support'
                            ? 'bg-safety-emerald/20 text-safety-emerald'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {ev.supportType.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {ev.notes && (
                      <div className="text-xs text-text-muted mt-1">{ev.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {edge && activeTab === 'protocol' && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-text-muted font-mono mb-2">PROTOCOL DEEP-DIVE</div>
              <div className="p-3 bg-base-800 rounded border border-base-700">
                <div className="text-xs font-mono text-text-secondary mb-2">Sample Frame (Modbus RTU)</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="text-text-muted">Hex:</div>
                  <div className="text-text-primary break-all">01 03 00 00 00 02 C4 0B</div>
                  <div className="text-text-muted mt-2">Decoded:</div>
                  <div className="text-text-secondary">Address: 0x01</div>
                  <div className="text-text-secondary">Function: 0x03 (Read Holding Registers)</div>
                  <div className="text-text-secondary">Start: 0x0000</div>
                  <div className="text-text-secondary">Count: 0x0002</div>
                  <div className="text-text-secondary">CRC: 0xC40B</div>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted font-mono mb-2">DIRTY DATA SHOWCASE</div>
              <div className="space-y-2">
                <div className="p-2 bg-base-800 rounded border border-base-700">
                  <div className="text-xs font-mono text-text-secondary">Packet Loss: 2.3%</div>
                  <div className="text-xs font-mono text-text-muted">Last retry: 150ms</div>
                </div>
                <div className="p-2 bg-base-800 rounded border border-base-700">
                  <div className="text-xs font-mono text-text-secondary">Timestamp Skew: +45s</div>
                  <div className="text-xs font-mono text-text-muted">Clock drift detected</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {edge && activeTab === 'sensor' && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-text-muted font-mono mb-1">SOURCE SENSOR</div>
              <div className="p-2 bg-base-800 rounded border border-base-700">
                <div className="text-xs font-mono text-text-primary">{edge.source}</div>
                <div className="text-xs font-mono text-text-secondary mt-1">Status: OK</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted font-mono mb-1">TARGET SENSOR</div>
              <div className="p-2 bg-base-800 rounded border border-base-700">
                <div className="text-xs font-mono text-text-primary">{edge.target}</div>
                <div className="text-xs font-mono text-text-secondary mt-1">Status: OK</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

