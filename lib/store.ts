import { create } from 'zustand';
import { Node, Edge, Incident, HandshakePacket } from './types';

interface AppState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedIncidentId: string | null;
  selectedPacketId: string | null;
  simulationTime: number | null;
  region: string;
  mode: 'live' | 'replay';
  
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  setSelectedIncident: (incidentId: string | null) => void;
  setSelectedPacket: (packetId: string | null) => void;
  setSimulationTime: (time: number | null) => void;
  setRegion: (region: string) => void;
  setMode: (mode: 'live' | 'replay') => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedIncidentId: null,
  selectedPacketId: null,
  simulationTime: null,
  region: 'all',
  mode: 'live',
  
  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setSelectedEdge: (edgeId) => set({ selectedEdgeId: edgeId }),
  setSelectedIncident: (incidentId) => set({ selectedIncidentId: incidentId }),
  setSelectedPacket: (packetId) => set({ selectedPacketId: packetId }),
  setSimulationTime: (time) => set({ simulationTime: time }),
  setRegion: (region) => set({ region }),
  setMode: (mode) => set({ mode }),
}));

