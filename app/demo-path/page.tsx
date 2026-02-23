'use client';

import Link from 'next/link';
import CommandShell from '@/components/CommandShell';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowRight, Zap, Clock, Network, FileText, Droplets, Quote } from 'lucide-react';

const SECTIONS = [
  {
    id: 'thesis',
    title: 'The thesis',
    body: 'Munin is the first Sovereign Orchestration Layer for zero-latency crisis response. It solves the Liability Paralysis of the state by bridging operational systems (SCADA) and legal authority (law). Infrastructure failure is not a data problem—we have enough sensors. It is an authority problem. Munin pre-validates playbooks through simulation and generates cryptographic execution packets that carry legal authority. Humans still decide; they just decide in 20–30 minutes instead of 2–6 hours.',
  },
  {
    id: 'problem',
    title: 'The problem: 2–6 hours',
    body: 'Traditional coordination: incident detection (5–15 min) + cross-agency phone calls (30–60 min) + legal review (30–90 min) + multi-ministry approval (60–120 min) + command execution (5–10 min) = 2–6 hours total. The cascade has already consumed entire sectors before response can be authorised.',
  },
  {
    id: 'solution',
    title: 'With Munin: 20–30 minutes',
    body: 'Pre-simulated playbooks + pre-validated sign-off. Incident detection (same) + playbook retrieval (<100ms) + handshake generation (<100ms) + biometric authorisation (3 ministries × ~5 min) + execution (same). Latency reduction: 85–90% faster.',
  },
  {
    id: 'shadow',
    title: 'Shadow Links: cross-sector dependencies',
    body: 'Cross-sector dependencies are not documented—they exist only in physics. Munin infers them from time-series correlation (temporal correlation + lag). So we discover that e.g. Substation_A (power) and Pump_Station_7 (water) are linked before any manual map. That enables cascade prediction and proactive response.',
  },
  {
    id: 'evidence',
    title: 'Evidence',
    body: 'Real disasters where coordination/authorisation was the primary bottleneck: Hurricane Katrina (FEMA/state/Red Cross chaos, 37-day meal delay), Fukushima (7+ hour venting delay, uncoordinated evacuation), UK floods (3–5 hour cross-government coordination). Munin demos replay these with pre-validated playbooks and show the counterfactual.',
  },
];

export default function DemoPathPage() {
  return (
    <CommandShell>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold font-mono mb-2">5-minute demo path</h1>
            <p className="text-text-secondary text-sm">
              For reviewers: follow this flow to see the thesis, the problem, and the live demo.
            </p>
          </div>

          {SECTIONS.map((section, i) => (
            <section key={section.id} id={section.id} className="mb-10">
              <Card className="p-6">
                <h2 className="text-lg font-semibold font-mono mb-3 flex items-center gap-2">
                  {i === 0 && <FileText className="w-5 h-5 text-safety-cobalt" />}
                  {i === 1 && <Clock className="w-5 h-5 text-safety-amber" />}
                  {i === 2 && <Zap className="w-5 h-5 text-safety-emerald" />}
                  {i === 3 && <Network className="w-5 h-5 text-safety-cobalt" />}
                  {i === 4 && <Quote className="w-5 h-5 text-safety-amber" />}
                  {section.title}
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed">{section.body}</p>
              </Card>
            </section>
          ))}

          <div className="flex flex-wrap gap-4">
            <Link href="/graph">
              <Button>Open dependency graph (Shadow Links)</Button>
            </Link>
            <Link href="/demos">
              <Button variant="outline">Disaster demos (Katrina, Fukushima, UK)</Button>
            </Link>
            <Link href="/carlisle-dashboard">
              <Button variant="outline">Carlisle flood dashboard</Button>
            </Link>
            <Link href="/simulation">
              <Button variant="outline">Simulation & handshakes</Button>
            </Link>
          </div>

          <p className="mt-8 text-xs text-text-muted">
            Try Shadow Link detection: <code className="bg-base-800 px-1 rounded">cd engine && python3 detect_shadow_link.py</code> (after generating data with <code className="bg-base-800 px-1 rounded">npm run engine</code> or <code className="bg-base-800 px-1 rounded">python3 carlisle_demo.py</code>).
          </p>
        </div>
      </div>
    </CommandShell>
  );
}
