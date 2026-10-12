# Preparação para Publicação na Google Play Store — SaveState

Este documento reúne todas as informações, textos em Português do Brasil, declarações de segurança de dados e políticas de IA generativa necessárias para a submissão do SaveState na Google Play Console.

---

## 📱 Metadados da Ficha Técnica da Loja

- **Nome do Aplicativo:** `SaveState — Backlog & Assistente Gamer`
- **Nome Curto alternativo:** `SaveState: Backlog de Jogos`
- **ID do Pacote (Application ID):** `com.savestate.app`
- **ID de Pré-visualização (Preview ID):** `com.savestate.app.preview`
- **Categoria:** Entretenimento / Jogos (Ferramentas de Jogos)
- **Classificação Indicativa Recomendada:** Livre / 10+ (Ferramenta de organização)
- **Versão Alvo do Android (Target SDK):** `targetSdkVersion: 35` (Android 15) — em conformidade com as diretrizes do Google Play Console para 2026.
- **Ícone do Aplicativo:** 1024x1024 PNG de alta resolução gerado em `apps/mobile/assets/icon.png`, `adaptive-icon.png` e `splash-icon.png`.
- **Contato do Desenvolvedor:** Deve ser preenchido pelo proprietário na Play Console com seu e-mail de suporte real e URL do site/política de privacidade.

### Descrição Curta (Máx. 80 caracteres)
> Organize seus jogos, nunca esqueça onde parou e tire dúvidas com IA gamer.

### Descrição Completa (Pt-BR)
```
SaveState é o aplicativo definitivo para jogadores que querem organizar seu backlog, acompanhar o progresso das suas campanhas e superar qualquer desafio com a ajuda de um assistente de IA focado em games.

PRINCIPAIS RECURSOS:

🎮 BIBLIOTECA COMPLETA E OFFLINE-FIRST
- Organize seus jogos por status: Backlog, Jogando, Pausado, Zerado, 100% e Abandonado.
- Separe suas mídias físicas, jogos digitais, assinaturas (Game Pass, PS Plus) e jogos emprestados.
- Visualização em lista detalhada ou grade com capas em alta resolução.
- Funciona 100% offline: seus dados ficam salvos com segurança no seu celular.

🔥 CONTINUAR JOGANDO & "NOTA PARA O MEU EU DO FUTURO"
- Veja em destaque exatamente onde você parou: capítulo atual e próximo objetivo.
- Deixe recados para você mesmo lembrar o que estava fazendo ao retornar semanas depois.
- Cronômetro de sessão inteligente: registre seu tempo jogado sem gastar bateria em segundo plano.

💡 ASSISTENTE GAMER ESPECIALIZADO COM VISÃO COMPUTACIONAL
- Envie perguntas em texto ou fotografe a tela da sua TV/monitor.
- Identifique itens, rotas, mecânicas de chefes e soluções de puzzles.
- Escolha o nível de ajuda que deseja: Dica Leve (sem spoilers), Dica Detalhada ou Solução Completa.
- Sem trapaça na história: o assistente respeita suas preferências de spoilers.

✨ O QUE JOGAR A SEGUIR?
- Recomendações inteligentes e transparentes baseadas no tempo que você tem disponível para jogar agora, prioridade no backlog e prazos de encerramento de assinaturas.

📋 CHECKLISTS DE METAS E CONTEÚDOS PERDÍVEIS
- Registre missões secundárias, colecionáveis e chefes opcionais.
- Alertas de itens perdíveis (missables) e pontos de não retorno da história.

🛠️ DISPOSITIVOS E CONFIGURAÇÕES DE HARDWARE
- Guarde presets gráficos, metas de FPS e notas de save files para seu Steam Deck, PC, consoles e portáteis.

🔒 SEUS DADOS SÃO SEUS
- Exporte backups completos em JSON ou planilhas CSV com um clique.
- Sem necessidade de criar conta obrigatória.
```

---

## 🛡️ Formulário de Segurança dos Dados (Data Safety)

| Pergunta da Play Store | Declaração do SaveState | Justificativa |
|---|---|---|
| **O app coleta dados do usuário?** | Apenas quando o usuário aciona o assistente de IA. | Fotos/imagens enviadas pelo usuário para análise visual de jogos. |
| **Os dados são compartilhados com terceiros?** | Sim, estritamente para o processamento de IA. | O texto da pergunta e a imagem são transmitidos de forma efêmera para o Google Gemini API via Cloudflare. |
| **Os dados são criptografados em trânsito?** | Sim. | Todas as transmissões usam HTTPS/TLS 1.3. |
| **Os dados são armazenados permanentemente?** | Não. | Imagens e perguntas não são mantidas em bancos de dados remotos após a resposta da IA. |
| **O usuário pode solicitar a exclusão de dados?** | Sim. | Todos os dados residem localmente e podem ser apagados pelo app ou desinstalando-o. |

---

## 🤖 Declaração de Conteúdo de IA Generativa da Google Play

O SaveState utiliza a API do Google Gemini como mecanismo do assistente e cumpre integralmente os requisitos da política de IA generativa da Play Store:

1. **Mecanismo de Denúncia e Feedback:** O chat do assistente possui indicação de respostas geradas por IA e links para guias comunitários verificados caso a resposta não seja satisfatória.
2. **Prevenção de Conteúdo Nocivo:** O prompt do sistema no backend restringe estritamente o assistente ao domínio de videogames e rejeita qualquer solicitação fora de contexto ou nociva.
3. **Isolamento de Prompt Injection:** Imagens enviadas contendo texto malicioso são categorizadas como dados não confiáveis para proteger a integridade do assistente.
4. **Alerta de Alucinações:** O aplicativo inclui advertência explícita aos usuários de que respostas de inteligência artificial podem conter imprecisões e oferece links diretos de verificação para fontes como GameFAQs, Steam Guides e wikis oficiais.
