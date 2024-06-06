import { useState, useEffect, useRef } from 'react';
import './SpacesList.css';
import { nostrChannel } from './classes/NostrChannel.js';

function SpacesList({
  audioRefs,
  spaces,
  setSpaces,
  activeSpace,
  setActiveSpace,
}) {
  useEffect(() => {
    setSpaces(nostrChannel.queryActiveSpaces());
  }, []);

  function joinSpace(space) {
    if (activeSpace) activeSpace.leave();
    setActiveSpace(space);
    space.joinSpace();
    nostrChannel.subscribeNewPeerEvent(space, peer => {});
    establishRemoteAudioStreams(space);
  }

  function establishRemoteAudioStreams(space) {
    space.peers.forEach((peer, peerIndex) => {
      peer.registerRemoteAudioStreamOutput(remoteStream => {
        if (audioRefs.current) {
          audioRefs.current[peerIndex].srcObject = remoteStream;
        }
      });
    });
  }

  return (
    <div>
      <ul class="scrollable-list">
        {spaces.map((space, spaceIndex) => {
          return (
            <li key={spaceIndex}>
              {space.name}{' '}
              <button
                disabled={space === activeSpace}
                onClick={() => {
                  joinSpace(space);
                }}
              >
                Join
              </button>
              <ul class="hidden">
                {space.peers.forEach((peer, peerIndex) => {
                  return (
                    <li key={peerIndex}>
                      <audio
                        ref={audioRefs.current[peerIndex]}
                        controls
                        autoplay
                      ></audio>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SpacesList;
