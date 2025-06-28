import { jest } from '@jest/globals';

jest.unstable_mockModule('nostr-tools', () => ({
  __esModule: true,
  Event: class {},
  SimplePool: class {
    publish() {}
    subscribeMany() {}
    querySync() { return []; }
  },
  generateSecretKey: jest.fn(),
  getPublicKey: jest.fn(),
  finalizeEvent: jest.fn(e => e),
}));

const { nostrChannel } = await import('../classes/NostrChannel.js');

describe('nostrChannel basic events', () => {
  beforeEach(() => {
    nostrChannel.relays = ['wss://relay'];
    nostrChannel.profile = { publicKey: 'myKey' };
  });

  test('sendOffer forwards event to _sendEvent', async () => {
    const peer = { publicKey: 'peer', space: { id: 'space', host: { publicKey: 'host' } } };
    const spy = jest.spyOn(nostrChannel, '_sendEvent').mockResolvedValue();
    await nostrChannel.sendOffer(peer, 'offer');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      pubkey: 'myKey',
      kind: 21102,
    }));
    spy.mockRestore();
  });

  test('sendAnswer forwards event to _sendEvent', async () => {
    const peer = { publicKey: 'peer', space: { id: 'space', host: { publicKey: 'host' } } };
    const spy = jest.spyOn(nostrChannel, '_sendEvent').mockResolvedValue();
    await nostrChannel.sendAnswer(peer, 'answer');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      pubkey: 'myKey',
      kind: 21103,
    }));
    spy.mockRestore();
  });

  test('isOpen reflects profile and relay status', () => {
    expect(nostrChannel.isOpen()).toEqual({ publicKey: 'myKey' });
    nostrChannel.relays = null;
    expect(nostrChannel.isOpen()).toBeFalsy();
  });
});
