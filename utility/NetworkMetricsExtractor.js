export const extractNetworkMetrics = async () => {
  // TODO: implement this
  const networkMetrics = {
    downloadSpeedKbps: 0, // in kbps
    uploadSpeedKbs: 0, // in kbps
    usedAudioOutputs: 0,
    maxAudioOutputs: 10,
    connectionType: navigator.connection.type,
  };
  return networkMetrics;
};
