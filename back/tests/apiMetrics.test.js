const { createApiMetrics } = require('../utils/apiMetrics');

function createResponse(statusCode) {
  const listeners = {};
  return {
    statusCode,
    once(event, listener) {
      listeners[event] = listener;
    },
    finish() {
      if (listeners.finish) listeners.finish();
    }
  };
}

describe('API metrics middleware', () => {
  it('counts successful and failed API responses by method and path', () => {
    const metrics = createApiMetrics();
    const request = { method: 'GET', path: '/api/products', baseUrl: '' };
    const success = createResponse(200);
    const failure = createResponse(500);

    metrics.middleware(request, success, () => {});
    success.finish();
    metrics.middleware(request, failure, () => {});
    failure.finish();

    expect(metrics.snapshot()).toEqual([
      expect.objectContaining({
        method: 'GET',
        path: '/api/products',
        requests: 2,
        successes: 1,
        errors: 1,
        successRate: 0.5,
        errorRate: 0.5,
        statusCodes: { 200: 1, 500: 1 }
      })
    ]);
  });

  it('ignores non-API requests and can reset collected data', () => {
    const metrics = createApiMetrics();
    const response = createResponse(200);

    metrics.middleware({ method: 'GET', path: '/', baseUrl: '' }, response, () => {});
    response.finish();
    expect(metrics.snapshot()).toEqual([]);

    metrics.reset();
    expect(metrics.snapshot()).toEqual([]);
  });
});