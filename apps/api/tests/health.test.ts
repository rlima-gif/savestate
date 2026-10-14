import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Health Check Route', () => {
  it('GET /health returns 200 with status ok and version', async () => {
    const res = await app.request('/health', {}, {
      ENVIRONMENT: 'test',
      AI_FEATURE_ENABLED: 'true',
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('ok');
    expect(body.app).toBe('SaveState Backend API');
    expect(body.version).toBe('0.1.0');
    expect(body.features.aiAssistant).toBe(true);
    expect(body.features.igdbConfigured).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/TWITCH_CLIENT_SECRET|access_token/);
  });

  it('reports IGDB configured as a boolean without revealing credentials', async () => {
    const res = await app.request('/health', {}, {
      ENVIRONMENT: 'test',
      TWITCH_CLIENT_ID: 'public-id',
      TWITCH_CLIENT_SECRET: 'never-expose-secret',
    });
    const body = await res.json() as any;
    expect(body.features.igdbConfigured).toBe(true);
    expect(JSON.stringify(body)).not.toContain('never-expose-secret');
  });
});
