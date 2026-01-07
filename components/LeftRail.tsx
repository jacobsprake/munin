'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Network, Play, Handshake, Radio, Shield, Map } from 'lucide-react';

const navItems = [
  { href: '/graph', label: 'Dependency Graph', icon: Network },
  { href: '/simulation', label: 'Simulation', icon: Play },
  { href: '/handshakes', label: 'Handshakes', icon: Handshake },
  { href: '/protocol', label: 'Protocol Deep-Dive', icon: Radio },
  { href: '/sovereign', label: 'Sovereign Runtime', icon: Shield },
  { href: '/expansion', label: 'Expansion Map', icon: Map },
];

export default function LeftRail() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-base-900 border-r border-base-700 flex flex-col">
      <div className="p-4 border-b border-base-700">
        <h1 className="text-display-title font-mono text-text-primary">MUNIN</h1>
        <p className="text-label text-text-muted mt-1">Sovereign Orchestration</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded text-body-mono transition-colors ${
                isActive
                  ? 'bg-safety-cobalt/20 text-safety-cobalt border-l-2 border-safety-cobalt'
                  : 'text-text-secondary hover:bg-base-800 hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
