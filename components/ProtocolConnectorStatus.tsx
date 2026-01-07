/**
 * Protocol Connector Status Panel
 * Displays Universal OT-to-Graph Connector status
 * 
 * This component showcases Feature #3: Protocol Ancestry Library
 */
'use client';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Plug, CheckCircle2 } from 'lucide-react';

const SUPPORTED_PROTOCOLS = [
  { id: 'modbus', name: 'Modbus RTU/TCP', vendors: ['Siemens', 'Schneider', 'Honeywell', 'Allen-Bradley', 'ABB'] },
  { id: 'dnp3', name: 'DNP3', vendors: ['Schweitzer Engineering', 'GE', 'ABB', 'Siemens'] },
  { id: 'profibus', name: 'Profibus DP/PA', vendors: ['Siemens', 'ABB', 'Phoenix Contact'] },
  { id: 'bacnet', name: 'BACnet/IP', vendors: ['Johnson Controls', 'Honeywell', 'Siemens', 'Schneider'] },
  { id: 'opc_ua', name: 'OPC UA', vendors: ['Siemens', 'Rockwell', 'Schneider', 'ABB', 'Honeywell'] },
  { id: 'iec61850', name: 'IEC 61850', vendors: ['Siemens', 'ABB', 'GE', 'Schweitzer Engineering'] },
];

export default function ProtocolConnectorStatus() {
  return (
    <Card variant="packet" className="border-safety-cobalt/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded bg-safety-cobalt/20">
          <Plug className="w-5 h-5 text-safety-cobalt" />
        </div>
        <div className="flex-1">
          <div className="text-label mono text-text-muted mb-1">PROTOCOL CONNECTORS</div>
          <div className="text-panel-title mono font-semibold text-text-primary">
            Universal OT-to-Graph
          </div>
        </div>
        <Badge status="ok">ZERO FRICTION</Badge>
      </div>

      <div className="space-y-3">
        <div className="bg-base-800 p-3 rounded border border-base-700">
          <div className="text-xs text-text-muted font-mono mb-2">THE LIBRARY OF ANCESTRY</div>
          <div className="text-sm font-mono text-text-primary leading-relaxed">
            Pre-built drivers for every legacy industrial protocol. Drop a Munin Edge-Node 
            into your control room, and it 'inhales' your legacy assets in 24 hours. 
            No hardware replacement required.
          </div>
        </div>

        <div>
          <div className="text-xs text-text-muted font-mono mb-2">SUPPORTED PROTOCOLS</div>
          <div className="space-y-2">
            {SUPPORTED_PROTOCOLS.map((protocol) => (
              <div key={protocol.id} className="bg-base-800 p-3 rounded border border-base-700">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-safety-emerald" />
                  <span className="text-sm font-mono font-semibold text-text-primary">
                    {protocol.name}
                  </span>
                </div>
                <div className="text-xs font-mono text-text-secondary">
                  Vendors: {protocol.vendors.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-base-700">
          <div className="text-xs text-text-muted font-mono mb-1">DEPLOYMENT MODEL</div>
          <div className="text-sm font-mono text-text-primary">
            Edge Node → Protocol Translation → Unified Graph
          </div>
          <div className="text-xs font-mono text-safety-cobalt mt-1">
            Zero rip-and-replace. Works with 1980s hardware.
          </div>
        </div>
      </div>
    </Card>
  );
}

