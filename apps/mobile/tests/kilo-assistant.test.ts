import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantChatRequest } from '@savestate/shared';
import { askKiloAssistant } from '../src/services/kilo-assistant';
import { ApiService } from '../src/services/api';

const request: AssistantChatRequest = {
  message: 'Como abro esta porta?',
  context: {
    gameTitle: 'Hollow Knight',
    currentChapter: 'Cidade das Lágrimas',
    spoilerLevel: 'hints_only',
    hintTier: 'small_hint',
  },
};

function response(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe('Kilo free multimodal assistant', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('routes the app assistant to Kilo by default', async () => {
    vi.stubEnv('EXPO_PUBLIC_KILO_ASSISTANT_ENABLED', 'true');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({
      choices: [{ message: { content: 'Tente a alavanca ao lado.' } }],
    }));

    const result = await ApiService.askAssistant(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.kilo.ai/api/gateway/chat/completions');
    expect(result.answer).toBe('Tente a alavanca ao lado.');
  });

  it('keeps the Cloudflare Worker available when Kilo is explicitly disabled', async () => {
    vi.stubEnv('EXPO_PUBLIC_KILO_ASSISTANT_ENABLED', 'false');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Resposta do Worker.', hintTier: 'small_hint', externalSearchLinks: [] }),
    } as any);

    const result = await ApiService.askAssistant(request);

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/assistant/chat');
    expect(result.answer).toBe('Resposta do Worker.');
  });

  it('sends a game-focused request without an API key and returns only visible answer text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      choices: [{
        message: {
          content: 'Procure uma alavanca por perto.',
          reasoning: 'This hidden reasoning must never be displayed.',
        },
      }],
    }));

    const result = await askKiloAssistant(request, fetchMock);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));

    expect(url).toBe('https://api.kilo.ai/api/gateway/chat/completions');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Accept: 'application/json' });
    expect(payload.model).toBe('openrouter/free');
    expect(payload.messages[0].role).toBe('system');
    expect(payload.messages[1].content).toContain('Hollow Knight');
    expect(result.answer).toBe('Procure uma alavanca por perto.');
    expect(result.answer).not.toContain('hidden reasoning');
    expect(result.hintTier).toBe('small_hint');
    expect(result.externalSearchLinks).toEqual([]);
  });

  it('sends image bytes as an OpenAI-compatible data URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      choices: [{ message: { content: [{ type: 'text', text: 'Vejo uma porta trancada.' }] } }],
    }));

    await askKiloAssistant({
      ...request,
      imageBase64: 'aGVsbG8=',
      imageMimeType: 'image/png',
    }, fetchMock);

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(payload.messages[1].content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'text' }),
      expect.objectContaining({
        type: 'image_url',
        image_url: { url: 'data:image/png;base64,aGVsbG8=' },
      }),
    ]));
  });

  it('does not leak provider reasoning when the response has no user-facing content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      choices: [{ message: { content: null, reasoning: 'private reasoning' } }],
    }));

    await expect(askKiloAssistant(request, fetchMock))
      .rejects.toThrow('O modelo não retornou uma resposta de texto');
  });

  it('reports free-model rate limits without silently calling the paid Worker path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ error: 'limit' }, 429));

    await expect(askKiloAssistant(request, fetchMock))
      .rejects.toThrow('A IA gratuita está com a cota temporariamente esgotada');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
