# Política de Privacidade — SaveState

**Última atualização:** Outubro de 2026  
**Status:** Rascunho Oficial para Google Play Store  
**URL Pública:** `[A DEFINIR PELO PROPRIETÁRIO]`  
**Contato de Suporte:** `[A DEFINIR PELO PROPRIETÁRIO]`

---

## 1. Visão Geral e Princípio Offline-First

O **SaveState** é um aplicativo voltado para gerenciamento pessoal de backlog de jogos e assistência em jogatinas. Nossa arquitetura prioriza a privacidade e a autonomia do usuário:

- **Armazenamento Local:** Todos os dados da sua biblioteca pessoal — incluindo títulos cadastrados, plataformas, edições físicas/digitais, histórico de sessões jogadas, notas para o futuro, metas, checklists e configurações de dispositivos — são armazenados exclusivamente no banco de dados SQLite local do seu aparelho celular.
- **Sem Cadastro Obrigatório:** O aplicativo não exige criação de conta, login social ou autenticação para ser utilizado.
- **Portabilidade Total:** Você pode exportar uma cópia integral dos seus dados a qualquer momento em formatos abertos (JSON e CSV/Excel).

---

## 2. Processamento de Dados pelo Assistente de IA (Google Gemini)

O SaveState disponibiliza um assistente gamer opcional para esclarecimento de dúvidas e análise visual de quebra-cabeças e telas de jogos:

- **Envio Voluntário:** O assistente só processa informações quando você envia ativamente uma mensagem em texto ou anexa uma foto/captura de tela na aba "Assistente".
- **Transmissão Segura:** As requisições são transmitidas de ponta a ponta via protocolo seguro criptografado (HTTPS / TLS 1.3) através de um backend proxy no Cloudflare Workers para a API do Google Gemini.
- **Processamento Efêmero:** O texto da pergunta, o contexto imediato do jogo e a imagem enviada são utilizados estritamente durante o tempo necessário para gerar a resposta. **O SaveState não armazena suas imagens ou perguntas em nenhum banco de dados remoto.**
- **Metadados e Privacidade de Imagens:** Fotos capturadas ou selecionadas da galeria têm metadados sensíveis (como localização EXIF) removidos e são redimensionadas antes do envio.
- **Modo Offline e Alternativas:** Caso não haja conexão ou você prefira não usar inteligência artificial, o aplicativo fornece links diretos para guias e detonados públicos da comunidade (GameFAQs, Steam Guides, YouTube e wikis).

---

## 3. Integrações de Plataformas (Steam e RetroAchievements)

O aplicativo oferece importação opcional de bibliotecas públicas e registros de jogos:

- **Comunidade Steam:** A consulta busca apenas os metadados e tempos jogados de perfis com "Detalhes dos Jogos" publicamente acessíveis. Não solicitamos sua senha nem temos acesso a dados de pagamento.
- **RetroAchievements:** Ao importar jogos completados, a Web API Key fornecida por você é transmitida de forma segura e efêmera para consultar a API oficial do RetroAchievements.org. **A sua chave não é armazenada nem registrada em logs no servidor do SaveState.**

---

## 4. Retenção e Exclusão de Dados

- **Controle pelo Usuário:** Você pode editar ou excluir qualquer jogo, sessão ou anotação diretamente pela interface do aplicativo a qualquer instante.
- **Exclusão Completa:** Ao desinstalar o aplicativo do dispositivo Android, o banco de dados SQLite local e todos os arquivos em cache são completamente removidos pelo sistema operacional.

---

## 5. Permissões Solicitadas no Android

- **Câmera (`android.permission.CAMERA`):** Solicitada apenas se você escolher fotografar a tela do jogo ou TV diretamente pelo assistente.
- **Galeria de Imagens (`android.permission.READ_MEDIA_IMAGES`):** Solicitada apenas se você escolher carregar uma captura de tela da galeria para o assistente ou capa de jogo.

Nenhuma permissão em segundo plano, rastreamento de localização ou acesso a contatos é solicitada ou utilizada.

---

## 6. Contato e Responsável

Para dúvidas sobre esta política ou suporte ao aplicativo:
- **E-mail de Suporte:** `[PENDENTE: Inserir e-mail oficial de suporte do proprietário]`
- **Repositório do Projeto:** `https://github.com/rlima-gif/savestate`
