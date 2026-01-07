import { create } from 'zustand';
import { Node, Edge, Incident, HandshakePacket, DeploymentMode, ConnectivityState } from './types';

interface AppState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedIncidentId: string | null;
  selectedPacketId: string | null;
  simulationTime: number | null;
  region: string;
  mode: 'live' | 'replay';
  warRoomMode: boolean;
  showShadowLinksOnly: boolean;
  blastRadiusDepth: number;
  deploymentMode: DeploymentMode;
  connectivityState: ConnectivityState;
  sensorDegradationMode: string | null;
  
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  setSelectedIncident: (incidentId: string | null) => void;
  setSelectedPacket: (packetId: string | null) => void;
  setSimulationTime: (time: number | null) => void;
  setRegion: (region: string) => void;
  setMode: (mode: 'live' | 'replay') => void;
  setWarRoomMode: (enabled: boolean) => void;
  setShowShadowLinksOnly: (enabled: boolean) => void;
  setBlastRadiusDepth: (depth: number) => void;
  setDeploymentMode: (mode: DeploymentMode) => void;
  setConnectivityState: (state: ConnectivityState) => void;
  setSensorDegradationMode: (mode: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedIncidentId: null,
  selectedPacketId: null,
  simulationTime: null,
  region: 'all',
  mode: 'live',
  warRoomMode: false,
  showShadowLinksOnly: false,
  blastRadiusDepth: 1,
  deploymentMode: 'lab_demo',
  connectivityState: 'connected',
  sensorDegradationMode: null,
  
  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setSelectedEdge: (edgeId) => set({ selectedEdgeId: edgeId }),
  setSelectedIncident: (incidentId) => set({ selectedIncidentId: incidentId }),
  setSelectedPacket: (packetId) => set({ selectedPacketId: packetId }),
  setSimulationTime: (time) => set({ simulationTime: time }),
  setRegion: (region) => set({ region }),
  setMode: (mode) => set({ mode }),
  setWarRoomMode: (enabled) => set({ warRoomMode: enabled }),
  setShowShadowLinksOnly: (enabled) => set({ showShadowLinksOnly: enabled }),
  setBlastRadiusDepth: (depth) => set({ blastRadiusDepth: depth }),
  setDeploymentMode: (mode) => set({ deploymentMode: mode }),
  setConnectivityState: (state) => set({ connectivityState: state }),
  setSensorDegradationMode: (mode) => set({ sensorDegradationMode: mode }),
}));

