'use client';

import { useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import { useAppStore } from '@/lib/store';
import { Radio, Hexagon, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ProtocolPage() {
  const { sensorDegradationMode, setSensorDegradationMode } = useAppStore();
  const [selectedFrame, setSelectedFrame] = useState(0);

  const sampleFrames = [
    {
      timestamp: '2024-01-15T10:23:45Z',
      hex: '01 03 00 00 00 02 C4 0B',
      protocol: 'Modbus RTU',
      address: '0x01',
      functionCode: '0x03 (Read Holding Registers)',
      payload: '0x0000 0x0002',
      crc: '0xC40B',
      retries: 0,
    },
    {
      timestamp: '2024-01-15T10:23:46Z',
      hex: '01 03 04 13 88 00 00 85 CA',
      protocol: 'Modbus RTU',
      address: '0x01',
      functionCode: '0x03 (Response)',
      payload: '0x1388 0x0000',
      crc: '0x85CA',
      retries: 0,
    },
    {
      timestamp: '2024-01-15T10:23:50Z',
      hex: '01 03 00 00 00 02 C4 0B',
      protocol: 'Modbus RTU',
      address: '0x01',
      functionCode: '0x03 (Read Holding Registers)',
      payload: '0x0000 0x0002',
      crc: '0xC40B',
      retries: 1,
    },
  ];

  const degradationModes = [
    { id: 'none', label: 'None', description: 'Normal operation' },
    { id: 'packet_loss', label: 'Packet Loss', description: '2.3% packet loss' },
    { id: 'timestamp_skew', label: 'Timestamp Skew', description: '+45s clock drift' },
    { id: 'sensor_stuck', label: 'Sensor Stuck', description: 'Constant value' },
    { id: 'drift', label: 'Drift', description: 'Linear calibration drift' },
  ];

  const rightPanelContent = (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-xs font-mono text-text-muted mb-2 uppercase">Dirty Data Showcase</div>
        <div className="space-y-2">
          {degradationModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSensorDegradationMode(mode.id === 'none' ? null : mode.id)}
              className={`w-full p-2 rounded border text-left text-xs font-mono transition-colors ${
                sensorDegradationMode === mode.id
                  ? 'bg-safety-cobalt/20 border-safety-cobalt text-safety-cobalt'
                  : 'bg-base-800 border-base-700 text-text-secondary hover:bg-base-750'
              }`}
            >
              <div className="font-semibold">{mode.label}</div>
              <div className="text-text-muted">{mode.description}</div>
            </button>
          ))}
        </div>
      </div>
      {sensorDegradationMode && (
        <div className="p-3 bg-safety-amber/20 border border-safety-amber rounded">
          <div className="text-xs font-mono text-safety-amber mb-1">Impact</div>
          <div className="text-xs font-mono text-text-secondary">
            Sensor health status: DEGRADED
          </div>
          <div className="text-xs font-mono text-text-secondary">
            Edge confidence: Reduced by 15%
          </div>
          <div className="text-xs font-mono text-text-secondary">
            Simulation bands: Widened
          </div>
        </div>
      )}
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Degradation Controls"
    >
      <div className="flex-1 flex flex-col overflow-hidden bg-base-950">
        <div className="p-6 border-b border-base-700">
          <div className="flex items-center gap-3 mb-2">
            <Radio className="w-5 h-5 text-safety-cobalt" />
            <h1 className="text-display-title font-mono text-text-primary">Protocol Deep-Dive</h1>
          </div>
          <p className="text-body text-text-secondary">
            Raw industrial protocol frames, decoded fields, and dirty data reality
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl space-y-6">
            <div>
              <div className="text-label font-mono text-text-muted mb-3 uppercase">
                Sample Frames (Modbus RTU)
              </div>
              <div className="space-y-3">
                {sampleFrames.map((frame, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedFrame(idx)}
                    className={`p-4 rounded border cursor-pointer transition-colors ${
                      selectedFrame === idx
                        ? 'bg-base-800 border-safety-cobalt'
                        : 'bg-base-900 border-base-700 hover:border-base-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-mono text-text-muted">
                        {new Date(frame.timestamp).toLocaleTimeString()}
                      </div>
                      {frame.retries > 0 && (
                        <div className="flex items-center gap-1 text-xs font-mono text-safety-amber">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Retry {frame.retries}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-mono text-text-muted mb-1">Hex Stream</div>
                        <div className="text-sm font-mono text-text-primary bg-base-950 p-2 rounded">
                          {frame.hex}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-mono text-text-muted mb-1">Protocol</div>
                          <div className="text-xs font-mono text-text-primary">{frame.protocol}</div>
                        </div>
                        <div>
                          <div className="text-xs font-mono text-text-muted mb-1">Address</div>
                          <div className="text-xs font-mono text-text-primary">{frame.address}</div>
                        </div>
                        <div>
                          <div className="text-xs font-mono text-text-muted mb-1">Function Code</div>
                          <div className="text-xs font-mono text-text-primary">{frame.functionCode}</div>
                        </div>
                        <div>
                          <div className="text-xs font-mono text-text-muted mb-1">Payload</div>
                          <div className="text-xs font-mono text-text-primary">{frame.payload}</div>
                        </div>
                        <div>
                          <div className="text-xs font-mono text-text-muted mb-1">CRC</div>
                          <div className="text-xs font-mono text-text-primary">{frame.crc}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-base-700">
              <div className="text-label font-mono text-text-muted mb-3 uppercase">
                Data Quality Metrics
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-base-900 rounded border border-base-700">
                  <div className="text-xs font-mono text-text-muted mb-1">Packet Loss</div>
                  <div className="text-lg font-mono text-text-primary">2.3%</div>
                </div>
                <div className="p-3 bg-base-900 rounded border border-base-700">
                  <div className="text-xs font-mono text-text-muted mb-1">Timestamp Skew</div>
                  <div className="text-lg font-mono text-text-primary">+45s</div>
                </div>
                <div className="p-3 bg-base-900 rounded border border-base-700">
                  <div className="text-xs font-mono text-text-muted mb-1">Retry Rate</div>
                  <div className="text-lg font-mono text-text-primary">1.2%</div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-base-700">
              <div className="text-label font-mono text-text-muted mb-3 uppercase">
                Sensor Health Impact
              </div>
              <div className="p-4 bg-base-900 rounded border border-base-700">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-text-secondary">Source Sensor</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-safety-emerald" />
                      <span className="text-sm font-mono text-safety-emerald">OK</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-text-secondary">Target Sensor</span>
                    <div className="flex items-center gap-2">
                      {sensorDegradationMode ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-safety-amber" />
                          <span className="text-sm font-mono text-safety-amber">DEGRADED</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-safety-emerald" />
                          <span className="text-sm font-mono text-safety-emerald">OK</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-base-700">
                    <div className="text-xs font-mono text-text-muted mb-1">Edge Confidence</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-base-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-safety-cobalt transition-all"
                          style={{
                            width: `${(sensorDegradationMode ? 0.75 : 0.92) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-mono text-text-primary">
                        {Math.round((sensorDegradationMode ? 0.75 : 0.92) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CommandShell>
  );
}
