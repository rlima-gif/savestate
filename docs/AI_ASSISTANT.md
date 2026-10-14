# Arquitetura e Engenharia do Assistente Gamer com IA — SaveState

Este documento detalha o funcionamento, engenharia de prompt, tratamento de imagens, controle de custos e resiliência do assistente gamer multimodal do SaveState.

---

## 🧠 1. Seleção de Modelos e Provedor

O app usa como experimento o endpoint anônimo da **Kilo AI Gateway**, sem chave no APK nem login do jogador:

- **Modelo inicial:** `openrouter/free`, roteador gratuito com suporte atual a texto e imagem. O catálogo e os provedores podem mudar; nenhum modelo grátis é garantido permanentemente.
- **Chamada:** feita diretamente pelo Android para não concentrar todos os jogadores no mesmo IP de saída do Cloudflare Worker. O app não envia `Authorization` nem segredo.
- **Alternativa:** defina `EXPO_PUBLIC_KILO_ASSISTANT_ENABLED=false` no build para voltar ao endpoint existente do Worker. Esse caminho usa Gemini e depende da configuração `GEMINI_API_KEY` no Cloudflare; não é um fallback automático para evitar custo surpresa.
- **Modelo selecionado:** `EXPO_PUBLIC_KILO_MODEL` troca o ID usado pelo gateway. Para o fluxo sem credencial, mantenha-o em um modelo gratuito.

---

## 📷 2. Fluxo Multimodal (Visão + Texto)

```mermaid
sequenceDiagram
    participant User as Jogador (Android)
    participant Picker as ImagePicker Service
    participant Kilo as Kilo AI Gateway
    participant Model as Free multimodal model router

    User->>Picker: Tira Foto da TV ou Escolhe Screenshot
    Picker->>Picker: Recorta (Crop), comprime (70%) e remove metadados EXIF
    User->>Kilo: Envia pergunta + contexto + imagem opcional
    Kilo->>Model: Roteia a chamada gratuita
    Model-->>Kilo: Resposta de texto
    Kilo-->>User: Retorna a resposta; o app ignora campos de raciocínio interno
```

---

## 🚦 3. Níveis de Dica e Controle de Spoilers

O assistente adota o conceito de **Progressão Escalonada de Dicas**:

1. **`small_hint` (Dica Leve):**
   - Fornece apenas uma pista contextual ou direção no mapa (ex: *"Dê uma olhada com atenção nas paredes rachadas perto da fonte no salão principal"*).
   - Não revela o desfecho do mistério nem soluções diretas.
2. **`detailed_hint` (Dica Detalhada):**
   - Explica a mecânica do quebra-cabeça ou fraqueza do chefe (ex: *"O chefe é invulnerável enquanto o escudo de fogo estiver ativo; você precisa usar flechas de gelo nos cristais do teto para extinguir as chamas"*).
3. **`full_solution` (Solução Completa):**
   - Roteiro passo a passo direto para vencer o obstáculo. Se envolver revelações importantes da trama, emite um alerta prévio de spoiler.

---

## 💰 4. Custos, limites e privacidade

O endpoint anônimo da Kilo aceita modelos gratuitos e documenta limite de 200 chamadas por hora por IP. Provedores/modelos individuais podem impor limites menores; testes já encontraram respostas 429 mesmo antes desse teto. A capacidade e a lista de modelos podem mudar sem aviso. Por isso, esta integração serve para validar o produto e não é uma garantia de serviço grátis para muitos usuários. Chamadas diretas reduzem o compartilhamento do IP do Worker, mas jogadores em redes móveis ou Wi-Fi compartilhado ainda podem dividir IP.

O app mostra um aviso de que mensagens e imagens são enviadas à Kilo e ao modelo escolhido pelo roteador. Não envie dados pessoais ou conteúdo privado nas imagens. O provedor roteado recebe os dados necessários para gerar a resposta. A cota grátis esgotada produz uma mensagem recuperável; o app não tenta o Gemini automaticamente. Para operar com volume e disponibilidade previsível, será preciso contratar capacidade, hospedar modelo próprio ou adicionar uma cota controlada por usuário autenticado.

---

## 🛡️ 5. Defesas contra Abuso e Falhas

- **Proteção contra Injeção de Prompt (Prompt Injection):** Instruções maliciosas embutidas em capturas de tela (como textos forjados de menu dizendo *"ignore as instruções anteriores"*) são neutralizadas pela instrução de sistema que trata o texto em imagens como conteúdo não confiável.
- **Rate limiting no modo atual:** o gateway Kilo aplica limite anônimo por IP, e o provedor roteado pode limitar ainda mais. O app não tenta repetir chamadas automaticamente.
- **Alternativa Cloudflare:** se `EXPO_PUBLIC_KILO_ASSISTANT_ENABLED=false`, o Worker aplica seu limite diário no D1 (`AI_DAILY_RATE_LIMIT`) e, ao esgotar a cota, retorna links de guias externos.
- **Degradação no modo Kilo:** falhas e HTTP 429 viram uma mensagem legível com link de busca no YouTube; não há fallback silencioso para o Gemini.
