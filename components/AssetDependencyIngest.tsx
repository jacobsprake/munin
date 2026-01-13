'use client';

import { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui/Card';
import { Radio, ChevronDown } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
}

export default function AssetDependencyIngest() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const logMessages = [
      'RECV: DNP3_PACKET FROM ADDR_0x01',
      'PARSING MODBUS_ADDR_4001',
      'MAPPED TO PUMP_STATION_7',
      'RECV: DNP3_PACKET FROM ADDR_0x02',
      'PARSING MODBUS_ADDR_4002',
      'MAPPED TO SUBSTATION_3',
      'RECV: PROFIBUS_FRAME FROM NODE_5',
      'PARSING IEC61850_ADDR_1',
      'MAPPED TO RESERVOIR_ALPHA',
    ];

    const interval = setInterval(() => {
      const randomMessage = logMessages[Math.floor(Math.random() * logMessages.length)];
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        message: randomMessage,
      };
      setLogs(prev => [...prev.slice(-19), newLog]);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className={`p-4 transition-all ${isExpanded ? 'h-64' : 'h-32'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-safety-cobalt" />
          <div className="text-label mono text-text-primary">
            ASSET-DEPENDENCY INGEST
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-base-800 rounded transition-colors"
        >
          <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div
        ref={logRef}
        className="h-full overflow-y-auto bg-base-950 rounded border border-base-700 p-2 font-mono text-xs space-y-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {logs.map((log) => (
          <div key={log.id} className="text-text-secondary">
            <span className="text-text-muted">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            {' '}
            <span className="text-safety-cobalt">{log.message}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}


