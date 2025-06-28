import { CollaborationGraph } from '../package/classes/CollaborationGraph.js';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

function createNode(id, opts = {}) {
  return {
    publicKey: id,
    name: `peer-${id}`,
    isHost: !!opts.isHost,
    isCoHost: !!opts.isCoHost,
    isSpeaker: !!opts.isSpeaker,
    networkMetrics: {
      downloadSpeedKbps: 1000 + Math.round(Math.random() * 1000),
      uploadSpeedKbps: 800 + Math.round(Math.random() * 1000),
      maxAudioOutputs: 10,
      networkConnectionType: 'wifi',
    },
    getUploadSpeedInKbps() {
      return this.networkMetrics.uploadSpeedKbps;
    },
    getMaxAudioOutput() {
      return this.networkMetrics.maxAudioOutputs;
    },
    closeChannel() {},
    closeSubscriptions() {},
  };
}

function workerRun(startIndex, count) {
  const host = createNode('host', { isHost: true });
  const me = createNode('me');
  const graph = new CollaborationGraph(host, me, 4000, 5000, 0.4, 0.4, 0.2);

  const startMem = process.memoryUsage().heapUsed;
  const startCpu = process.cpuUsage();

  for (let i = startIndex; i < startIndex + count; i++) {
    const peer = createNode(`p${i}`);
    graph.addNode(peer);
    graph.addConnection(host, peer, 'consumer', 'initiated');
  }

  const best = graph.fetchBestFit();
  const endMem = process.memoryUsage().heapUsed;
  const endCpu = process.cpuUsage(startCpu);

  parentPort.postMessage({
    type: 'stats',
    memDiff: endMem - startMem,
    cpuUsage: endCpu,
    bestPeer: best ? best.publicKey : 'none',
  });
}

if (isMainThread) {
  const numPeers = parseInt(process.argv[2], 10) || 100;
  const numWorkers = parseInt(process.argv[3], 10) || 4;
  const peersPerWorker = Math.ceil(numPeers / numWorkers);
  let completed = 0;
  const results = [];
  let workerCount = 0;

  for (let i = 0; i < numWorkers; i++) {
    const startIndex = i * peersPerWorker;
    const count = Math.min(peersPerWorker, numPeers - startIndex);
    if (count <= 0) break;
    const worker = new Worker(new URL(import.meta.url), {
      workerData: { startIndex, count },
    });
    workerCount += 1;
    worker.on('message', (msg) => {
      results.push(msg);
      completed += 1;
      if (completed === workerCount) {
        const totalMem = results.reduce((sum, r) => sum + r.memDiff, 0);
        const totalCpuUser = results.reduce((sum, r) => sum + r.cpuUsage.user, 0);
        const totalCpuSystem = results.reduce((sum, r) => sum + r.cpuUsage.system, 0);
        const bestPeers = results.map((r) => r.bestPeer).join(', ');
        console.log(`Best peers per worker: ${bestPeers}`);
        console.log(`Total peers tested: ${numPeers}`);
        console.log(`Workers used: ${workerCount}`);
        console.log(`Average memory per worker: ${(totalMem / results.length / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`Total CPU time: user ${(totalCpuUser / 1000).toFixed(2)} ms, system ${(totalCpuSystem / 1000).toFixed(2)} ms`);
      }
    });
  }
} else {
  const { startIndex, count } = workerData;
  workerRun(startIndex, count);
}
