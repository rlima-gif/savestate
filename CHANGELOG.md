# Changelog — SaveState

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

## [0.1.0] - 2026-10-12

### Adicionado
- **Monorepo e Estrutura:**
  - Configuração do monorepo pnpm com workspaces `packages/shared`, `apps/api` e `apps/mobile`.
  - Configuração de CI com GitHub Actions (`ci.yml`, `build-android.yml`, `deploy-api.yml`).
- **Pacote Compartilhado (`@savestate/shared`):**
  - Entidades de domínio tipadas: `CanonicalGame`, `OwnedCopy`, `Playthrough`, `Session`, `ChecklistItem`, `DeviceRecord`.
  - Schemas de validação de runtime em Zod.
  - Motor transparente de recomendações de próximos jogos ponderado por status, prioridade, tempo disponível e vencimento de assinaturas.
  - Tradutores de backup para JSON versionado e planilhas CSV com UTF-8 BOM.
  - Normalizadores para importação da Steam e RetroAchievements.
  - Prompts do assistente em Português do Brasil com guardrails de segurança e níveis de spoiler.
- **Backend Cloudflare Workers (`@savestate/api`):**
  - API REST desenvolvida em Hono com CORS e endpoint de saúde (`/health`).
  - Migrações Cloudflare D1 para limites de abuso (Rate Limiting), cache de catálogo e pontos de sincronização.
  - Adaptador de catálogo com suporte a RAWG e catálogo offline de demonstração com jogos populares.
  - Rota de assistente multimodal integrando Google Gemini (`gemini-3.5-flash-lite`) com suporte a texto e imagem.
  - Tratamento gracioso de esgotamento de cotas de IA e limites diários de requisição.
- **Aplicativo Mobile Android (`@savestate/mobile`):**
  - App nativo Expo com Expo Router em Português do Brasil.
  - Banco de dados local SQLite (`expo-sqlite`) com migrações e repositórios desacoplados.
  - Tela **Biblioteca** com filtros de status (Backlog, Jogando, Pausado, Zerado, 100%, Abandonado), busca e alternância entre Lista e Grade.
  - Tela **Continuar Jogando** com destaque da campanha ativa, capítulo, próximo objetivo, nota para o eu do futuro e cronômetro persistente baseado em timestamp.
  - Tela **Descobrir** com busca de catálogo e recomendações personalizadas por tempo de sessão.
  - Tela **Assistente Gamer** com suporte a fotos da câmera, capturas de tela da galeria, chat interativo e progressão de dicas.
  - Tela **Ajustes** com estatísticas de jogatina, exportação de backup JSON/CSV com compartilhamento no Android, e cadastro de dispositivos de hardware.
  - Configuração de build para Preview APK e Production AAB (Google Play Store).
