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

## 2. Busca do Catálogo de Jogos (IGDB)

Quando você busca um jogo, o título digitado é enviado por HTTPS ao backend do SaveState e consultado na IGDB. A biblioteca, status, notas e progresso local não são enviados junto com a busca. O backend mantém resultados de busca em cache por até 6 horas e detalhes por até 7 dias para reduzir chamadas repetidas. O app não exige que você tenha conta IGDB ou Twitch.

O catálogo pode retornar título, plataformas, gêneros, data, avaliação e capa. Os dados e imagens são apresentados com atribuição à IGDB. O uso comercial do provedor e das imagens depende da autorização/termos aplicáveis ao SaveState; estes devem ser confirmados antes da distribuição comercial.

## 3. Processamento de Dados pelo Assistente de IA

O SaveState disponibiliza um assistente gamer opcional para esclarecimento de dúvidas e análise visual de quebra-cabeças e telas de jogos:

- **Envio Voluntário:** O assistente só processa informações quando você envia ativamente uma mensagem em texto ou anexa uma foto/captura de tela na aba "Assistente".
- **Transmissão Segura:** As requisições são enviadas por HTTPS. Na configuração atual do app, o cliente usa o gateway da Kilo AI, que roteia a solicitação ao modelo configurado. O backend Cloudflare/Gemini é uma alternativa de implantação, não um fallback automático.
- **Dados encaminhados:** A pergunta, contexto de jogo e imagem opcional são enviados ao gateway e ao provedor/modelo selecionado para produzir a resposta. O tratamento e a retenção no gateway e no modelo seguem os termos deles; não envie conteúdo pessoal ou privado.
- **Retenção pelo SaveState:** O app não grava as conversas ou imagens no D1 do SaveState. O provedor externo pode aplicar suas próprias regras de retenção.
- **Metadados e Privacidade de Imagens:** Fotos capturadas ou selecionadas da galeria têm metadados sensíveis (como localização EXIF) removidos e são redimensionadas antes do envio.
- **Modo Offline e Alternativas:** Caso não haja conexão ou você prefira não usar inteligência artificial, o aplicativo fornece links diretos para guias e detonados públicos da comunidade (GameFAQs, Steam Guides, YouTube e wikis).

---

## 4. Integrações de Plataformas (Steam e RetroAchievements)

O aplicativo oferece importação opcional de bibliotecas públicas e registros de jogos:

- **Comunidade Steam:** A consulta busca apenas os metadados e tempos jogados de perfis com "Detalhes dos Jogos" publicamente acessíveis. Não solicitamos sua senha nem temos acesso a dados de pagamento.
- **RetroAchievements:** Ao importar jogos completados, a Web API Key fornecida por você é transmitida de forma segura e efêmera para consultar a API oficial do RetroAchievements.org. **A sua chave não é armazenada nem registrada em logs no servidor do SaveState.**

---

## 5. Retenção e Exclusão de Dados

- **Controle pelo Usuário:** Você pode editar ou excluir qualquer jogo, sessão ou anotação diretamente pela interface do aplicativo a qualquer instante.
- **Exclusão Completa:** Ao desinstalar o aplicativo do dispositivo Android, o banco de dados SQLite local e todos os arquivos em cache são completamente removidos pelo sistema operacional.

---

## 6. Permissões Solicitadas no Android

- **Câmera (`android.permission.CAMERA`):** Solicitada apenas se você escolher fotografar a tela do jogo ou TV diretamente pelo assistente.
- **Galeria de Imagens (`android.permission.READ_MEDIA_IMAGES`):** Solicitada apenas se você escolher carregar uma captura de tela da galeria para o assistente ou capa de jogo.

Nenhuma permissão em segundo plano, rastreamento de localização ou acesso a contatos é solicitada ou utilizada.

---

## 7. Contato e Responsável

Para dúvidas sobre esta política ou suporte ao aplicativo:
- **E-mail de Suporte:** `[PENDENTE: Inserir e-mail oficial de suporte do proprietário]`
- **Repositório do Projeto:** `https://github.com/rlima-gif/savestate`
