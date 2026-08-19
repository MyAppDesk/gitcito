---
title: Chat do repositório
category: IA
order: 82
summary: Faça perguntas sobre este repositório, com os arquivos e commits que você fixa como contexto — e deixe que ele proponha ações git que você aprova antes de executarem.
keywords: chat pergunta perguntar assistente contexto anexar fixar arrastar soltar commit arquivo evidência ancorado ia painel ações executar aprovar aprovação automática permitir corrigir erro aviso
---

# Chat do repositório

Algumas perguntas se respondem mais rápido perguntando do que procurando. *Onde
o refresh do token acontece de verdade? O que este commit mudou, em uma frase?
Por que este arquivo existe?* O chat do repositório responde sobre o repositório
aberto e mostra as linhas em que se baseou.

Ele divide a coluna da direita com **Detalhes**: as abas no topo alternam entre
os dois, então o grafo não perde a seleção quando você pergunta algo.

![O chat do repositório com contexto fixado](../../screenshots/repo-chat.webp)

## O que ele lê

Cada resposta é montada em duas passagens. A primeira escolhe um conjunto
pequeno de caminhos e buscas literais na lista de arquivos rastreados do próprio
repositório. A segunda responde usando apenas os trechos trazidos, e só pode
citar esses trechos: um arquivo ou linha inventados são erro de validação, não
uma resposta plausível.

| Incluído | Excluído |
|---|---|
| Arquivos rastreados, como estão na sua árvore de trabalho | Arquivos não rastreados |
| Diffs no stage e fora dele, de arquivos rastreados | Tudo que casa com uma regra de ignore, mesmo rastreado |
| Branch, à frente/atrás e a lista de caminhos alterados | [Arquivos com cara de segredo](security.md), binários, caminhos gerados |

Ler a árvore de trabalho permite falar de mudanças ainda não commitadas. Também
significa que essas mudanças saem da máquina ao perguntar: quem as recebe é o
provedor configurado em [Funções de IA](ai.md).

Uma nuance: com as [propostas de ações](#executando-ações-a-partir-do-chat)
ligadas, os **nomes** dos arquivos não rastreados entram no estado do
repositório — "coloque o arquivo novo no stage" precisa deles — mas o conteúdo
continua nunca sendo lido.

## Fixando contexto

O modelo decide o que ler. Fixar é como você passa por cima disso: o que está
fixado é lido **primeiro** e fica com a maior parte do orçamento de contexto.

Quatro formas de fixar, todas indo para a mesma fileira de chips acima da caixa
de mensagem:

| Faça isto | Você ganha |
|---|---|
| Clique em um chip sugerido | O arquivo aberto no visualizador, ou o commit selecionado no grafo |
| Arraste uma linha da aba **Arquivos** | Aquele arquivo |
| Arraste uma linha do **grafo de commits** | Aquele commit — a mensagem e o diff em blocos |
| **+** → *Escolher um arquivo…*, ou arraste do Finder/Explorador | Qualquer arquivo no disco, inclusive fora do repositório |

Os chips continuam fixados nas perguntas seguintes; o `×` tira um, e limpar a
conversa tira todos. O limite é oito.

Um commit fixado contribui com sua mensagem e até doze blocos de diff. Blocos que
tocam um caminho excluído saem daquele diff, não o commit inteiro.

## Configurações

**Configurações → IA → Chat do repositório**:

| Configuração | O que faz |
|---|---|
| **Faça perguntas sobre o repositório** | Desligado tira a aba, o botão da barra e o alvo do atalho. O resto da IA continua |
| **Modelo do chat** | Um modelo só para o chat. Vazio usa o do perfil: perguntar custa menos que revisar, um menor costuma bastar |
| **Apenas conteúdo commitado** | Responde a partir do último commit em vez da árvore de trabalho: alterações não commitadas nunca saem da máquina |
| **Propor ações git no chat** | Desligado devolve o chat ao modo somente leitura: sem cartões de ações, sem menu de aprovação |
| **Como as ações propostas são executadas** | O modo de aprovação — veja [Modos de aprovação](#modos-de-aprovação). Ações destrutivas confirmam de qualquer jeito |

Com a IA desligada por completo, o chat some junto — nenhum painel oferecendo
resposta quando nada pode responder.

O modelo do chat também pode ser trocado no cabeçalho do próprio painel, ao lado
do nome do provedor — a mesma configuração, sem abrir as Configurações.

O botão de varinha ao lado do título do painel abre o **assistente de
configuração de IA** — um fluxo guiado que gera arquivos de configuração do
assistente (instruções, agentes, hooks) para este repositório. Veja
[Funções de IA](ai.md).

![Configurações do chat do repositório](../../screenshots/settings-repo-chat.webp)

## Trabalhando com mensagens

Mensagens são texto comum. Selecione qualquer parte e copie, ou clique com o
botão direito em um balão: **Copiar** pega a seleção, **Copiar mensagem** a
mensagem inteira — uma resposta é copiada como sua fonte Markdown — e, quando
o clique caiu em um link, **Copiar link** pega o endereço.

Links abrem no seu navegador padrão, nunca dentro do Gitcito — tanto links
Markdown nas respostas quanto endereços `https://` nas suas próprias
mensagens.

Quando uma mensagem menciona uma imagem — um caminho do repositório como
`docs/logo.png`, ou uma URL terminando em uma extensão de imagem — passar o
mouse sobre a menção mostra uma pequena prévia. Caminhos do repositório são
lidos da sua árvore de trabalho; uma menção que não corresponde a uma imagem
legível simplesmente não mostra nada.

![Prévia de imagem ao passar o mouse](../../screenshots/repo-chat-image-hover.webp)

## Executando ações a partir do chat

Peça uma mudança em vez de um fato — *coloque os arquivos markdown no stage,
commite isto como um fix, ponha a saída do build na lista de ignore* — e a
resposta chega com um **cartão de ações**. Uma conversa vazia oferece alguns
pedidos de exemplo como chips abaixo da introdução; clicar em um preenche a
caixa de mensagem, para você editar antes de enviar. O cartão lista os passos
concretos que o assistente
quer dar, uma linha por ação, com os botões **Executar** e **Dispensar**. Nada
no cartão aconteceu ainda; o modelo só pode propor, e cada proposta é conferida
contra a árvore de trabalho antes de você sequer vê-la — uma ação que cita um
arquivo inexistente é rejeitada, não exibida.

![Chat vazio com pedidos de exemplo](../../screenshots/repo-chat-empty.webp)

![Ações propostas no chat](../../screenshots/repo-chat-actions.webp)

O conjunto de ações é fixo: padrões de ignore, stage, unstage, commit, stash, descartar,
branch, checkout, tag. Qualquer coisa além disso — push, pull, reset, rebase,
operações forçadas — é recusada de propósito; o chat vai mandar você usar a
interface dedicada.

### Modos de aprovação

O menu com escudo abaixo da caixa de mensagem (também em **Configurações → IA
→ Chat do repositório**) decide como um cartão executa:

| Modo | Executa |
|---|---|
| **Sempre perguntar** | Nada até você apertar **Executar** no cartão |
| **Executar ações seguras automaticamente** | Propostas feitas só de tarefas reversíveis — stage, unstage, ignore, branch, tag — executam ao chegar; o resto espera o botão |
| **Executar todas as ações automaticamente** | Toda proposta executa ao chegar, exceto as destrutivas |

Uma proposta que **descartaria alterações não commitadas sempre pergunta
antes**, em qualquer modo, e a confirmação nomeia os arquivos que seriam
perdidos. O cartão relata o que de fato aconteceu — quantas ações executaram,
ou o erro que as parou — e o assistente fica sabendo do desfecho, então uma
pergunta seguinte sabe se o plano foi executado ou dispensado.

### Corrigindo erros com o assistente

Quando uma operação git falha e o chat de IA está disponível, o aviso de erro
ganha um botão de brilho: ele abre o chat com a falha colada na caixa de
mensagem, então "por que isso falhou e o que eu faço" é um clique. O rascunho é
editável — nada é enviado até você apertar Enviar.

## O que ele recusa

- **Arquivos com cara de segredo nunca são lidos**, fixados ou não: o chip volta
  marcado como ignorado, com o motivo. Fixar não contorna o
  [mascaramento de segredos](security.md).
- **Binários e arquivos acima de 512 KB** vindos de fora do repositório são
  ignorados do mesmo jeito. Dentro dele valem as regras de sempre.
- **Ele nunca escreve por conta própria.** O modelo não tem ferramentas, só
  texto: uma mudança chega como cartão de proposta, executa apenas sob as
  [suas regras de aprovação](#modos-de-aprovação), e um passo destrutivo sempre
  confirma. Com **Propor ações git no chat** desligado, ele nem propõe.
- **As conversas vivem só na memória.** Cada repositório mantém seu fio; sair do
  Gitcito descarta tudo.

## Como abrir

| Teclas | O que faz |
|---|---|
| O botão de balão na barra de ferramentas | Alterna a aba Chat |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Alterna o painel direito inteiro |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Enter</kbd> | Envia a mensagem |

Veja [Teclado e atalhos](keyboard.md) para o resto, inclusive como remapear os
interruptores de painel.

**Veja também:** [Funções de IA](ai.md) · [Segurança e segredos](security.md) ·
[Wiki do repositório](repo-wiki.md)
