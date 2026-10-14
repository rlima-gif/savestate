# Preparação para Publicação na Google Play Store — SaveState

Este documento reúne todas as informações, textos em Português do Brasil, declarações de segurança de dados e políticas de IA generativa necessárias para a submissão do SaveState na Google Play Console.

---

## 📱 Metadados da Ficha Técnica da Loja

- **Nome do Aplicativo:** `SaveState — Backlog & Assistente Gamer`
- **Nome Curto alternativo:** `SaveState: Backlog de Jogos`
- **ID do Pacote (Produção):** `com.savestate.app`
- **ID de Pré-visualização (Preview):** `com.savestate.app.preview`
- **Categoria:** Entretenimento / Ferramentas de Jogos
- **Classificação Indicativa Recomendada:** Livre / 10+ (Ferramenta de organização e anotações)
- **Versão Alvo do Android (Target SDK):** `targetSdkVersion: 36` (Android 16) / `compileSdkVersion: 36` — em conformidade com as diretrizes do Google Play Console para 2026.
- **Ícone do Aplicativo:** 1024x1024 PNG de alta resolução gerado em `apps/mobile/assets/icon.png`, `adaptive-icon.png` e `splash-icon.png`.
- **Política de Privacidade:** Consulte o rascunho em [`docs/PRIVACY_POLICY.md`](./PRIVACY_POLICY.md).
- **Contato do Desenvolvedor:** Deve ser preenchido pelo proprietário na Play Console com seu e-mail de suporte real e URL pública da política de privacidade.

### Descrição Curta (Máx. 80 caracteres)
> Organize seus jogos, nunca esqueça onde parou e tire dúvidas com IA gamer.

### Descrição Completa (Pt-BR)
```
SaveState é o aplicativo definitivo para jogadores que querem organizar seu backlog, acompanhar o progresso das suas campanhas e superar qualquer desafio com a ajuda de um assistente focado em games.

PRINCIPAIS RECURSOS:

🎮 BIBLIOTECA COMPLETA E OFFLINE-FIRST
- Organize seus jogos por status: Backlog, Jogando, Pausado, Zerado, 100% e Abandonado.
- Separe suas mídias físicas, jogos digitais, assinaturas (Game Pass, PS Plus) e jogos emprestados.
- Visualização em lista detalhada ou grade com capas.
- Funciona 100% offline: seus dados ficam salvos com segurança no SQLite local do seu celular.

🔥 CONTINUAR JOGANDO & "NOTA PARA O MEU EU DO FUTURO"
- Veja em destaque exatamente onde você parou: capítulo atual e próximo objetivo.
- Deixe recados para você mesmo lembrar o que estava fazendo ao retornar semanas depois.
- Cronômetro de sessão inteligente com persistência e recuperação após reinicialização do app.

💡 ASSISTENTE GAMER COM VISÃO COMPUTACIONAL E TEXTO
- Envie perguntas em texto ou fotografe a tela da sua TV/monitor.
- Identifique itens, rotas, mecânicas e quebra-cabeças.
- Escolha o nível de ajuda: Dica Leve (sem spoilers), Dica Detalhada ou Solução Completa.
- O assistente respeita suas preferências de spoilers e oferece links diretos para detonados da comunidade (GameFAQs, Steam Guides, YouTube).

✨ RECOMENDAÇÕES TRANSPARENTES
- Algoritmo local que sugere o próximo título com base no seu tempo disponível (sessões rápidas, médias ou imersivas), prioridade e plataforma.

📋 CHECKLISTS DE METAS E CONTEÚDOS PERDÍVEIS
- Registre missões secundárias, colecionáveis e chefes opcionais.
- Alertas de itens perdíveis (missables) e pontos de não retorno da história.

🛠️ DISPOSITIVOS E CONFIGURAÇÕES DE HARDWARE
- Guarde presets gráficos, metas de FPS e notas de save files para seu Steam Deck, PC, consoles e portáteis.

🔒 SEUS DADOS SÃO SEUS
- Exporte backups completos em JSON ou planilhas CSV com um clique.
- Sem necessidade de cadastro ou login obrigatório.
```

---

## 🛡️ Formulário de Segurança dos Dados (Data Safety)

| Pergunta da Play Store | Declaração do SaveState | Detalhes Técnicos |
|---|---|---|
| **O app coleta dados do usuário?** | O usuário envia conteúdo voluntariamente ao usar o assistente. | Pergunta, contexto do jogo e, opcionalmente, foto/captura de tela. A busca do catálogo também envia o título consultado ao backend. |
| **Os dados são compartilhados com terceiros?** | Sim, para processar buscas e respostas. | O catálogo recebe consultas via backend SaveState/IGDB. No build atual, o assistente usa o gateway Kilo e o provedor/modelo roteado por ele; a rota Gemini via Worker é alternativa. Confirmar o provedor real e seus termos antes da ficha final. |
| **Os dados são criptografados em trânsito?** | Sim, via HTTPS. | Declarar protocolos conforme os endpoints e provedores efetivamente usados no release. |
| **O usuário pode solicitar a exclusão de dados?** | Biblioteca local: sim. Conteúdo enviado: depende do terceiro. | O SaveState não persiste conversas no seu D1; a retenção do gateway e do modelo segue os termos deles. Não declarar exclusão imediata até confirmar esses termos. |

---

## 🤖 Declaração de Conteúdo de IA Generativa da Google Play

O assistente do SaveState gera respostas sobre jogos. Antes da submissão, confirme o gateway e o provedor/modelo incluídos no build e revise a política de IA generativa da Play Store:

1. **Identificação Visual Clara:** Respostas geradas por IA são identificadas como tal e contam com links para guias comunitários verificados (Steam Guides, GameFAQs, YouTube).
2. **Prevenção de Abuso & Sanitização:** Verifique os limites realmente aplicados pelo gateway/backend e os limites de tamanho efetivos do app; não use valores presumidos na ficha.
3. **Isolamento de Prompts:** Textos em imagens são tratados como não confiáveis.
4. **Alerta de Alucinações:** O aplicativo inclui advertência explícita aos jogadores de que respostas de inteligência artificial podem conter imprecisões e disponibiliza fontes externas verificadas.

---

## 🔑 Configuração de Assinatura de Release (Proprietário)

Para gerar o AAB de produção assinado para a Play Store:
1. Gere sua keystore de release:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Converta a keystore para Base64:
   ```bash
   base64 -w 0 my-upload-key.keystore # Linux/macOS
   # ou no PowerShell:
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("my-upload-key.keystore"))
   ```
3. Adicione os seguintes Secrets no GitHub (`Settings > Secrets and variables > Actions`):
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
