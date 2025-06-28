import { Profile } from '../classes/Profile.js';

describe('Profile', () => {
  test('getPublicData returns name, publicKey and network metrics', () => {
    const metrics = { downloadSpeedKbps: 100, maxAudioOutputs: 2 };
    const profile = new Profile({ name: 'Alice', publicKey: 'pk', networkMetrics: metrics });
    expect(profile.getPublicData()).toEqual({ name: 'Alice', publicKey: 'pk', networkMetrics: metrics });
  });
});
