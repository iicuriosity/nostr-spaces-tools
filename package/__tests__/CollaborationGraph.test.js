import { jest } from '@jest/globals';
import { CollaborationGraph } from '../classes/CollaborationGraph.js';

function createNode(id, opts = {}) {
  return {
    publicKey: id,
    name: id,
    isHost: !!opts.isHost,
    isCoHost: !!opts.isCoHost,
    isSpeaker: !!opts.isSpeaker,
    networkMetrics: { downloadSpeedKbps: 1000, maxAudioOutputs: 2 },
    getUploadSpeedInKbps() { return this.networkMetrics.downloadSpeedKbps; },
    getMaxAudioOutput() { return this.networkMetrics.maxAudioOutputs; },
    closeChannel: jest.fn(),
    closeSubscriptions: jest.fn(),
  };
}

describe('CollaborationGraph', () => {
  test('addNode and removeNode work as expected', () => {
    const host = createNode('host', { isHost: true });
    const me = createNode('me');
    const g = new CollaborationGraph(host, me);
    expect(g.nodes.size).toBe(2);

    const peer = createNode('peer1');
    g.addNode(peer);
    expect(g.nodes.get('peer1')).toBe(peer);

    g.removeNode(peer);
    expect(g.nodes.has('peer1')).toBe(false);
  });

  test('addConnection stores connections', () => {
    const host = createNode('host', { isHost: true });
    const me = createNode('me');
    const g = new CollaborationGraph(host, me);
    const peer = createNode('peer');
    g.addConnection(me, peer, 'consumer', 'initiated');
    expect(g.connections.length).toBe(1);
    expect(g.connections[0].node1).toBe(me);
    expect(g.connections[0].node2).toBe(peer);
  });
});
