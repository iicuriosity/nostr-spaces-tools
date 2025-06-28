# nostr-spaces-tools
  Revolutionizing Real-Time audio spaces: This project introduces an innovative framework designed to enhance real-time, decentralized audio communication. Leveraging advanced WebRTC and Nostr protocols, it facilitates secure, efficient, and scalable peer-to-peer connections, enabling seamless audio exchange. Ideal for nostr clients developers looking to enhance their users experience by adding a twitter/x spaces like feature.
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
## Load Testing

The helper script `scripts/load-test.js` now uses Node's worker threads to mimic
multiple peers connecting concurrently. Run it from the repository root using:

```bash
node scripts/load-test.js [numPeers] [numWorkers]
```

`numPeers` sets how many peers to simulate (default `100`). `numWorkers`
determines how many worker threads perform the simulation (default `4`). The
output lists the best peer selected by each worker along with aggregated memory
and CPU statistics.
