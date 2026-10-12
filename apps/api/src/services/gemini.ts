import {
  AssistantChatRequest,
  AssistantChatResponse,
  ASSISTANT_SYSTEM_INSTRUCTION,
  buildAssistantPrompt,
} from '@savestate/shared';

export interface GeminiServiceOptions {
  apiKey?: string;
  model?: string;
}

export function generateExternalSearchLinks(gameTitle: string, query: string) {
  const cleanTitle = encodeURIComponent(gameTitle.trim());
  const cleanQuery = encodeURIComponent(query.trim());

  return [
    {
      title: `Buscar no GameFAQs (${gameTitle})`,
      url: `https://gamefaqs.gamespot.com/search?game=${cleanTitle}`,
      source: 'gamefaqs' as const,
    },
    {
      title: `Guias da Comunidade Steam (${gameTitle})`,
      url: `https://steamcommunity.com/app/search/?term=${cleanTitle}`,
      source: 'steam_guide' as const,
    },
    {
      title: `Vídeo detonado no YouTube`,
      url: `https://www.youtube.com/results?search_query=${cleanTitle}+detonado+${cleanQuery}`,
      source: 'youtube' as const,
    },
    {
      title: `Wiki / Fandom do Jogo`,
      url: `https://www.google.com/search?q=${cleanTitle}+wiki+${cleanQuery}`,
      source: 'wiki' as const,
    },
  ];
}

export async function askGeminiAssistant(
  req: AssistantChatRequest,
  options: GeminiServiceOptions = {}
): Promise<AssistantChatResponse> {
  const modelName = options.model || 'gemini-2.5-flash';
  const apiKey = options.apiKey;
  const guideLinks = generateExternalSearchLinks(req.context.gameTitle, req.message);

  // Fallback when API key is not configured
  if (!apiKey) {
    return {
      answer: `[Assistente de IA Indisponível - Chave não configurada]\n\nA inferência em tempo real com visão e texto do Google Gemini está temporariamente indisponível porque a chave \`GEMINI_API_KEY\` não foi configurada no ambiente Cloudflare Workers.\n\nContexto do jogo: **${req.context.gameTitle}** (${req.context.currentObjective || req.context.currentChapter || 'Campanha principal'}).\n\nVocê pode consultar os links externos de detonados e guias da comunidade abaixo:`,
      hintTier: req.context.hintTier,
      isFallback: true,
      externalSearchLinks: guideLinks,
    };
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const promptText = buildAssistantPrompt(req.message, req.context, Boolean(req.imageBase64));

    const parts: any[] = [{ text: promptText }];

    // If an image was supplied, attach inline data
    if (req.imageBase64) {
      parts.push({
        inline_data: {
          mime_type: req.imageMimeType || 'image/jpeg',
          data: req.imageBase64,
        },
      });
    }

    const contents = [
      {
        role: 'user',
        parts,
      },
    ];

    const body = {
      system_instruction: {
        parts: [{ text: ASSISTANT_SYSTEM_INSTRUCTION }],
      },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (response.status === 429) {
      return {
        answer: `A cota da IA do assistente atingiu o limite temporário no momento.\n\nVocê ainda pode avançar no jogo usando os links da comunidade e guias oficiais listados abaixo:`,
        hintTier: req.context.hintTier,
        quotaExhausted: true,
        isFallback: true,
        externalSearchLinks: guideLinks,
      };
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errText);
      return {
        answer: `O serviço do assistente encontrou uma instabilidade temporária. Consulte os guias da comunidade abaixo ou tente reenviar sua pergunta em instantes.`,
        hintTier: req.context.hintTier,
        isFallback: true,
        externalSearchLinks: guideLinks,
      };
    }

    const data = (await response.json()) as any;
    const candidate = data.candidates?.[0];
    const answerText =
      candidate?.content?.parts?.[0]?.text ||
      'Não foi possível interpretar a resposta no momento. Tente reformular sua pergunta ou use os guias abaixo.';

    return {
      answer: answerText,
      hintTier: req.context.hintTier,
      externalSearchLinks: guideLinks,
    };
  } catch (err: any) {
    console.error('Gemini call failed:', err);
    return {
      answer: `Houve uma falha de conexão com o assistente (${err.message || 'tempo limite'}). Suas anotações locais continuam salvas. Use os links de detonado abaixo:`,
      hintTier: req.context.hintTier,
      isFallback: true,
      externalSearchLinks: guideLinks,
    };
  }
}
