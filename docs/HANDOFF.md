# Relatório de Transição e Handoff Técnico — SaveState

Este documento foi elaborado para permitir a transição imediata e transparente para qualquer desenvolvedor ou agente de IA que assuma a manutenção ou expansão do SaveState.

---

## 📍 1. Localização e Estado do Projeto

- **Repositório Git:** `https://github.com/rlima-gif/savestate` (público).
- **Estrutura de Monorepo:** pnpm workspaces (`packages/shared`, `apps/api`, `apps/mobile`).
- **Último commit no master verificado em 2026-10-13:** `70371873ba8ec6a7060b4b441228c5bbd3c9deec`.
- **Workflows desse commit:** CI, Build Android e Deploy Staging falharam. Os erros conhecidos são `node:sqlite` indisponível no Node 20 do CI, sintaxe inválida do signingConfig Gradle e comando `wrangler` duplicado no deploy.
- **Validação local no branch de trabalho Codex:** pacote compartilhado, typecheck dos três workspaces, testes e exportação Android passaram após instalar as dependências. O prebuild gerou `compileSdkVersion: 36`, `targetSdkVersion: 36` e `buildToolsVersion: 36.0.0`, com `signingConfig` corrigido.
- **Expo Doctor:** a execução atual passou 15/18 verificações; as três restantes falharam ao acessar endpoints Expo/RN por erro DNS, não por incompatibilidade reportada.
- **Build Android nativo:** ainda não executado localmente; o ambiente não tem Android SDK. O workflow do GitHub precisa ser repetido após enviar as correções.
- **Backend Staging:** há uma URL de staging documentada, mas o deploy do commit mais recente falhou antes de aplicar migrações ou publicar.
- **Produção/Play Store:** nenhum deploy de produção nem publicação foi executado.

---

## ⚙️ 2. Resumo dos Entregáveis Implementados

1. **`packages/shared`:**
   - Tipos completos para Jogos Canônicos, Exemplares em Posse (Owned Copies), Campanhas (Playthroughs), Sessões, Checklists, Dispositivos e Assistente.
   - Schemas Zod de validação runtime.
   - Motor transparente de recomendações ponderado por prioridade, tempo de sessão e vencimento de assinaturas.
   - Sistema de exportação e restauração de backup JSON e planilhas CSV com UTF-8 BOM.
   - Normalizadores de dados da Comunidade Steam (XML público) e RetroAchievements.
   - Templates de prompt em Português do Brasil com proteção anti-spoiler e anti-injeção de prompt.

2. **`apps/api` (Cloudflare Workers + D1):**
   - Roteador Hono com CORS e tratamento global de erros.
   - Endpoint de saúde: `GET /health` (valida conexão com D1).
   - Endpoint de busca de catálogo: `GET /api/catalog/search` e `GET /api/catalog/games/:id` com provedor RAWG, cache D1 e resposta de indisponibilidade explícita quando a chave não existe.
   - Endpoint de assistente com IA: `POST /api/assistant/chat` integrando Google Gemini (`gemini-2.5-flash`) com suporte a texto e visão (fotos e screenshots), limites por IP via D1, chave mestre de interrupção e fallback automático para guias da comunidade.
   - Endpoints de sincronização de biblioteca: `POST /api/integrations/steam/sync` e `POST /api/integrations/retroachievements/sync`.
   - Endpoint de guias: `GET /api/guides/search`.
   - Migração SQL do Cloudflare D1 (`migrations/0001_init.sql`); o workflow de staging do último commit falhou antes de confirmar a aplicação remota.

3. **`apps/mobile` (React Native Expo):**
   - Aplicação nativa com Expo Router e tema de alto contraste em Português do Brasil.
   - Ícones de alta resolução 1024x1024 substituindo placeholders (`icon.png`, `adaptive-icon.png`, `splash-icon.png`).
   - Banco de dados local `expo-sqlite` com repositórios desacoplados (`GameRepository`, `PlaythroughRepository`, `SessionRepository`, `ChecklistRepository`, `DeviceRepository`).
   - Tela **Biblioteca:** Filtros por status (Backlog, Jogando, Pausado, Zerado, 100%, Abandonado), busca e alternância Lista/Grade.
   - Tela **Continuar Jogando:** Destaque da campanha em andamento, capítulo atual, próximo objetivo imediato, "Nota para o Meu Eu do Futuro" e cronômetro de sessão persistente baseado em timestamp com proteção contra esquecimento (&gt;12h).
   - Tela **Descobrir:** Recomendações inteligentes divididas por tempo de sessão (&lt;30m, 1h-2h, &gt;2h) e busca de catálogo com inclusão em 1 clique.
   - Tela **Assistente Gamer:** Interface de chat interativa com seleção de nível de dica (Leve, Detalhada, Solução Completa), captura de foto pela câmera, seleção de screenshots na galeria e links para guias externos.
   - Tela **Ajustes:** Estatísticas detalhadas de tempo jogado e títulos zerados, exportação de backup JSON e planilha CSV com compartilhamento no Android, cadastro de dispositivos de hardware e modal de sincronização da Steam e RetroAchievements (`/modal/sync-integrations`).
   - Modais: Cadastro manual de jogos, registro manual de tempo, configuração de aparelhos e sincronização de contas externas.
   - Configuração de build nativa para `targetSdkVersion: 36` (Android 16) em `expo-build-properties`.
   - Perfis de compilação no `eas.json` para Preview APK (`com.savestate.app.preview`) e Production AAB (`com.savestate.app`).

4. **Automações e CI/CD (`.github/workflows`):**
   - `ci.yml`: Validação automática de typecheck, suíte completa de testes, migrações locais do Cloudflare D1, Expo Doctor e exportação Android a cada push ou PR.
   - `build-android.yml`: Workflow para compilar Preview APK e Production AAB via runner Ubuntu com Android SDK e Java 17.
   - `deploy-api.yml`: Deploy automatizado para staging em pushes para `master` ou `staging`, quando há mudanças em `apps/api` ou `packages/shared`.

5. **Documentação Completa:**
   - `README.md`, `AGENTS.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `docs/PLAY_STORE.md`, `docs/AI_ASSISTANT.md`.

---

## 🚀 3. Comandos Essenciais para Continuidade

```bash
# Navegar até o projeto
cd savestate

# Executar todos os testes
pnpm test

# Validação estrita de tipos TypeScript
pnpm -r typecheck

# Iniciar backend local
pnpm api:dev

# Iniciar app mobile Expo
pnpm mobile:start

# Exportar bundle Hermes Android
cd apps/mobile && npx expo export --platform android
```

---

## ⚠️ 4. Estado das Ferramentas Locais & Bloqueios

- **Ambiente Local (Windows Host):** O ambiente do host não possui Java SDK 17+ nem Android SDK (`adb`, `gradle` ausentes no PATH). Por isso, builds nativas locais standalone (`gradlew assembleRelease`) dependem do GitHub Actions ou da instalação do Android Studio.
- **EAS CLI:** O comando `eas build` requer autenticação do desenvolvedor (`eas login`).
- **Repositório Git Remoto:** O projeto já está no GitHub. O branch de correções deste handoff ainda precisa ser integrado e os workflows precisam ser executados novamente.
- **Chaves externas:** RAWG habilita a busca online do catálogo; `GEMINI_API_KEY` habilita respostas de IA. Sem essas chaves, os recursos correspondentes usam seus estados de indisponibilidade/fallback documentados.

---

## 🎯 5. Ações Pendentes para Publicação na Google Play (Ações do Proprietário)

1. **Conta de Desenvolvedor Google Play:** Efetuar o pagamento da taxa única de \$25 da Google Play Console.
2. **Validar as correções:** Integrar o branch de correções após revisão e confirmar CI, build Android e deploy de staging. Nenhuma publicação de produção deve ser inferida desses checks.
3. **Chave de Assinatura (Upload Keystore):** Gerar ou vincular o Keystore de upload no Google Play App Signing via `eas credentials` ou gerá-lo via Android Studio.
4. **Imagens Promocionais:** Capturar screenshots do aplicativo em resolução mínima de 1080x1920 e criar o banner promocional (1024x500).
5. **Hospedar Política de Privacidade:** Publicar o texto de privacidade disponibilizado em `docs/PLAY_STORE.md` em um domínio público (ex: GitHub Pages ou Cloudflare Pages).
6. **Configurar Segredos no Cloudflare:**
   - `cd apps/api && npx wrangler secret put GEMINI_API_KEY`
   - `cd apps/api && npx wrangler secret put RAWG_API_KEY`

