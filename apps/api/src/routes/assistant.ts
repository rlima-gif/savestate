import { Hono } from 'hono';
import { Env } from '../types';
import { AssistantChatRequestSchema } from '@savestate/shared';
import { checkRateLimit } from '../services/rate-limit';
import { askGeminiAssistant } from '../services/gemini';

export const assistantRouter = new Hono<{ Bindings: Env }>();

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGE_BASE64_LENGTH = Math.ceil((4 * 1024 * 1024 * 4) / 3); // ~5.5MB base64 for 4MB raw image

assistantRouter.post('/assistant/chat', async (c) => {
  // 1. Check feature kill-switch
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
      },
      400
    );
  }

  const requestData = parseResult.data;

  // 3. Strict Server-Side Length & Format Bounds
  if (requestData.message.trim().length > MAX_MESSAGE_LENGTH) {
    return c.json(
      {
        error: `A pergunta excede o limite máximo permitido de ${MAX_MESSAGE_LENGTH} caracteres.`,
      },
      400
    );
  }

  if (requestData.context.gameTitle.length > 100) {
    return c.json({ error: 'O título do jogo excede o limite máximo permitido.' }, 400);
  }

  if (requestData.context.currentObjective && requestData.context.currentObjective.length > 200) {
    return c.json({ error: 'O objetivo atual excede o limite máximo permitido.' }, 400);
  }

  if (requestData.context.currentChapter && requestData.context.currentChapter.length > 100) {
    return c.json({ error: 'O capítulo atual excede o limite máximo permitido.' }, 400);
  }

  // 4. Strict Image Validation
  if (requestData.imageBase64) {
    const mimeType = requestData.imageMimeType || 'image/jpeg';
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      return c.json(
        {
          error: 'Formato de imagem não suportado. Tipos permitidos: JPEG, PNG e WebP.',
        },
        400
      );
    }

    if (requestData.imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      return c.json(
        {
          error: 'A imagem enviada excede o limite máximo permitido de 4MB.',
        },
        413
      );
    }
  }

  // 5. Rate Limiting based on Client IP / Identifier
  const clientIp =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for') ||
    c.req.header('x-real-ip') ||
    '127.0.0.1';

  const dailyLimit = Number(c.env.AI_DAILY_RATE_LIMIT) || 30;
  const rateLimitStatus = await checkRateLimit(
    c.env.DB,
    clientIp,
    'assistant',
    dailyLimit,
    c.env.ENVIRONMENT
  );

  if (!rateLimitStatus.allowed) {
    if (rateLimitStatus.reason === 'burst_limit') {
      return c.json(
        {
          error: 'Muitas consultas em sequência. Aguarde um minuto antes de enviar outra dúvida.',
          quotaExhausted: false,
          resetAt: rateLimitStatus.resetAt,
        },
        429
      );
    }

    if (rateLimitStatus.reason === 'global_budget') {
      return c.json(
        {
          error: 'A cota diária global do servidor foi atingida. Tente novamente amanhã ou consulte os guias recomendados.',
          quotaExhausted: true,
          resetAt: rateLimitStatus.resetAt,
        },
        429
      );
    }

    if (rateLimitStatus.reason === 'service_unavailable') {
      return c.json(
        {
          error: 'O serviço de rate limit está temporariamente indisponível.',
        },
        503
      );
    }

    return c.json(
      {
        error: `Você atingiu o limite de ${dailyLimit} consultas ao assistente por hoje. Seu limite será renovado à meia-noite (UTC).`,
        quotaExhausted: true,
        resetAt: rateLimitStatus.resetAt,
      },
      429
    );
  }

  // 6. Query Gemini Assistant with Sanitized Errors
  try {
    const response = await askGeminiAssistant(requestData, {
      apiKey: c.env.GEMINI_API_KEY,
      model: c.env.GEMINI_MODEL || 'gemini-2.5-flash',
    });

    return c.json({
      ...response,
      rateLimit: {
        remaining: Math.max(0, dailyLimit - rateLimitStatus.current),
        limit: dailyLimit,
        resetAt: rateLimitStatus.resetAt,
      },
    });
  } catch (_err) {
    return c.json(
      {
        error: 'Instabilidade temporária ao se comunicar com o assistente.',
        isFallback: true,
      },
      500
    );
  }
});
