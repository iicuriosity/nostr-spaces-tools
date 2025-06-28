import { jest } from "@jest/globals";
import { Peer } from '../classes/Peer.js';

function defaultSpace() {
  return {
    audioProviderNode: () => false,
    dropRemoteAudio: jest.fn(),
  };
}

function createPeer(opts = {}) {
  const space = opts.space || defaultSpace();
  const metrics = opts.metrics || { maxAudioOutputs: 2, uploadSpeedKbps: 100 };
  return new Peer(
    space,
    'name',
    'pk',
    false,
    false,
    false,
    metrics,
    opts.requestConnectionToPeer || jest.fn(),
    jest.fn(),
    jest.fn(),
    jest.fn()
  );
}

describe('Peer basic functionality', () => {
  test('reserveConnection triggers request', () => {
    const req = jest.fn();
    const peer = createPeer({ requestConnectionToPeer: req });
    peer.reserveConnection();
    expect(req).toHaveBeenCalledWith(peer);
  });

  test('toggleMute flips track state', () => {
    const track = { enabled: true };
    const peer = createPeer();
    peer.localStream = { getAudioTracks: () => [track] };
    peer.toggleMute();
    expect(track.enabled).toBe(false);
    peer.toggleMute();
    expect(track.enabled).toBe(true);
  });

  test('stopMediaTracks stops tracks', () => {
    const t1 = { stop: jest.fn() };
    const t2 = { stop: jest.fn() };
    const peer = createPeer();
    peer.localStream = { getTracks: () => [t1, t2] };
    peer.stopMediaTracks();
    expect(t1.stop).toHaveBeenCalled();
    expect(t2.stop).toHaveBeenCalled();
  });

  test('addSubscriptionCloser stores and closeSubscriptions clears', () => {
    const peer = createPeer();
    const closer = { close: jest.fn() };
    peer.addSubscriptionCloser(closer);
    expect(peer.subscriptionClosers.length).toBe(1);
    peer.closeSubscriptions();
    expect(closer.close).toHaveBeenCalled();
    expect(peer.subscriptionClosers.length).toBe(0);
  });

  test('closeChannel closes connection and cleans up', () => {
    const subCloser = { close: jest.fn() };
    const peer = createPeer();
    peer.peerConnection = { close: jest.fn(), connectionState: 'connected' };
    peer.subscriptionClosers = [subCloser];
    const track = { stop: jest.fn() };
    peer.localStream = { getTracks: () => [track] };
    peer.closeChannel();
    expect(subCloser.close).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
    expect(peer.peerConnection).toBe(null);
  });
});
