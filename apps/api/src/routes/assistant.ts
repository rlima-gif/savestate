import { Hono } from 'hono';
import { Env } from '../types';
import { AssistantChatRequestSchema } from '@savestate/shared';
import { checkRateLimit } from '../services/rate-limit';
import { askGeminiAssistant } from '../services/gemini';

export const assistantRouter = new Hono<{ Bindings: Env }>();

assistantRouter.post('/assistant/chat', async (c) => {
  // 1. Check feature switch
  if (c.env.AI_FEATURE_ENABLED === 'false') {
    return c.json(
      {
        error: 'O assistente com IA está temporariamente desativado para manutenção.',
        quotaExhausted: true,
      },
      503
    );
  }

  // 2. Parse & validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'JSON inválido no corpo da requisição.' }, 400);
  }

  const parseResult = AssistantChatRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Dados de requisição inválidos.',
        details: parseResult.error.format(),
      },
      400
    );
  }

  const requestData = parseResult.data;

  // 3. Image validation: max 4MB base64 payload
  if (requestData.imageBase64 && requestData.imageBase64.length > 5 * 1024 * 1024) {
    return c.json(
      { error: 'A imagem enviada excede o limite máximo permitido de 4MB.' },
      413
    );
  }

  // 4. Rate Limiting based on IP
  const clientIp =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for') ||
    c.req.header('x-real-ip') ||
    '127.0.0.1';

  const dailyLimit = Number(c.env.AI_DAILY_RATE_LIMIT) || 30;
  const rateLimitStatus = await checkRateLimit(c.env.DB, clientIp, 'assistant', dailyLimit);

  if (!rateLimitStatus.allowed) {
    return c.json(
      {
        error: `Você atingiu o limite de ${dailyLimit} consultas ao assistente por hoje. Seu limite será renovado à meia-noite (UTC).`,
        quotaExhausted: true,
        resetAt: rateLimitStatus.resetAt,
      },
      429
    );
  }

  // 5. Query Gemini Assistant
  const response = await askGeminiAssistant(requestData, {
    apiKey: c.env.GEMINI_API_KEY,
    model: c.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  });

  return c.json({
    ...response,
    rateLimit: {
      remaining: Math.max(0, dailyLimit - rateLimitStatus.current),
      limit: dailyLimit,
      resetAt: rateLimitStatus.resetAt,
    },
  });
});
