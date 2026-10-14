# Guia e Estratégia de Testes — SaveState

Este documento descreve todos os testes automatizados implementados e o roteiro de testes de validação manual recomendados para cada camada da aplicação.

---

## 🧪 Suíte de Testes Automatizados (Vitest)

O monorepo utiliza **Vitest** em todas as camadas de código. Para executar todos os testes:

```bash
pnpm test
```

### 1. Testes de Domínio e Lógica Compartilhada (`packages/shared/tests`)
- **`recommendations.test.ts`:**
  - Ponderação de jogos de alta prioridade em andamento acima de jogos parados.
  - Priorização de jogos em serviços de assinatura com data de expiração próxima (≤ 14 dias).
  - Seleção por adequação de tempo de sessão (`quick_burst` para partidas rápidas vs `deep_dive` para sessões longas).
- **`import-export.test.ts`:**
  - Serialização e desserialização completa de backup JSON (Round-trip) preservando todos os campos e metadados.
  - Exportação de planilhas CSV com delimitador `;`, UTF-8 BOM e escape de aspas duplas.
  - Normalização de payloads da Steam Web API e RetroAchievements.
- **`schemas.test.ts`:**
  - Validação estrita de tipos com Zod para jogos canônicos e status de playthrough permitidos.
  - Rejeição de status inválidos e estruturas corrompidas.

### 2. Testes da API Cloudflare Workers (`apps/api/tests`)
- **`health.test.ts`:**
  - Verifica retorno de status `200 OK`, versão da aplicação e flags de recursos ativos.
- **`catalog.test.ts`:**
  - Limites de parâmetros, ausência segura de credenciais, consulta vazia e fallback.
  - Proibição estrita de dados mock em ambiente de produção/staging.
  - Cache D1, fallback de resultados salvos e limite global IGDB de três chamadas por segundo.
  - `igdb.test.ts`: OAuth server-side, metadados/capas/plataformas, escaping, respostas inválidas e não exposição de secrets.
  - Detalhes de jogos e resposta HTTP 404 para IDs inexistentes.
- **`integrations.test.ts`:**
  - Suporte a SteamID64 de 17 dígitos e vanity URLs personalizadas.
  - Validação de caracteres inválidos no identificador Steam.
  - Garantia de que a Web API Key do RetroAchievements é efêmera e não é gravada no servidor.
- **`assistant.test.ts`:**
  - Rejeição de payloads malformados com HTTP 400.
  - Rejeição de mensagens acima de 2.000 caracteres.
  - Rejeição de formatos de imagem não suportados (permitidos apenas JPEG, PNG e WebP) e imagens acima de 4MB.
  - Comportamento de desativação emergencial com chave mestra (`AI_FEATURE_ENABLED=false`) retornando HTTP 503.
  - Teste do rate limit atômico via D1 com cláusula `RETURNING` evitando condições de corrida.
  - Fail-safe em produção quando o D1 falha (retorna 503 em vez de bypass em memória).
  - Fallback gracioso com entrega de links para detonados quando a chave do Gemini não está definida.

### 3. Testes do Cliente Mobile (`apps/mobile/tests`)
- **`migrations.test.ts`:**
  - Execução de migrações em banco novo (versão 0 para última versão).
  - Detecção e atualização de bancos legados criados com a V1 sem perda de dados.
  - Preservação estrita de jogos, playthroughs e checklists pré-existentes.
  - Idempotência: execuções repetidas não disparam erros ou duplicam dados.
- **`offline-crud.test.ts`:**
  - Ciclo de vida completo offline: criação de jogos, cópias, playthroughs, notas, sessões e checklists.
  - Persistência e recuperação de estado do cronômetro ativo (`active_timer`).
  - Exportação e importação de backups JSON com validação de formato.
- **`api-service.test.ts`:**
  - Tratamento de busca no catálogo online com sucesso e com resultados vazios.
  - Tratamento gracioso de catálogo indisponível, JSON malformado e falhas de rede sem quebrar telas.
  - Tratamento de timeout de rede e JSON malformado.
  - Suporte a tentativas repetidas (retry) após quedas transitórias de conexão.
- **`timer.test.ts`:**
  - Formatação precisa de segundos em strings de relógio (`MM:SS` para menos de 1 hora e `HH:MM:SS` para mais de 1 hora).
- **`sqlite-schema.test.ts`:**
  - Verificação das cláusulas SQL de criação de tabelas e integridade com chaves estrangeiras.

---

## 🔍 Validação de Empacotamento Metro & Compatibilidade Android

1. **Auditoria Expo Doctor:**
   - Comando: `npx expo-doctor` executado em `apps/mobile`.
   - Resultado: **18/18 verificações aprovadas**, confirmando compatibilidade de dependências e ausência de conflitos nativos.
2. **Exportação de Bytecode Hermes Android:**
   - Comando: `npx expo export --platform android` em `apps/mobile`.
   - Resultado: Módulos empacotados com sucesso gerando bundle Hermes compilado (`.hbc`) e assets sem nenhum erro.
3. **Pré-compilação Nativa Android:**
   - Comando: `npx expo prebuild --platform android --no-install`.
   - Resultado: Geração limpa com `targetSdkVersion: 36` (Android 16) e `compileSdkVersion: 36`.
4. **Smoke Tests da API Staging em Produção:**
   - Endpoint: `https://savestate-api-staging.safeloot.workers.dev`.
   - Verificação via internet: `GET /health` (retornou HTTP 200, `d1Connected: true`).
