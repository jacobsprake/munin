import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const ALLOWED_IDS = ['katrina_2005', 'fukushima_2011', 'uk_floods_2007'];

function normalizeEventId(segment: string): string {
  return segment.replace(/-/g, '_');
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId: raw } = await params;
  const eventId = normalizeEventId(raw);
  if (!ALLOWED_IDS.includes(eventId)) {
    return NextResponse.json(
      { error: 'Unknown event. Use katrina-2005, fukushima-2011, or uk-2007.' },
      { status: 404 }
    );
  }
  try {
    const path = join(
      process.cwd(),
      'engine',
      'fixtures',
      'disaster_baselines',
      `${eventId}_baseline.json`
    );
    const content = await readFile(path, 'utf-8');
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (err) {
    console.error('demos/baseline read error:', err);
    return NextResponse.json(
      { error: 'Baseline data not found or invalid.' },
      { status: 500 }
    );
  }
}
