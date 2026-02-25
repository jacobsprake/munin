import { useAppStore } from '../store';

describe('AppStore (Zustand)', () => {
  beforeEach(() => {
    useAppStore.setState({
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
      shadowModeActive: false,
      shadowGraph: null,
      emergencyMode: false,
      emergencyLevel: 'peacetime',
    });
  });

  it('has correct initial state', () => {
    const state = useAppStore.getState();
    expect(state.selectedNodeId).toBeNull();
    expect(state.region).toBe('all');
    expect(state.mode).toBe('live');
    expect(state.warRoomMode).toBe(false);
    expect(state.emergencyLevel).toBe('peacetime');
  });

  it('sets selected node', () => {
    useAppStore.getState().setSelectedNode('node_01');
    expect(useAppStore.getState().selectedNodeId).toBe('node_01');
  });

  it('sets selected edge', () => {
    useAppStore.getState().setSelectedEdge('edge_01');
    expect(useAppStore.getState().selectedEdgeId).toBe('edge_01');
  });

  it('sets simulation time', () => {
    useAppStore.getState().setSimulationTime(120);
    expect(useAppStore.getState().simulationTime).toBe(120);
  });

  it('toggles war room mode', () => {
    useAppStore.getState().setWarRoomMode(true);
    expect(useAppStore.getState().warRoomMode).toBe(true);
  });

  it('toggles shadow links only', () => {
    useAppStore.getState().setShowShadowLinksOnly(true);
    expect(useAppStore.getState().showShadowLinksOnly).toBe(true);
  });

  it('sets deployment mode', () => {
    useAppStore.getState().setDeploymentMode('pilot');
    expect(useAppStore.getState().deploymentMode).toBe('pilot');
  });

  it('sets emergency level', () => {
    useAppStore.getState().setEmergencyLevel('war');
    expect(useAppStore.getState().emergencyLevel).toBe('war');
    useAppStore.getState().setEmergencyMode(true);
    expect(useAppStore.getState().emergencyMode).toBe(true);
  });

  it('sets blast radius depth', () => {
    useAppStore.getState().setBlastRadiusDepth(3);
    expect(useAppStore.getState().blastRadiusDepth).toBe(3);
  });

  it('sets connectivity state', () => {
    useAppStore.getState().setConnectivityState('air_gapped');
    expect(useAppStore.getState().connectivityState).toBe('air_gapped');
  });

  it('clears selection', () => {
    useAppStore.getState().setSelectedNode('node_01');
    useAppStore.getState().setSelectedNode(null);
    expect(useAppStore.getState().selectedNodeId).toBeNull();
  });
});
