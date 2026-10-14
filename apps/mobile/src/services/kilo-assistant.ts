import {
  ASSISTANT_SYSTEM_INSTRUCTION,
  AssistantChatRequest,
  AssistantChatResponse,
  buildAssistantPrompt,
} from '@savestate/shared';

const KILO_CHAT_COMPLETIONS_URL = 'https://api.kilo.ai/api/gateway/chat/completions';
const DEFAULT_FREE_MULTIMODAL_MODEL = 'openrouter/free';
const REQUEST_TIMEOUT_MS = 45000;
const MAX_IMAGE_BASE64_LENGTH = 5_600_000; // approximately 4 MB before base64 encoding

type KiloCompletion = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
      // Some reasoning models return a separate `reasoning` field. It is intentionally ignored.
      reasoning?: unknown;
    };
  }>;
};
type KiloMessageContent = string | Array<{ type?: string; text?: string }> | null | undefined;

function getTextContent(content: KiloMessageContent): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part && typeof part.text === 'string')
    .map((part) => part.text!.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function getProviderError(status: number): string {
  if (status === 429) return 'A IA gratuita está com a cota temporariamente esgotada. Tente de novo mais tarde ou consulte um guia.';
  if (status === 413) return 'A imagem ficou grande demais para análise. Escolha uma imagem menor e tente novamente.';
  if (status === 401 || status === 403) return 'O acesso anônimo ao modelo gratuito está indisponível no momento.';
  if (status >= 500) return 'O serviço gratuito de IA está instável. Tente novamente mais tarde.';
  return `Não foi possível consultar o modelo gratuito (HTTP ${status}).`;
}

export async function askKiloAssistant(
  request: AssistantChatRequest,
  fetchImpl: typeof fetch = fetch
): Promise<AssistantChatResponse> {
  if (request.imageBase64 && request.imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new Error('A imagem ficou grande demais para análise. Escolha uma imagem menor e tente novamente.');
  }

  const userText = buildAssistantPrompt(
    request.message,
    request.context,
    Boolean(request.imageBase64)
  );
  const userContent = request.imageBase64
    ? [
        { type: 'text', text: userText },
        {
          type: 'image_url',
          image_url: {
            url: `data:${request.imageMimeType || 'image/jpeg'};base64,${request.imageBase64}`,
          },
        },
      ]
    : userText;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(KILO_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: process.env.EXPO_PUBLIC_KILO_MODEL || DEFAULT_FREE_MULTIMODAL_MODEL,
        messages: [
          { role: 'system', content: ASSISTANT_SYSTEM_INSTRUCTION },
          ...(request.history || []),
          { role: 'user', content: userContent },
        ],
        max_tokens: 700,
        temperature: 0.35,
        stream: false,
      }),
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('A análise da imagem ou pergunta demorou demais. Tente novamente.');
    }
    throw new Error('Sem conexão com o serviço gratuito de IA. Verifique a internet e tente novamente.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(getProviderError(response.status));
  }

  let payload: KiloCompletion;
  try {
    payload = await response.json() as KiloCompletion;
  } catch {
    throw new Error('O serviço gratuito de IA retornou uma resposta inválida. Tente novamente.');
  }

  const answer = getTextContent(payload.choices?.[0]?.message?.content);
  if (!answer) {
    throw new Error('O modelo não retornou uma resposta de texto. Tente novamente ou consulte um guia.');
  }

  return {
    answer,
    hintTier: request.context.hintTier,
    externalSearchLinks: [],
  };
}

export function isKiloAssistantEnabled(): boolean {
  // Kilo's anonymous free endpoint is the default; set the public flag to "false" to use the Worker.
  return process.env.EXPO_PUBLIC_KILO_ASSISTANT_ENABLED !== 'false';
}
