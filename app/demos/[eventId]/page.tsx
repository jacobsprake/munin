'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Quote, Clock, Zap } from 'lucide-react';

const SLUG_TO_API_ID: Record<string, string> = {
  'katrina-2005': 'katrina_2005',
  'fukushima-2011': 'fukushima_2011',
  'uk-2007': 'uk_floods_2007',
};

interface TimelineEntry {
  t: string;
  event: string;
}

interface Baseline {
  event_id: string;
  name: string;
  date: string;
  location: string;
  primary_bottleneck?: string;
  timeline: TimelineEntry[];
  coordination_steps_traditional?: string[];
  quotes?: string[];
  munin_counterfactual?: string;
  deaths?: number;
  damage_usd_billion?: number;
  deaths_evacuation_related?: number;
}

export default function DisasterDemoPage() {
  const params = useParams();
  const router = useRouter();
  const eventSlug = typeof params?.eventId === 'string' ? params.eventId : '';
  const apiId = SLUG_TO_API_ID[eventSlug];
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiId) {
      setError('Unknown demo.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/demos/baseline/${eventSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Not found' : 'Failed to load');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setBaseline(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load baseline.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [eventSlug, apiId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-900 text-text-primary p-6 flex items-center justify-center">
        <div className="text-text-secondary">Loading baseline...</div>
      </div>
    );
  }

  if (error || !baseline) {
    return (
      <div className="min-h-screen bg-base-900 text-text-primary p-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-red-400 mb-4">{error || 'Baseline not found.'}</p>
          <Link href="/demos">
            <Button>Back to demos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-900 text-text-primary p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/demos"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to demos
          </Link>
          <h1 className="text-3xl font-bold mb-1">{baseline.name}</h1>
          <p className="text-text-secondary">
            {baseline.date} · {baseline.location}
            {baseline.deaths != null && ` · ${baseline.deaths}+ deaths`}
            {baseline.deaths_evacuation_related != null && ` · ${baseline.deaths_evacuation_related} evacuation-related deaths`}
            {baseline.damage_usd_billion != null && ` · ~$${baseline.damage_usd_billion}B damage`}
          </p>
        </div>

        {baseline.munin_counterfactual && (
          <Card className="p-4 mb-6 border-primary-500/30 bg-primary-500/5">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-primary-200 mb-1">Munin counterfactual</h2>
                <p className="text-sm text-text-primary">{baseline.munin_counterfactual}</p>
              </div>
            </div>
          </Card>
        )}

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timeline (historical)
          </h2>
          <ul className="space-y-2">
            {baseline.timeline.map((entry, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-text-muted font-mono shrink-0 w-32">{entry.t}</span>
                <span className="text-text-primary">{entry.event}</span>
              </li>
            ))}
          </ul>
        </section>

        {baseline.coordination_steps_traditional && baseline.coordination_steps_traditional.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Traditional coordination (baseline bottleneck)</h2>
            <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm">
              {baseline.coordination_steps_traditional.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </section>
        )}

        {baseline.quotes && baseline.quotes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Quote className="w-5 h-5" />
              Official reports
            </h2>
            <div className="space-y-3">
              {baseline.quotes.map((q, i) => (
                <blockquote
                  key={i}
                  className="pl-4 border-l-2 border-base-600 text-text-secondary text-sm italic"
                >
                  {q}
                </blockquote>
              ))}
            </div>
          </section>
        )}

        <div className="flex gap-4">
          <Link href="/demos">
            <Button variant="outline">All demos</Button>
          </Link>
          <Link href="/carlisle-dashboard">
            <Button>Carlisle dashboard (live demo)</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
