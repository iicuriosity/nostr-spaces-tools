import { jest } from '@jest/globals';
jest.unstable_mockModule('../classes/NostrChannel.js', () => ({
  nostrChannel: { requestSpeech: jest.fn() },
}));
const { Space } = await import('../classes/Space.js');

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

describe('Space', () => {
  test('prepareSpace throws if host or me missing', () => {
    const host = createNode('host', { isHost: true });
    const space = new Space(
      'id',
      'name',
      null,
      host,
      [],
      500,
      500,
      0.4,
      0.4,
      0.2,
      jest.fn(),
      jest.fn(),
      [],
      jest.fn(),
      jest.fn(),
      jest.fn(),
      jest.fn()
    );
    expect(() => space.prepareSpace()).toThrow('Space host and current user must be defined');
  });
});
