# Guia de Implantação e Operações — SaveState

Este documento detalha o processo de implantação da API no Cloudflare Workers, aplicação de migrações no Cloudflare D1 e compilação do aplicativo Android.

---

## ☁️ 1. Implantação do Backend (Cloudflare Workers)

### Pré-requisitos
- Conta no Cloudflare
- Chave API do Google AI Studio (`GEMINI_API_KEY`)
- Chave da API RAWG (`RAWG_API_KEY`, opcional)

### Configuração do Cloudflare D1
Crie os bancos de dados D1 para os ambientes de homologação e produção:
```bash
cd apps/api

# Banco de Staging
npx wrangler d1 create savestate-db-staging

# Banco de Produção
npx wrangler d1 create savestate-db-production
```
Copie os `database_id` gerados para o arquivo `apps/api/wrangler.jsonc` nos respectivos blocos de ambiente (`env.staging` e `env.production`).

### Aplicar Migrações de Banco de Dados
```bash
# Localmente (para testes e desenvolvimento)
npx wrangler d1 migrations apply savestate-db --local

# Staging
npx wrangler d1 migrations apply savestate-db-staging --remote --env staging

# Produção
npx wrangler d1 migrations apply savestate-db-production --remote --env production
```

### Configurar Segredos no Cloudflare
```bash
# Staging
npx wrangler secret put GEMINI_API_KEY --env staging
npx wrangler secret put RAWG_API_KEY --env staging

# Produção
npx wrangler secret put GEMINI_API_KEY --env production
npx wrangler secret put RAWG_API_KEY --env production
```

### Deploy da API
```bash
# Deploy em Staging
pnpm --filter @savestate/api deploy:staging

# Deploy em Produção
pnpm --filter @savestate/api deploy
```

---

## 🤖 2. Compilação do Aplicativo Android

O aplicativo Android do SaveState pode ser compilado de duas formas:

### Opção A: Via GitHub Actions (Recomendado)
1. Acesse a aba **Actions** no repositório do GitHub.
2. Selecione a workflow **Android Build (APK & AAB)**.
3. Clique em **Run workflow** e selecione o tipo de compilação desejado:
   - `preview-apk`: Gera o arquivo `.apk` pronto para instalar em qualquer dispositivo Android para testes internos.
   - `production-aab`: Gera o Android App Bundle (`.aab`) otimizado para submissão na Google Play Store.
4. Após o término do job, baixe o artefato gerado na página da execução.

### Opção B: Via EAS Build (Expo Application Services)
```bash
cd apps/mobile

# Preview APK
npx eas build --platform android --profile preview

# Production AAB
npx eas build --platform android --profile production
```

---

## 🔄 3. Procedimentos de Rollback e Recuperação

- **Rollback de Código do Worker:**
  O Cloudflare Workers mantém versões anteriores de cada deploy. Caso ocorra qualquer problema em produção:
  ```bash
  cd apps/api
  npx wrangler rollback [DEPLOYMENT_ID]
  ```
- **Recuperação do Banco D1:**
  O Cloudflare D1 possui suporte a Point-in-Time Recovery e exportação de backups:
  ```bash
  npx wrangler d1 export savestate-db-production --output backup.sql
  ```
- **Modo de Emergência (Kill-Switch da IA):**
  Caso a cota da IA seja atacada ou ocorra algum comportamento imprevisto, o assistente pode ser desativado imediatamente sem necessidade de novo deploy:
  ```bash
  # Altere a variável de ambiente no Cloudflare Dashboard ou via wrangler
  wrangler secret put AI_FEATURE_ENABLED # defina como "false"
  ```
  O aplicativo mobile automaticamente continuará funcionando 100% offline para todas as funções da biblioteca, checklists, sessões e fornecerá links de guias externos.
