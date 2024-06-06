export const extractNetworkMetrics = async () => {
  // TODO: implement this
  const networkMetrics = {
    downloadSpeedKbps: 0, // in kbps
    uploadSpeedKbs: 0, // in kbps
    maxAudioOutputs: 10,
    networkConnectionType: navigator.connection.type,
  };
  return networkMetrics;
};
