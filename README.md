# nostr-spaces-tools

`nostr-spaces-tools` is a small library that implements the core building blocks required to create Twitter/X style audio spaces on top of the [Nostr](https://github.com/nostr-protocol/nostr) protocol. It combines WebRTC for real time audio streaming with Nostr events for peer discovery and signalling.

The package exposes a set of classes that help manage peers, spaces and the underlying collaboration graph. It can be used in Node.js or in the browser (via bundlers) to build decentralised audio applications.

For a complete guide to the API and examples see
[docs/full-documentation.md](docs/full-documentation.md).

## Features

- **Nostr signalling channel** – exchange offers, answers and ICE candidates through Nostr relays.
- **Space** model – represents an audio room with a host and participants.
- **Peer management** – track speakers, co‑hosts and regular peers.
- **Collaboration graph** – chooses the best peer to connect to based on network metrics.
- **Network metrics extraction** – detect upload/download bandwidth and derive the number of concurrent audio outputs.
- **Utility scripts** – load testing script and a suite of Jest tests.

## Installation

```bash
npm install nostr-spaces-tools
```

If you are working with this repository directly clone it and install the dependencies inside the `package` folder:

```bash
cd package
npm install
```

## Usage

The library exports the following modules:

```javascript
import { Peer, Space, nostrChannel, CollaborationGraph, extractNetworkMetrics } from 'nostr-spaces-tools';
```

### 1. Create a profile and open a Nostr channel

```javascript
import { Profile } from 'nostr-spaces-tools';

// Gather network metrics (download speed, upload speed, etc.)
const metrics = await extractNetworkMetrics();

const profile = new Profile({
  name: 'Alice',
  publicKey: '<hex public key>',
  privateKey: '<hex private key>',
  relays: ['wss://relay.damus.io'],
  networkMetrics: metrics,
});

// Connect to relays so nostrChannel can publish/subscribe
nostrChannel.openChannel(profile.relays, profile);
```

### 2. Creating and publishing a space

```javascript
const mySpace = await nostrChannel.createNewSpace(
  'space-id',
  'My first space',
  () => console.log('WebRTC connection established'),
  () => console.log('WebRTC connection closed'),
  [{ urls: 'stun:stun.l.google.com:19302' }],
  peer => console.log('New peer joined', peer.publicKey)
);
```

`createNewSpace` publishes a `CREATE_SPACE` event to relays and automatically sets up all subscriptions required to handle peers joining, connection offers, answers and ICE candidates.

### 3. Discovering and joining spaces

```javascript
const spaces = await nostrChannel.fetchActiveSpaces();
const space = spaces[0];

// start the connection process and join
nostrChannel.startConnectionProcess(space);
```

### 4. Requesting to speak

Participants can request the microphone using:

```javascript
nostrChannel.requestSpeech(space);
```

Hosts can respond with `PROMOTE_SPEAKER`, `PROPOSE_SPEECH` or similar events defined in `NostrChannel`.

## Load testing

The repository contains `scripts/load-test.js` which spawns worker threads and populates a `CollaborationGraph` with a number of synthetic peers. It outputs memory and CPU usage as well as the best peer chosen by the scoring algorithm.

Run it from the project root:

```bash
node scripts/load-test.js [numPeers] [numWorkers]
```

## Running the tests

Inside the `package` folder run:

```bash
npm install
npm test
```

The tests cover the main classes and help ensure the scoring and signalling logic behaves correctly.

## Contributing

We welcome community contributions. To get started:

1. Fork the repository and create your feature branch from `main`.
2. Install dependencies inside the `package` directory using `npm ci`.
3. Run `npm test --silent` to verify that all tests pass.
4. Make your changes and ensure `npm run build` succeeds.
5. Open a pull request using the provided template and link relevant issues.

Issue templates for bug reports and feature requests can be found under
`.github/ISSUE_TEMPLATE`. Please also read our
[CONTRIBUTING.md](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md)
before submitting your pull request.

## License

This project is licensed under the [MIT License](LICENSE).
