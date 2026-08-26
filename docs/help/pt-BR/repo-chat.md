---
title: Chat do repositório
category: IA
order: 82
summary: Faça perguntas sobre este repositório, fixe arquivos e commits como contexto e deixe que ele proponha mudanças revisáveis em arquivos seguidas de ações Git.
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

**Uma segunda olhada.** A primeira passada precisa adivinhar quais arquivos
importam só pelo nome, que é exatamente o palpite que falha em “de onde isso é
chamado”. Por isso uma resposta pode perguntar de volta em vez de adivinhar: ela
pode nomear mais caminhos, mais buscas literais ou hashes de commits do
histórico recente, e a pergunta é refeita com o que aquilo trouxer. Isso ocorre
no máximo duas vezes — cada rodada é outra chamada ao modelo que você espera — e
na última ela precisa responder com o que tem. Você não vê nada disso além de
uma espera um pouco maior e uma resposta melhor.

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
| **Propor ações de arquivo e Git no chat** | Desligado devolve o chat ao modo somente leitura: sem cartões de ações, sem menu de aprovação |
| **Modo somente leitura de arquivos** | Ligado bloqueia criação, edição, substituição e exclusão de arquivos, mas mantém as ações Git disponíveis. Vem ligado por padrão |
| **Como as ações propostas são executadas** | O modo de aprovação — veja [Modos de aprovação](#modos-de-aprovação). Ações destrutivas confirmam de qualquer jeito |
| **Permitir que o chat proponha ações remotas** | Desligado por padrão. Ligado, acrescenta fetch, pull, push, abrir um pull request e enviar uma pilha |

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

O chat do repositório pode propor edições exatas, criação ou substituição de
arquivos inteiros e exclusão, e depois ações Git: padrões de ignore, stage,
unstage, commit, stash, descarte, branch, troca de branch, tag e — porque a
lista de branches e os commits recentes lhe são mostrados — merge, rebase,
revert e cherry-pick. O Gitcito calcula o diff expansível localmente. Arquivos
existentes precisam vir da evidência lida; alvos inseguros, secretos, ignorados,
gerados, binários, desatualizados, grandes demais ou alcançados por symlink são
recusados. Reset, reescrita de histórico, exclusão de branch e toda operação
forçada continuam apenas na interface dedicada.

Um merge ou um rebase pode parar em um conflito. Quando isso acontece, a
execução para ali, o cartão marca aquela linha como falha e mantém a contagem do
que já rodou, e o aviso de conflito assume exatamente como faria para a mesma
operação iniciada pela barra.

O lote inteiro é conferido de novo antes da primeira escrita e sofre rollback
se um passo falhar. Antes de um commit, o Gitcito confirma que existe algo no
stage. O cartão marca cada linha concluída, falha ou pulada e preserva resultados
parciais. Depois, uma chamada separada e sem ações resume o resultado real; se
esse resumo falhar, o cartão continua sendo o registro autoritativo.

**Ele também pode escrever `.gitcito.json`.** O chat recebe o formato do
[arquivo de configuração do próprio repositório](repo-config.md), então *adicione
links de tickets para JIRA-1234* ou *proteja os branches de release* vira uma
ação de arquivo escrita contra o esquema real, e não chaves plausíveis que o
carregador recusaria. Exige as ações de arquivo ligadas — a mesma opção de modo
somente leitura de arquivos.

**As linhas que pedem um desenho têm um.** Um resumo de uma linha basta para
“prepare dois arquivos” e fica muito aquém de “abra quatro pull requests sobre
uma pilha”: as linhas que descrevem uma forma a desenham — o branch que um push
publica e quanto está à frente, as duas referências de um merge ou rebase, os
commits que um revert ou cherry-pick repetiria com seus assuntos, o pull request
como ele ficará, e uma pilha como uma escada com a base de cada nível e o que o
envio faria ali: abrir, redirecionar ou deixar como está.

### Ações que saem da máquina

Buscar, puxar, enviar, abrir um pull request e enviar uma pilha estão
**desligados por padrão**, atrás de **Permitir que o chat proponha ações
remotas**. Publicar trabalho merece uma escolha explícita, e com a opção
desligada o modelo nem fica sabendo que essas ações existem: ele não pode propor
uma e ser recusado, que é a falha que ensina as pessoas a ligar coisas sem ler.

Com a opção ligada:

| Ação | Faz |
|---|---|
| **Buscar** / **Puxar** | O mesmo fetch e pull da barra; o modo de pull (merge, só fast-forward, rebase) faz parte da proposta |
| **Enviar** | Publica um branch em um remoto. **Nunca com force**: um push forçado não existe no vocabulário de uma proposta, então não pode ser proposto |
| **Abrir PR** | Abre um pull request, rascunho ou não, contra o origin do repositório. O cartão guarda o link depois |
| **Enviar pilha** | O envio completo da [pilha de PRs](stacks.md): publicar cada nível, abrir ou redirecionar um pull request por nível, escrever a seção de navegação, registrar a pilha no GitHub |

![Um plano do chat que envia e abre um pull request](../../screenshots/repo-chat-remote-actions.webp)

Um push proposto passa antes pelas mesmas guardas do push da barra: a
confirmação de branch protegido, o aviso sobre publicar
[arquivos que parecem credenciais](security.md) e a lista de verificação
pré-push do repositório. São diálogos, então são respondidos antes de o plano
começar, não de dentro dele.

### Desfazer um plano

Um plano é aprovado em lote, então é desfeito em lote. Antes da primeira ação
capaz de mudar algo, o Gitcito registra onde o branch estava e tira um snapshot
da árvore de trabalho; o cartão concluído passa a oferecer **Desfazer plano**.
Ele leva o branch de volta àquele commit e restaura a árvore, o que joga fora o
que o plano produziu — por isso confirma antes e nomeia o commit de destino. Os
pull requests abertos continuam abertos: um remoto não é algo que um snapshot
local consiga retirar.

### Modos de aprovação

O menu com escudo abaixo da caixa de mensagem (também em **Configurações → IA
→ Chat do repositório**) decide como um cartão executa:

| Modo | Executa |
|---|---|
| **Sempre perguntar** | Nada até você apertar **Executar** no cartão |
| **Executar ações seguras automaticamente** | Propostas feitas só de tarefas reversíveis — stage, unstage, ignore, branch, tag — executam ao chegar; o resto espera o botão |
| **Executar todas as ações automaticamente** | Mudanças em arquivos e ações Git comuns executam ao chegar; operações Git destrutivas ainda perguntam |

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
- **O modelo nunca escreve diretamente.** Ele devolve propostas estruturadas;
  o Gitcito valida, calcula o diff e executa apenas sob as
  [suas regras de aprovação](#modos-de-aprovação). Trabalho Git destrutivo sempre
  confirma. Com propostas de ações desligadas, o chat nem propõe mudanças.
- **As conversas vivem só na memória.** Cada repositório mantém seu fio; sair do
  Gitcito descarta tudo.

## Como abrir

| Teclas | O que faz |
|---|---|
| O botão de balão na barra de ferramentas | Alterna a aba Chat |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Alterna o painel direito inteiro |
| <kbd>Enter</kbd> | Envia a mensagem |
| <kbd>Shift+Enter</kbd> | Insere uma nova linha |

Veja [Teclado e atalhos](keyboard.md) para o resto, inclusive como remapear os
interruptores de painel.

**Veja também:** [Funções de IA](ai.md) · [Segurança e segredos](security.md) ·
[Wiki do repositório](repo-wiki.md)
