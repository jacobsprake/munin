import { GraphData, EvidenceData, IncidentsData, HandshakePacket } from './types';

export async function loadGraphData(): Promise<GraphData> {
  const res = await fetch('/api/graph');
  if (!res.ok) throw new Error('Failed to load graph data');
  return res.json();
}

export async function loadEvidenceData(): Promise<EvidenceData> {
  const res = await fetch('/api/evidence');
  if (!res.ok) throw new Error('Failed to load evidence data');
  return res.json();
}

export async function loadIncidentsData(): Promise<IncidentsData> {
  const res = await fetch('/api/incidents');
  if (!res.ok) throw new Error('Failed to load incidents data');
  return res.json();
}

export async function loadPackets(): Promise<HandshakePacket[]> {
  const res = await fetch('/api/packets');
  if (!res.ok) throw new Error('Failed to load packets');
  return res.json();
}

