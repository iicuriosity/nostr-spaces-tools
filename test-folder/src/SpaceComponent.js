// SpaceComponent
function SpaceComponent({ space, onJoinSpace }) {
  useEffect(() => {
    // Inject audio handling functions into the space object
    space.addRemoteAudio = (stream, nodePublicKey) => {
      const audioElement = document.createElement('audio');
      audioElement.srcObject = stream;
      audioElement.id = `audio-${nodePublicKey}`;
      audioElement.autoplay = true;
      document.body.appendChild(audioElement);
    };

    space.dropRemoteAudio = nodePublicKey => {
      const audioElement = document.getElementById(`audio-${nodePublicKey}`);
      if (audioElement) {
        audioElement.parentNode.removeChild(audioElement);
      }
    };

    return () => {
      // Cleanup if the component is unmounted
      space.addRemoteAudio = null;
      space.dropRemoteAudio = null;
    };
  }, [space]);

  return (
    <li>
      {space.name}
      <button onClick={() => onJoinSpace(space)}>Join</button>
    </li>
  );
}
