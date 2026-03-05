'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

/**
 * Munin Operational Login Screen
 *
 * Government-grade systems do not have marketing landing pages.
 * Operators see a classification banner, system identification,
 * and a secure login prompt. ISA-101 compliant.
 */
export default function LoginPage() {
  const [operatorId, setOperatorId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, passphrase }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        setLoading(false);
        return;
      }

      // Store session token
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('munin_token', data.token);
        sessionStorage.setItem('munin_operator', JSON.stringify(data.operator));
        if (data.ministry) {
          sessionStorage.setItem('munin_ministry', JSON.stringify(data.ministry));
        }
      }

      router.push('/graph');
    } catch {
      setError('Connection failed. Verify air-gapped network status.');
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('munin_token', 'guest');
      sessionStorage.setItem('munin_operator', JSON.stringify({
        id: 'guest',
        operatorId: 'GUEST',
        role: 'viewer',
      }));
    }
    router.push('/graph');
  };

  return (
    <div className="min-h-screen bg-base-950 text-text-primary flex flex-col">
      {/* Classification Banner — Top (standard for government classified systems) */}
      <div className="h-7 bg-emerald-900/80 border-b border-emerald-700 flex items-center justify-center">
        <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-emerald-300 uppercase">
          OFFICIAL — Air-Gapped Sovereign Infrastructure
        </span>
      </div>

      {/* System Header */}
      <header className="border-b border-base-800 px-8 py-4 flex items-center justify-between bg-base-900/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-base-800 border border-base-700 flex items-center justify-center">
            <Shield className="w-5 h-5 text-safety-cobalt" />
          </div>
          <div>
            <div className="text-lg font-bold font-mono tracking-tight">MUNIN</div>
            <div className="text-[11px] font-mono text-text-muted tracking-wide uppercase">
              Sovereign Infrastructure Orchestration Platform
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-mono text-text-muted">DEPLOYMENT</div>
          <div className="text-sm font-mono text-text-secondary">ON-PREMISES / AIR-GAPPED</div>
        </div>
      </header>

      {/* Login Area */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* System Status */}
          <div className="mb-8 rounded border border-base-700 bg-base-900/60 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-safety-emerald animate-pulse" />
              <span className="text-label font-mono text-text-muted uppercase tracking-wider">System Status</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12px] font-mono">
              <div className="flex justify-between">
                <span className="text-text-muted">Engine</span>
                <span className="text-safety-emerald">OPERATIONAL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Network</span>
                <span className="text-safety-emerald">AIR-GAPPED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Audit Chain</span>
                <span className="text-safety-emerald">VERIFIED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Crypto</span>
                <span className="text-safety-cobalt">DILITHIUM-3</span>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="rounded border border-base-700 bg-base-900/60 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-4 h-4 text-text-muted" />
              <span className="text-label font-mono text-text-muted uppercase tracking-wider">Operator Authentication</span>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Operator ID
                </label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  placeholder="e.g. flood_officer_01"
                  aria-label="Operator ID"
                  className="w-full px-3 py-2.5 bg-base-950 border border-base-700 rounded text-sm font-mono text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-safety-cobalt focus:ring-1 focus:ring-safety-cobalt/20"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Passphrase
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter secure passphrase"
                  aria-label="Passphrase"
                  className="w-full px-3 py-2.5 bg-base-950 border border-base-700 rounded text-sm font-mono text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-safety-cobalt focus:ring-1 focus:ring-safety-cobalt/20"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-950/50 border border-red-800/50">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-[12px] font-mono text-red-400">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !operatorId || !passphrase}
                className="w-full py-2.5 rounded bg-safety-cobalt/20 border border-safety-cobalt text-safety-cobalt font-mono text-sm font-medium hover:bg-safety-cobalt/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-base-800">
              <button
                onClick={handleGuestAccess}
                className="w-full py-2 rounded border border-base-700 text-text-muted font-mono text-[12px] hover:bg-base-800 hover:text-text-secondary transition-colors"
              >
                ENTER AS OBSERVER (READ-ONLY)
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="mt-6 text-center text-[11px] font-mono text-text-muted/60 space-y-1">
            <div>Authorised personnel only. All access is logged and audited.</div>
            <div>Munin v0.9.3 · HMAC-SHA256 Sessions · Argon2id Authentication</div>
          </div>
        </div>
      </main>

      {/* Classification Banner — Bottom */}
      <div className="h-7 bg-emerald-900/80 border-t border-emerald-700 flex items-center justify-center">
        <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-emerald-300 uppercase">
          OFFICIAL — Air-Gapped Sovereign Infrastructure
        </span>
      </div>
    </div>
  );
}
