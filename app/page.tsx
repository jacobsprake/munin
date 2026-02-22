'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Clock, Shield, FileText, Droplets, Route } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-base-950 text-text-primary flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-base-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold font-mono tracking-tight">MUNIN</span>
          <span className="text-sm text-text-muted">Sovereign Infrastructure Orchestration</span>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/demos" className="text-text-secondary hover:text-text-primary transition-colors">
            Demos
          </Link>
          <Link href="/demo-path" className="text-text-secondary hover:text-text-primary transition-colors">
            5-min demo
          </Link>
          <Link href="/docs" className="text-text-secondary hover:text-text-primary transition-colors">
            API Docs
          </Link>
          <Link href="/graph" className="text-text-secondary hover:text-text-primary transition-colors">
            Platform
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold font-mono tracking-tight mb-4">
          Decision support for zero-latency crisis response
        </h1>
        <p className="text-lg text-text-secondary mb-8 max-w-2xl">
          Munin turns <strong className="text-text-primary">2–6 hours</strong> of ad-hoc coordination into{' '}
          <strong className="text-text-primary">20–30 minutes</strong> of reviewing pre-packaged options. Humans always authorise; Munin does the prep work in advance.
        </p>

        {/* The problem */}
        <div className="w-full text-left rounded-xl border border-base-700 bg-base-900/50 p-6 mb-10">
          <h2 className="text-sm font-mono text-text-muted uppercase tracking-wider mb-3">The problem</h2>
          <p className="text-text-secondary text-sm mb-4">
            Cascades propagate in <strong className="text-text-primary">minutes</strong>. Authorisation takes <strong className="text-text-primary">hours</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-safety-amber shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-text-primary">Traditional</div>
                <div className="text-text-muted">Incident detection → cross-agency calls → legal review → multi-ministry sign-off → execution. <strong>Total: 2–6 hours.</strong></div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-safety-emerald shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-text-primary">With Munin</div>
                <div className="text-text-muted">Pre-simulated playbooks + pre-validated authority. Operators review and sign. <strong>Total: 20–30 minutes.</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/demo-path"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-safety-cobalt text-white font-medium hover:opacity-90 transition-opacity"
          >
            Start 5-minute demo
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/graph"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-base-600 text-text-primary font-medium hover:bg-base-800 transition-colors"
          >
            Enter platform
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-sm text-text-muted">
          <Link href="/carlisle-dashboard" className="flex items-center gap-2 hover:text-text-primary transition-colors">
            <Droplets className="w-4 h-4" />
            Carlisle flood demo
          </Link>
          <Link href="/demos" className="flex items-center gap-2 hover:text-text-primary transition-colors">
            <Route className="w-4 h-4" />
            Disaster demos (Katrina, Fukushima, UK)
          </Link>
          <Link href="/demo-path" className="flex items-center gap-2 hover:text-text-primary transition-colors">
            <FileText className="w-4 h-4" />
            Thesis & evidence
          </Link>
        </div>
      </main>

      <footer className="border-t border-base-800 px-6 py-4 text-center text-sm text-text-muted">
        Munin does not execute autonomously. It recommends; humans authorise. — Shadow Links · Byzantine multi-sig · Pre-validated playbooks
      </footer>
    </div>
  );
}
