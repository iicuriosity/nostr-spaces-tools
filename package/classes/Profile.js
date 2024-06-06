import { extractNetworkMetrics } from '../utility/NetworkMetricsExtractor.js';
export class Profile {
  constructor(data = {}) {
    this.name = data.name || '';
    this.privateKey = data.privateKey || '';
    this.publicKey = data.publicKey || '';
    this.relays = data.relays || [];
    this.networkMetrics = data.networkMetrics || extractNetworkMetrics();
  }

  getMaxAudioOutput() {
    return this.networkMetrics.maxAudioOutputs;
  }

  getUploadSpeedInKbps() {
    return this.networkMetrics.downloadSpeedKbps;
  }

  getPublicData() {
    return {
      name: this.name,
      publicKey: this.publicKey,
      networkMetrics: this.networkMetrics,
    };
  }
}
