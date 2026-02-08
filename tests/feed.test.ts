import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('RSS Aggregator', () => {
  it('should return health status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', engine: 'Vox-Elite-v1' });
  });

  it('should require a url parameter', async () => {
    const res = await app.request('/feed');
    expect(res.status).toBe(400);
  });
});
