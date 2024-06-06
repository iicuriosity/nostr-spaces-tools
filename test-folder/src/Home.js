import { useState, useEffect, useRef } from 'react';
import { SpacesList } from './SpacesList.js';
import { v4 as uuidv4 } from 'uuid';
import { nostrChannel } from 'nostr-spaces-toos';

function Home() {
  const audioRefs = useRef([]);
  const [spaces, setSpaces] = useState([]);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [activeSpace, setActiveSpace] = useState(null);
  const [spacesRepo, setSpacesRepo] = useState(null);

  useEffect(() => {
    if (!nostrChannel.isOpen())
      nostrChannel.openChannel([], new Profile({ name: '' }));
    setSpacesRepo(nostrChannel);
  }, []);

  function createSpace(event) {
    event.preventDefault(); // Prevent the default form submission behavior
    setNewSpaceName(event.target.value);
    const spaceId = uuidv4();
    setActiveSpace(
      spacesRepo.createNewSpace(spaceId, newSpaceName, null, null, null, null)
    );
  }

  return (
    <div>
      <SpacesList
        audioRefs={audioRefs}
        spaces={spaces}
        setSpaces={setSpaces}
        activeSpace={activeSpace}
        setActiveSpace={setActiveSpace}
      />
      <form onSubmit={createSpace}>
        <div className="label-value-grid-container">
          <p className="label-grid-item">New Space</p>
          <input
            type="text"
            className="value-grid-item"
            value={newSpaceName}
            onChange={handleSpaceNameInputChange}
          />
        </div>
        <button type="submit">Send</button>
      </form>
      <button onClick={toggleMute}>Mute</button>
      <button onClick={stopMediaTracks}>End</button>
    </div>
  );
}

export default Home;
