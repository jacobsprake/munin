'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AlertTriangle, Droplets, Flame, CloudRain } from 'lucide-react';

const DEMOS = [
  {
    id: 'carlisle',
    slug: 'carlisle-dashboard',
    name: 'Storm Desmond (Carlisle)',
    date: 'Dec 2015',
    description: 'Primary evidence demo: EA flood data, flood gate coordination playbook, 2–6 h → <2 min.',
    icon: Droplets,
    href: '/carlisle-dashboard',
    primary: true,
  },
  {
    id: 'katrina_2005',
    slug: 'katrina-2005',
    name: 'Hurricane Katrina',
    date: 'Aug 2005',
    description: 'Levee breaches, evacuation and supply coordination failure; FEMA/Red Cross 37-day meal delay.',
    icon: CloudRain,
    href: '/demos/katrina-2005',
    primary: false,
  },
  {
    id: 'fukushima_2011',
    slug: 'fukushima-2011',
    name: 'Fukushima Daiichi',
    date: 'Mar 2011',
    description: 'Station blackout, 7+ hour venting delay, uncoordinated evacuation; pre-validated playbooks counterfactual.',
    icon: Flame,
    href: '/demos/fukushima-2011',
    primary: false,
  },
  {
    id: 'uk_floods_2007',
    slug: 'uk-2007',
    name: 'UK Summer Floods 2007',
    date: 'Jul 2007',
    description: 'Cross-government coordination 3–5 hours; Pitt Review; same thesis as Carlisle.',
    icon: Droplets,
    href: '/demos/uk-2007',
    primary: false,
  },
];

export default function DemosIndexPage() {
  return (
    <div className="min-h-screen bg-base-900 text-text-primary p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Cascading failure demos</h1>
          <p className="text-text-secondary">
            Historical events where <strong>coordination/authorisation</strong> was the primary bottleneck.
            Each demo shows the baseline timeline and a Munin counterfactual (pre-simulated playbooks, multi-agency sign-off in minutes).
          </p>
        </div>

        <div className="flex items-center gap-2 mb-6 p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Run the engine for a demo: <code className="bg-base-800 px-1 rounded">cd engine && python disaster_demos.py</code> or <code className="bg-base-800 px-1 rounded">python disaster_demos.py katrina_2005</code>.
          </span>
        </div>

        <div className="space-y-4">
          {DEMOS.map((demo) => {
            const Icon = demo.icon;
            return (
              <Card key={demo.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded ${demo.primary ? 'bg-primary-500/20' : 'bg-base-700'}`}>
                    <Icon className="w-6 h-6 text-text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-semibold">{demo.name}</h2>
                      {demo.primary && (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary-500/30 text-primary-200">
                          Primary demo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{demo.date}</p>
                    <p className="text-text-secondary text-sm mb-4">{demo.description}</p>
                    <Link href={demo.href}>
                      <Button variant={demo.primary ? 'primary' : 'outline'}>
                        {demo.primary ? 'Open dashboard' : 'View timeline & counterfactual'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Demo comparison viz: before/after (roadmap item 16) */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Comparison: Traditional vs Munin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 border-amber-500/30 bg-amber-500/5">
              <div className="text-sm font-semibold text-amber-200 mb-2">Traditional coordination</div>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>• Cross-agency sign-off: 2–6 hours</li>
                <li>• Manual handoffs, phone/email</li>
                <li>• No pre-validated playbooks</li>
              </ul>
            </Card>
            <Card className="p-4 border-primary-500/30 bg-primary-500/5">
              <div className="text-sm font-semibold text-primary-200 mb-2">Munin</div>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>• Single sign-off path: &lt;2 min</li>
                <li>• Pre-simulated playbooks, audit trail</li>
                <li>• Time-to-authorize in packet</li>
              </ul>
            </Card>
          </div>
        </div>

        <div className="mt-8 text-sm text-text-muted">
          <p>
            Evidence and criteria: <a href="/docs" className="text-primary-400 hover:underline">docs</a> and <code>docs/EVIDENCE_COORDINATION_BOTTLENECK.md</code>.
            September 11 (2001) is excluded from these demos by product decision.
          </p>
        </div>
      </div>
    </div>
  );
}
