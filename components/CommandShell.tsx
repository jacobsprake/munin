'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';

export default function CommandShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { region, mode, setRegion, setMode } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { href: '/graph', label: 'Graph', icon: '◉' },
    { href: '/simulation', label: 'Simulation', icon: '▶' },
    { href: '/handshakes', label: 'Handshake Log', icon: '⚡' },
  ];

  return (
    <div className="flex flex-col h-screen bg-charcoal-200 text-foreground overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-charcoal-100 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-mono font-semibold text-foreground">
            SOVEREIGN ORCHESTRATION PROTOTYPE
          </h1>
          <div className="h-4 w-px bg-slate-700" />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-charcoal-50 border border-slate-700 text-foreground px-3 py-1 rounded text-sm font-mono focus:outline-none focus:border-cobalt-500"
          >
            <option value="all">ALL REGIONS</option>
            <option value="north">NORTH</option>
            <option value="south">SOUTH</option>
            <option value="east">EAST</option>
            <option value="west">WEST</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">MODE:</span>
            <button
              onClick={() => setMode(mode === 'live' ? 'replay' : 'live')}
              className={`px-3 py-1 rounded text-xs font-mono border ${
                mode === 'live'
                  ? 'bg-emerald-900/30 border-emerald-700 text-emerald-400'
                  : 'bg-amber-900/30 border-amber-700 text-amber-400'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-sm font-mono text-slate-400">
            {format(currentTime, 'HH:mm:ss')}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Rail */}
        <div className="w-48 bg-charcoal-100 border-r border-slate-800 flex flex-col">
          <nav className="flex-1 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 mx-2 rounded transition-colors ${
                    isActive
                      ? 'bg-cobalt-900/30 border border-cobalt-700 text-cobalt-400 glow-cobalt'
                      : 'text-slate-400 hover:text-foreground hover:bg-charcoal-50'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-mono text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main Stage */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

