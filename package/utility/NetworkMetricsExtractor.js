export const extractNetworkMetrics = async () => {
  const metrics = {
    downloadSpeedKbps: 0,
    uploadSpeedKbps: 0,
    maxAudioOutputs: 10,
    networkConnectionType: 'unknown',
  };

  if (typeof navigator !== 'undefined') {
    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
      metrics.networkConnectionType =
        connection.effectiveType || connection.type || metrics.networkConnectionType;
      if (typeof connection.downlink === 'number') {
        metrics.downloadSpeedKbps = Math.round(connection.downlink * 1000);
      }
      if (typeof connection.upload === 'number') {
        metrics.uploadSpeedKbps = Math.round(connection.upload * 1000);
      } else {
        metrics.uploadSpeedKbps = metrics.downloadSpeedKbps;
      }
    }
  }

  if (metrics.uploadSpeedKbps > 0) {
    metrics.maxAudioOutputs = Math.max(1, Math.floor(metrics.uploadSpeedKbps / 64));
  }

  return metrics;
};
