import { EvidenceData, GraphData, HandshakePacket, IncidentsData } from './types';

const defaultInit: RequestInit = { cache: 'no-store' };

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { ...defaultInit, signal });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function loadGraphData(signal?: AbortSignal): Promise<GraphData> {
  return getJson<GraphData>('/api/graph', signal);
}

export async function loadEvidenceData(signal?: AbortSignal): Promise<EvidenceData> {
  return getJson<EvidenceData>('/api/evidence', signal);
}

export async function loadIncidentsData(signal?: AbortSignal): Promise<IncidentsData> {
  return getJson<IncidentsData>('/api/incidents', signal);
}

export async function loadPackets(signal?: AbortSignal): Promise<HandshakePacket[]> {
  return getJson<HandshakePacket[]>('/api/packets', signal);
}

