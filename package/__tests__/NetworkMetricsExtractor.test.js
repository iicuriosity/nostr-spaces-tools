import { extractNetworkMetrics } from '../utility/NetworkMetricsExtractor.js';

describe('extractNetworkMetrics', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  test('reads connection values from navigator', async () => {
    global.navigator = {
      connection: { downlink: 0.5, upload: 0.2, effectiveType: '4g' },
    };
    const metrics = await extractNetworkMetrics();
    expect(metrics.downloadSpeedKbps).toBe(500);
    expect(metrics.uploadSpeedKbps).toBe(200);
    expect(metrics.maxAudioOutputs).toBe(3);
    expect(metrics.networkConnectionType).toBe('4g');
  });
});
