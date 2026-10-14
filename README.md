# SaveState — Backlog & Assistente Gamer

> **O aplicativo definitivo de backlog e assistente inteligente para jogadores.**  
> Aplicativo Android desenvolvido com React Native (Expo SDK 52, Android API 36 / Android 16), persistência local offline-first com SQLite, catálogo IGDB pelo backend Cloudflare e assistente gamer multimodal via gateway configurável.

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

- **Assistente Gamer Especializado (gateway Kilo por padrão):**
  - Suporte a perguntas em texto, fotos capturadas na hora pela câmera ou capturas de tela (screenshots) da galeria.
  - Recorte (crop), compressão e remoção automática de metadados antes do envio.
  - **Progressão de Dicas:**
    - 💡 *Dica Leve:* Pequeno empurrãozinho ou direção geral sem estragar surpresas.
    - 🔍 *Dica Detalhada:* Explicação da mecânica ou próximo passo.
    - 🏆 *Solução Completa:* Passo a passo detalhado para superar o puzzle ou chefe.
    - 🛡️ *Filtro de Spoilers:* Respeita o nível de spoiler configurado pelo jogador.
  - **Fallback Inteligente:** Se a cota da IA for atingida ou não houver internet, o app oferece automaticamente links diretos de detonados no YouTube, GameFAQs, Guias da Comunidade Steam e Wikis.

- **Recomendações Transparentes baseadas em Regras ("O Que Jogar a Seguir?"):**
  - Algoritmo baseado em pontuações transparentes (sem IA "caixa-preta"), ponderando: prioridade no backlog, proximidade do término de assinaturas temporárias (Game Pass, PS Plus) e adequação do tempo da sessão (partidas rápidas de <30m, sessões médias ou imersão longa).

- **Checklists e Metas Pessoais por Campanha:**
  - Crie metas personalizadas: missões secundárias, colecionáveis, chefes opcionais, finais alternativos e conquistas manuais.
  - Alerta de **Conteúdo Perdível (Missable)** e indicação de Pontos de Não Retorno.

- **Hardware, Emuladores e Dispositivos:**
  - Registre presets gráficos, resoluções, metas de FPS e notas de save files para seus aparelhos (Steam Deck, Legion Go, PC Gamer, Nintendo Switch, Portáteis Retrô).

- **Backup e Restauração Zero-Lockin:**
  - Exportação completa em formato JSON relacional versionado.
  - Exportação em planilha CSV (com UTF-8 BOM pronto para Excel).
  - Compartilhamento nativo via Android Share Sheet.

---

## 🔑 O Que Funciona Com e Sem Chaves de API

| Recurso | Offline / serviço externo indisponível | Com provedor online configurado |
|---|---|---|
| **Biblioteca & Backlog** | ✅ Funcionalidade completa (100% offline via SQLite local) | ✅ Funcionalidade completa |
| **Checklists & Sessões** | ✅ Funcionalidade completa (100% offline via SQLite local) | ✅ Funcionalidade completa |
| **Cadastro de Jogos** | ✅ Cadastro manual completo com capas, plataformas e gêneros | ✅ Cadastro manual ou busca no catálogo |
| **Backups JSON / CSV** | ✅ Exportação e importação local completas | ✅ Exportação e importação local completas |
| **Busca Online de Catálogo** | ℹ️ Busca remota pode ficar indisponível; cadastro manual segue disponível | ✅ Busca via IGDB quando o proprietário configura as credenciais privadas do Worker |
| **Assistente Gamer (IA)** | ℹ️ Exibe links de detonados (GameFAQs, Steam Guides, YouTube) | ✅ Inferência multimodal pelo gateway configurado; Gemini via Worker é uma rota alternativa |
| **Importação Steam** | ✅ Funciona sem chave (perfis públicos via SteamID64 ou Vanity ID) | ✅ Funciona sem chave |
| **RetroAchievements** | ℹ️ Requer sua Web API Key pessoal durante a sincronização | ✅ Pré-visualiza e importa jogos concluídos; vincula títulos existentes sem substituir notas/status |

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **App Mobile** | React Native, Expo SDK 52, Expo Router | TypeScript estrito, Target SDK 36 (Android 16) |
| **Banco Local** | Expo SQLite (`expo-sqlite`) | Offline-first, chaves estrangeiras, migrações versionadas (`PRAGMA user_version`) |
| **Backend API** | Cloudflare Workers com Hono v4 | Execução serverless global com latência ultrabaixa |
| **Banco Cloud** | Cloudflare D1 (SQLite) | Rate limiting atômico, cache de catálogo e limite compartilhado do provedor |
| **Motor de IA** | Gateway Kilo (padrão no app); Gemini via Cloudflare Worker (alternativa) | Texto e visão; credenciais de servidor nunca são empacotadas no APK |
| **Catálogo** | IGDB via Twitch OAuth (backend) | Busca multiplataforma, cache D1 e fallback manual offline; nenhum segredo no APK |
| **CI/CD** | GitHub Actions | Typecheck, testes, Expo export, APK Preview e AAB de Produção |

---

## 📂 Estrutura do Monorepo

```
savestate/
├── apps/
│   ├── api/             # Cloudflare Workers (Hono, D1, Gemini alternativo & IGDB Catalog)
│   └── mobile/          # React Native Expo Android App (Telas, SQLite, Timer, Câmera)
├── packages/
│   └── shared/          # Modelos de domínio, Schemas Zod, Motor de Recomendações, Backups
├── docs/                # Documentação técnica de arquitetura, testes, publicação e IA
├── .github/workflows/   # CI (Test, Typecheck, Export) e Build Android (APK & AAB)
└── package.json         # Workspace pnpm
```

---

## 🚀 Como Executar e Testar Localmente

### 1. Pré-requisitos
- Node.js 20+
- pnpm 12+ (`npm install -g pnpm`)

### 2. Instalação
```bash
pnpm install --frozen-lockfile
pnpm build
```

### 3. Rodar os Testes Unitários
```bash
pnpm test
```

### 4. Checagem de Tipos (TypeScript)
```bash
pnpm typecheck
```

### 5. Iniciar o Backend Local (Cloudflare Workers)
```bash
pnpm api:dev
```
A API iniciará em `http://localhost:8787`. Você pode testar o endpoint de saúde em `http://localhost:8787/health`.

> 🌐 **Backend Staging Online:** O ambiente de homologação está deployed e funcional no Cloudflare Workers em:  
> **`https://savestate-api-staging.safeloot.workers.dev`**  
> Teste o health check ao vivo: `https://savestate-api-staging.safeloot.workers.dev/health`

### 6. Iniciar o App Mobile (Expo)
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
  - Acione a workflow do GitHub Actions em `.github/workflows/build-android.yml` selecionando a opção `preview-apk`, ou faça push para o branch `master`.
  - O artefato gerado fica disponível na aba Actions (`savestate-preview-apk`).
  - O aplicativo utiliza o ID de pacote `com.savestate.app.preview` para não colidir com versões de produção.

- **Production AAB (Pronto para envio à Google Play Store):**
  - Acione a workflow selecionando `production-aab` ou envie uma tag de versão (`git tag v0.1.0 && git push origin v0.1.0`).
  - Exige a configuração dos secrets de assinatura de release (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, etc.) conforme documentado em [`docs/PLAY_STORE.md`](./docs/PLAY_STORE.md).

---

## 🔒 Atribuição de Provedores e Licença

- **IGDB:** Metadados fornecidos pela [IGDB](https://www.igdb.com/), com atribuição visível. Uso comercial requer confirmar parceria e direitos de mídia antes da publicação.
- **Steam:** Dados de biblioteca importados da Comunidade Steam sob os termos da Valve Corporation.
- **RetroAchievements:** Registros de jogos completados providos pela API oficial do [RetroAchievements.org](https://retroachievements.org).
- **IA:** o gateway e o provedor/modelo efetivamente usados devem ser informados na política de privacidade e na ficha da Play Store antes do lançamento. A rota Cloudflare/Gemini é opcional.
- **Política de Privacidade:** Consulte o rascunho completo em [`docs/PRIVACY_POLICY.md`](./docs/PRIVACY_POLICY.md).
- **Licença do Repositório:** Decisão pendente de definição pelo proprietário do projeto.
