# SaveState — Backlog & Assistente Gamer

> **O aplicativo definitivo de backlog e assistente inteligente para jogadores.**  
> Aplicativo nativo Android desenvolvido com React Native (Expo SDK 52), persistência local offline-first com SQLite, e assistente com IA multimodal (texto e visão) potencializado pela API Google Gemini e Cloudflare Workers.

---

## 🎮 Funcionalidades Principais

- **Biblioteca Offline-First:**
  - Gerencie seus jogos organizados por status: *Backlog*, *Jogando*, *Pausado*, *Zerado*, *100% (Mestre)* e *Abandonado*.
  - Separação estrita entre posse do jogo (Mídia Física, Digital, Assinatura, Emprestado) e status de gameplay.
  - Modos de visualização em Lista ou Grade (Grid) com capas de alta qualidade.
  - Filtros rápidos por status e busca instantânea por título e gênero.

- **Continuar Jogando ("Checkpoint"):**
  - Card em destaque na tela inicial com o jogo ativo ou pausado.
  - Registro de capítulo/missão atual e próximo objetivo imediato.
  - **"Nota para o Meu Eu do Futuro":** anotações para lembrar exatamente o que fazer ao retornar ao jogo semanas ou meses depois.
  - **Cronômetro de Sessão Resiliente:** calcula o tempo decorrido com base em carimbo de data/hora (timestamp) no SQLite, sobrevivendo ao fechamento do aplicativo e reinicialização do celular sem gastar bateria com serviços contínuos em segundo plano.
  - Proteção contra cronômetros esquecidos rodando por mais de 12 horas.

- **Assistente Gamer Especializado (Google Gemini):**
  - Suporte a perguntas em texto, fotos capturadas na hora pela câmera ou capturas de tela (screenshots) da galeria.
  - Recorte (crop), compressão e remoção automática de metadados antes do envio.
  - **Progressão de Dicas:**
    - 💡 *Dica Leve:* Pequeno empurrãozinho ou direção geral sem estragar surpresas.
    - 🔍 *Dica Detalhada:* Explicação da mecânica ou próximo passo.
    - 🏆 *Solução Completa:* Passo a passo detalhado para superar o puzzle ou chefe.
    - 🛡️ *Filtro de Spoilers:* Respeita o nível de spoiler configurado pelo jogador.
  - **Fallback Inteligente:** Se a cota da IA for atingida ou não houver internet, o app oferece automaticamente links diretos de detonados no YouTube, GameFAQs, Guias da Steam e Wikis.

- **Recomendações Transparentes baseadas em Regras ("O Que Jogar a Seguir?"):**
  - Algoritmo baseado em pontuações transparentes (sem IA "caixa-preta"), ponderando: prioridade no backlog, proximidade do término de assinaturas temporárias (Game Pass, PS Plus), adequação do tempo da sessão (partidas rápidas de &lt;30m, sessões médias ou imersão longa) e dados estimados de duração do HowLongToBeat / RAWG.

- **Checklists e Metas Pessoais por Campanha:**
  - Crie metas personalizadas: missões secundárias, colecionáveis, chefes opcionais, finais alternativos e conquistas.
  - Alerta de **Conteúdo Perdível (Missable)** e indicação de Pontos de Não Retorno.

- **Hardware, Emuladores e Dispositivos:**
  - Registre presets gráficos, resoluções, metas de FPS e pastas de save files para seus aparelhos (Steam Deck, Legion Go, PC Gamer, Nintendo Switch, Portáteis Retrô).

- **Backup e Restauração Zero-Lockin:**
  - Exportação completa em formato JSON relacional versionado.
  - Exportação em planilha CSV (com UTF-8 BOM pronto para Excel).
  - Compartilhamento nativo via Android Share Sheet.

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **App Mobile** | React Native, Expo SDK 52, Expo Router | TypeScript estrito, New Architecture habilitada |
| **Banco Local** | Expo SQLite (`expo-sqlite`) | Offline-first, chaves estrangeiras, migrações versionadas |
| **Backend API** | Cloudflare Workers com Hono v4 | Execução serverless global com latência ultrabaixa |
| **Banco Cloud** | Cloudflare D1 (SQLite) | Controle de limites diários (Rate Limiting) e cache de catálogo |
| **Motor de IA** | Google Gemini (`gemini-3.5-flash-lite` / `gemini-3.8-flash`) | Visão e texto, instruções em Português do Brasil |
| **Catálogo** | Adaptador RAWG / IGDB | Normalizado, paginação e fallback offline com mock de alta fidelidade |
| **CI/CD** | GitHub Actions | Lint, Typecheck, Testes, Build de APK e AAB Android |

---

## 📂 Estrutura do Monorepo

```
savestate/
├── apps/
│   ├── api/             # Cloudflare Workers (Hono, D1, Gemini & Catalog Service)
│   └── mobile/          # React Native Expo Android App (Telas, SQLite, Timer, Câmera)
├── packages/
│   └── shared/          # Modelos de domínio, Schemas Zod, Motor de Recomendações, Backups
├── docs/                # Documentação técnica de arquitetura, testes, publicação e IA
├── .github/workflows/   # CI (Lint, Test, Typecheck) e Build Android (APK & AAB)
└── package.json         # Workspace pnpm
```

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- Node.js 20+
- pnpm 12+ (`npm install -g pnpm`)

### 2. Instalação
```bash
git clone <repo-url> savestate
cd savestate
pnpm install
pnpm build
```

### 3. Rodar os Testes Unitários
```bash
pnpm test
```

### 4. Iniciar o Backend Local (Cloudflare Workers)
```bash
# Copie o arquivo de exemplo e configure sua chave GEMINI_API_KEY se desejar
cp .env.example .env
pnpm api:dev
```
A API iniciará em `http://localhost:8787`. Você pode testar o endpoint de saúde em `http://localhost:8787/health`.

> 🌐 **Backend Staging Online:** O ambiente de homologação está deployed e funcional no Cloudflare Workers em:  
> **`https://savestate-api-staging.safeloot.workers.dev`**  
> Teste o health check ao vivo: `https://savestate-api-staging.safeloot.workers.dev/health`

### 5. Iniciar o App Mobile (Expo)
```bash
pnpm mobile:start
```
Para testar o empacotamento completo de bytecode Hermes Android:
```bash
cd apps/mobile
npx expo export --platform android
```

---

## 📦 Builds para Android (APK e AAB)

- **Preview APK (Instalável diretamente em qualquer celular Android):**
  ```bash
  cd apps/mobile
  eas build --platform android --profile preview
  ```
  Ou acione a workflow do GitHub Actions em `.github/workflows/build-android.yml` selecionando a opção `preview-apk`.

- **Production AAB (Pronto para envio à Google Play Store):**
  ```bash
  cd apps/mobile
  eas build --platform android --profile production
  ```
  Ou acione a workflow selecionando `production-aab`.

---

## 🔒 Privacidade e Segurança de Dados

- Todos os seus jogos, anotações de progresso, checklists e configurações de hardware ficam gravados **exclusivamente no armazenamento local do seu aparelho celular**.
- Nenhuma foto ou captura de tela enviada para o assistente é armazenada de forma remota permanente no servidor Cloudflare. A imagem é processada na memória transitória e descartada após a resposta da IA.
- Metadados sensíveis de localização GPS contidos em fotos são removidos no próprio aparelho antes da transmissão.
