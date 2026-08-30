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


describe('nostrChannel filter shape (NIP-01 REQ invariant)', () => {
  beforeEach(() => {
    nostrChannel.relays = ['wss://relay'];
    nostrChannel.profile = { publicKey: 'myKey' };
  });

  test('_subscribe forwards an array of filters to subscribeMany', async () => {
    const closer = { close: jest.fn() };
    nostrChannel.pool = {
      subscribeMany: jest.fn().mockResolvedValue(closer),
      querySync: jest.fn(),
    };
    const filters = [{ kinds: [21102], tags: [['space', 's']] }];
    const result = await nostrChannel._subscribe({ filters, onevent: () => {} });
    expect(nostrChannel.pool.subscribeMany).toHaveBeenCalledTimes(1);
    const passed = nostrChannel.pool.subscribeMany.mock.calls[0][1];
    expect(Array.isArray(passed)).toBe(true);
    expect(passed).toEqual(filters);
    expect(result).toBe(closer);
  });

  test('_subscribe REQ wire invariant: stringify(filters) must start with [', async () => {
    // Regression: Subscription.fire() does
    //   JSON.stringify(filters).substring(1)
    // so a non-array (single object) loses its opening brace and the relay
    // rejects the malformed REQ. Enforce the invariant directly.
    nostrChannel.pool = {
      subscribeMany: jest.fn().mockResolvedValue({ close: jest.fn() }),
      querySync: jest.fn(),
    };
    const one = { kinds: [1000], tags: [['rtc-app', 'spaces']] };
    await nostrChannel._subscribe({ filters: one, onevent: () => {} });
    const passed = nostrChannel.pool.subscribeMany.mock.calls[0][1];
    expect(JSON.stringify(passed).startsWith('[')).toBe(true);
    expect(JSON.parse('[' + JSON.stringify(passed).substring(1))).toHaveLength(1);
  });

  test('_queryEvents passes one filter object per querySync call', async () => {
    nostrChannel.pool = {
      subscribeMany: jest.fn(),
      querySync: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'a', kind: 1000 }])
        .mockResolvedValueOnce([{ id: 'b', kind: 1001 }]),
    };
    const filters = [{ kinds: [1000] }, { kinds: [1001] }];
    const out = await nostrChannel._queryEvents({ filters });
    expect(nostrChannel.pool.querySync).toHaveBeenCalledTimes(2);
    for (const call of nostrChannel.pool.querySync.mock.calls) {
      expect(Array.isArray(call[1])).toBe(false); // single object, not array
      expect(typeof call[1]).toBe('object');
    }
    expect(out).toEqual([{ id: 'a', kind: 1000 }, { id: 'b', kind: 1001 }]);
  });

  test('_queryEvents dedupes merged results by event id', async () => {
    nostrChannel.pool = {
      subscribeMany: jest.fn(),
      querySync: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'a', kind: 1000 }])
        .mockResolvedValueOnce([{ id: 'a', kind: 1000 }, { id: 'b', kind: 1000 }]),
    };
    const out = await nostrChannel._queryEvents({
      filters: [{ kinds: [1000] }, { kinds: [1000] }],
    });
    expect(out).toEqual([{ id: 'a', kind: 1000 }, { id: 'b', kind: 1000 }]);
  });
});
