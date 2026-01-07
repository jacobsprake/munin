'use client';

import { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Shield, CheckCircle2, FileText, Terminal } from 'lucide-react';

interface HandshakeResult {
  hash: string;
  authorized: boolean;
  timestamp: string;
  legalBasis: string;
  pqcSignature: string;
}

export default function AuthoritativeHandshakePanel() {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<HandshakeResult | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const authorizeHandshake = async () => {
    setIsAuthorizing(true);
    setTerminalLines([]);
    
    // Simulate terminal scrolling through key exchange
    const addTerminalLine = (line: string, delay: number = 200) => {
      return new Promise(resolve => {
        setTimeout(() => {
          setTerminalLines(prev => [...prev, line]);
          resolve(null);
        }, delay);
      });
    };

    await addTerminalLine('> INITIATING POST-QUANTUM KEY EXCHANGE...', 100);
    await addTerminalLine('> ALGORITHM: CRYSTALS-Dilithium (NIST-PQC)', 200);
    await addTerminalLine('> GENERATING KEY PAIR...', 300);
    await addTerminalLine('> PUBLIC KEY: 0x7a3f9b2c4d5e6f1a8b9c0d1e2f3a4b5c', 400);
    await addTerminalLine('> SIGNING PACKET WITH PRIVATE KEY...', 500);
    
    // Generate full 64-character hex signature
    const timestamp = new Date().toISOString();
    const handshakeData = `AUTHORIZE_HANDSHAKE:${timestamp}:EMERGENCY_ACT_SEC_4`;
    
    let pqcSignature = '';
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(handshakeData + Math.random()));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      pqcSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64);
    } catch (error) {
      // Fallback
      pqcSignature = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
    
    await addTerminalLine(`> SIGNATURE: ${pqcSignature}`, 600);
    await addTerminalLine('> VERIFYING SIGNATURE...', 700);
    await addTerminalLine('> ✓ SIGNATURE VERIFIED', 800);
    await addTerminalLine('> HANDSHAKE COMPLETE', 900);
    
    setHandshakeResult({
      hash: `SHA-256: ${pqcSignature.substring(0, 16)}...`,
      authorized: true,
      timestamp,
      legalBasis: 'EMERGENCY ACT SEC. 4',
      pqcSignature
    });
    
    setIsAuthorizing(false);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-safety-cobalt" />
        <div>
          <div className="text-label mono text-text-primary">
            AUTHORITATIVE HANDSHAKE
          </div>
          <div className="text-body-mono mono text-text-muted">
            Post-Quantum Cryptographic Authorization
          </div>
        </div>
      </div>

      {/* PQC Encryption Status Bar */}
      <div className="px-3 py-2 bg-base-800 rounded border border-base-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-safety-emerald animate-pulse" />
          <span className="text-label mono text-text-primary">ENCRYPTION:</span>
        </div>
        <span className="text-body-mono mono text-safety-cobalt">CRYSTALS-Dilithium (NIST-PQC)</span>
      </div>

      {/* Terminal Scrolling Display */}
      {(isAuthorizing || handshakeResult) && (
        <div className="bg-base-950 border border-base-700 rounded p-3 font-mono text-xs">
          <div className="flex items-center gap-2 mb-2 text-text-muted">
            <Terminal className="w-3 h-3" />
            <span>KEY EXCHANGE TERMINAL</span>
          </div>
          <div 
            ref={terminalRef}
            className="h-32 overflow-y-auto text-text-secondary space-y-1"
            style={{ scrollbarWidth: 'thin' }}
          >
            {terminalLines.map((line, idx) => (
              <div key={idx} className="text-body-mono mono">
                {line}
              </div>
            ))}
            {isAuthorizing && (
              <div className="text-safety-amber animate-pulse">_</div>
            )}
          </div>
        </div>
      )}

      {/* Playbook Display */}
      <div className="p-4 bg-base-800 rounded border border-base-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-label mono text-text-primary">
            PLAYBOOK: Flood Event Response
          </div>
          <Badge status="ok">ACTIVE</Badge>
        </div>
        
        <div className="space-y-2 text-body-mono mono text-text-secondary">
          <div>
            <span className="text-text-muted">Action:</span>{' '}
            <span className="text-text-primary">Isolate Pump Station 4 from grid</span>
          </div>
          <div>
            <span className="text-text-muted">Trigger:</span>{' '}
            <span className="text-text-primary">Water level exceeds 95% capacity</span>
          </div>
          <div>
            <span className="text-text-muted">Evidence:</span>{' '}
            <span className="text-text-primary">3 correlation windows, 94% confidence</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-base-700">
          <FileText className="w-4 h-4 text-text-muted" />
          <span className="text-label mono text-text-muted">LEGAL BASIS</span>
          <Badge status="ok" className="ml-auto">
            STATUTORY COMPLIANCE: EMERGENCY ACT SEC. 4
          </Badge>
        </div>
      </div>

      {/* Authorization Button */}
      <Button
        onClick={authorizeHandshake}
        disabled={isAuthorizing || handshakeResult?.authorized}
        variant="primary"
        className="w-full flex items-center justify-center gap-2 py-3"
      >
        {isAuthorizing ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Authorizing...
          </>
        ) : handshakeResult?.authorized ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            AUTHORIZED
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            AUTHORIZE HANDSHAKE
          </>
        )}
      </Button>

      {/* Note about Byzantine Multi-Sig */}
      <div className="p-3 bg-base-800 rounded border border-base-700">
        <div className="text-body-mono mono text-text-secondary text-xs">
          For high-consequence commands, Byzantine Multi-Sig quorum (2/3 ministries) required.
        </div>
      </div>

      {/* Handshake Result with 64-char signature */}
      {handshakeResult && (
        <div className="p-4 bg-safety-emerald/10 border border-safety-emerald/30 rounded space-y-2">
          <div className="flex items-center gap-2 text-safety-emerald text-label mono">
            <CheckCircle2 className="w-4 h-4" />
            HANDSHAKE AUTHORIZED
          </div>
          
          <div className="space-y-2 text-body-mono mono">
            <div>
              <span className="text-text-muted">Handshake Signature:</span>
              <div className="mt-1 p-2 bg-base-950 rounded border border-base-700 font-mono text-xs text-text-primary break-all">
                {handshakeResult.pqcSignature}
              </div>
            </div>
            <div>
              <span className="text-text-muted">Timestamp:</span>{' '}
              <span className="text-text-primary">{new Date(handshakeResult.timestamp).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-text-muted">Legal Basis:</span>{' '}
              <span className="text-safety-cobalt">{handshakeResult.legalBasis}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-safety-emerald/30">
            <div className="text-body mono text-text-secondary">
              Command packet generated and cryptographically signed. Immutable audit trail created.
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

