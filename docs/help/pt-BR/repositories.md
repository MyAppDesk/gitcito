---
title: Repositórios
category: Sincronização e vários repositórios
order: 52
summary: Todo repositório que o Gitcito conhece, aberto ou não, numa lista pesquisável.
keywords: repositórios registro todos os repos favoritos estrela recentes varrer pasta explorar achar abrir gerenciar gestão de repositórios cor seção tinta destacar workspaces a partir de pastas árvore gerar importação em massa repositories registry favourites starred recent scan folder
---

# Repositórios

A [central de controle](mission-control.md) responde "qual dos meus
repositórios abertos precisa de mim?". Ela só conhece as abas do workspace
ativo. Repositórios responde outra pergunta: **onde está aquele repo, e ele
está aberto em algum lugar?** Cobre tudo que o Gitcito já viu. Cada
workspace, cada aba, mais o que ele acha varrendo as pastas que você aponta.

![A página Repositórios: seções coloridas para repositórios abertos,
favoritos, recentes e de workspaces, cada linha com nome, dono, branch e
estado de trabalho](../../screenshots/repositories.webp)

## As seções

Um repositório pode aparecer em **mais de uma seção**. De propósito: cada
seção é uma resposta completa à própria pergunta, não um pedaço de uma lista
só.

| Seção | O que tem nela |
|---|---|
| Repositórios abertos | Cada aba do workspace ativo agora |
| Favoritos | Repositórios com estrela, em todos os workspaces |
| Recentes | Tudo que você abriu, o mais novo primeiro. **Sem teto**, ao contrário da lista de 8 entradas do launcher |
| Uma por workspace salvo | As abas daquele workspace, para pular para outro sem trocar primeiro |
| Todos os repositórios | Cada repositório que o registro conhece, aberto ou não |

A barra acima da lista é uma faixa só: **Recolher tudo** e **Expandir
tudo**, depois um campo de busca que ocupa o resto da largura, depois o
interruptor do resumo WIP.

A busca filtra linhas em todas as seções ao mesmo tempo, e **esconde as
seções que não batem com nada** para os resultados não ficarem enterrados
sob uma coluna de cabeçalhos vazios. Bate no nome do repositório, no alias,
no dono ou em qualquer pedaço do caminho. Quando nada combina em lugar
nenhum, a página diz isso em vez de ficar em branco.

Com a caixa vazia, cada seção aparece mesmo sem nada: "Favoritos 0" te diz
que a seção existe e está vazia, e isso vale saber. Só vira ruído quando
você já está buscando.

### Cores de seção

As seções chegam **já coloridas**. Cada cabeçalho ganha o próprio tom da
paleta padrão, inclusive um workspace novo no instante em que aparece. O
ponto é orientação, não decoração: com uma seção por projeto e cinco seções
fixas acima, uma lista longa para de te dizer onde você está, e um tom deixa
um cabeçalho reconhecível antes de você lê-lo.

Para mudar um, use o **⋮** no cabeçalho: **Mudar cor…** abre o mesmo
[seletor de cor](workspaces.md) das abas de grupo e das pastas, dez amostras
fixas mais um hex livre. **Redefinir cor** aparece depois que você
sobrescreveu uma seção, e devolve o padrão atribuído.

Três coisas que valem saber:

- A atribuição é **estável, não aleatória**. As mesmas seções ganham as
  mesmas cores em cada abertura, e adicionar um workspace nunca recolore as
  de cima. Só as cores que você muda são guardadas.
- A cor é **local desta página**. Pintar aqui a seção de um workspace não
  diz nada daquele workspace no resto do Gitcito. A cor da aba dele é outro
  ajuste.
- A cor é **misturada** a um percentual baixo da superfície, em vez de
  aplicada em força total, para um tom saturado continuar um fundo
  legível em temas claros e escuros. Uma cor bem pálida vai parecer quase
  neutra.

Com mais de dez seções a paleta se repete, então dois cabeçalhos podem
compartilhar um tom.

## O que torna um repositório conhecido

Uma linha existe aqui quando o Gitcito **abriu** em algum momento, ou
encontrou debaixo de uma **pasta de varredura**. Nada é indexado só porque
existe no disco num lugar de que você nunca falou ao Gitcito.

Abrir esta página também indexa o que você tem **aberto numa aba**, e é
assim que repositórios restaurados na inicialização ganham uma linha sem
você reabri-los. Cobre só abas abertas, e acontece na primeira visita de
cada sessão, não uma vez para sempre. Um repositório em que você der
**Forget** continua esquecido, a menos que você o abra de novo.

Pastas de varredura se configuram em Configurações:

- **Profundidade** é quantos níveis de diretório a varredura desce abaixo da
  raiz (padrão 3, teto 10).
- A varredura **para num repositório**. Um checkout empacotado ou um
  submodule dentro de um repo não é indexado como linha própria.
- Nunca entra em diretórios que começam com ponto, e pula `node_modules` e
  pastas de dependência parecidas.
- **Só lê nomes de pasta**: achar um diretório `.git` é o que torna algo um
  repositório aqui. Nome, dono e branch vêm de arquivos dentro de `.git`
  (`HEAD`, o config), nunca rodando `git`.

## Linhas

As linhas vêm em colunas: estrela, nome (respeita o alias se você
renomeou), dono (lido da URL do remote origin), chip de branch, resumo WIP
e ações. As colunas são **compartilhadas pela página inteira**, não
dimensionadas por seção, para um nome na última seção alinhar sob o da
primeira e a lista ler como tabela, não como pilha.

As ações do fim ficam visíveis em repouso, não reveladas no hover: **abrir
numa aba**, e um **⋮** que abre o mesmo [menu de contexto do
repositório](repo-menu.md) de um clique direito. É o menu usado em todo o
Gitcito, estendido com duas entradas específicas desta página:

| Ação | O que faz |
|---|---|
| Estrela / tirar estrela | Coloca ou tira o repositório dos Favoritos |
| Locate… | Reaponta uma pasta movida ou renomeada. Alias, perfil e estrela seguem. Se o destino já tinha os próprios ajustes, **o destino ganha** |
| Forget | Tira a entrada desta lista. **Nunca toca a pasta no disco** |

Um repositório cuja pasta não existe mais aparece como **ausente**, com
**Locate…** e **Forget** na linha no lugar das ações usuais.

A estrela é um interruptor de favorito, não uma caixa de seleção em massa.
O trabalho em lote aqui é por seção, não por seleção. Veja abaixo.

## Transformar uma árvore de pastas em workspaces

Sua pasta de código já codifica o agrupamento que você quer. Se `~/Code`
tem `client-a`, `client-b` e `personal`, esses são contextos entre os quais
você troca, e um [workspace](workspaces.md) é exatamente isso, com a própria
faixa de abas.

**Adicionar pasta de varredura…** oferece construí-los. Depois que a
varredura indexou o que achou, um diálogo lista as pastas **diretamente
dentro** da que você escolheu, com quantos repositórios cada uma tem. Marque
as que quiser. Cada uma vira um workspace com **uma aba por repositório**.

| Linha | Significado |
|---|---|
| Um nome de pasta e uma contagem | Marcada por padrão. Vira um workspace |
| "{n} novos, mescla em …" | Já existe um workspace para esta pasta. Só os repositórios novos entram |
| "Já está num espaço de trabalho" | Nada a fazer, acinzentado em vez de escondido |
| O nome da própria raiz | Repositórios soltos na pasta que você escolheu, não numa subpasta. Desmarcada por padrão |

Um repositório entra sob a **primeira pasta abaixo da raiz**, por mais
fundo que esteja: `~/Code/client-a/nested/app` vai para `client-a`. Pastas
sem repositórios não são oferecidas.

**Nada é criado até você confirmar**, e cancelar deixa a indexação da
varredura no lugar. Os repositórios ficam conhecidos de qualquer jeito, que
é o que este botão já fazia.

### Varrer de novo mais tarde

Seguro de repetir. Uma segunda varredura **adiciona e nunca remove**:

- Repositórios novos são acrescentados ao workspace correspondente.
- Os que você moveu, renomeou ou tirou à mão ficam como você deixou.
- Um workspace que você **renomeou** ainda é reconhecido. O Gitcito lembra
  a pasta de onde veio, então mescla em vez de criar um duplicado.
- Um repositório apagado do disco guarda a aba e aparece como ausente.

Workspaces gerados são workspaces comuns. Renomeie, reordene, recolora ou
apague como qualquer outro. Nada neles continua especial.

## Fechar tudo que está aberto

O cabeçalho **Repositórios abertos** carrega um botão de fechar. **Fechar
repositório** quando um está aberto, **Fechar todas as abas** quando vários
estão. Fica desativado quando não há nada aberto.

Fecha as abas que guardam repositórios e **deixa as abas de página em paz**,
para a página Repositórios em que você está não se fechar sozinha. Nada no
disco é tocado, e nada é commitado, stashado ou descartado. Uma aba é só
uma visão.

Fechar vários pergunta primeiro, e diz quantos. Fechar um só não: é um
erro barato, desfeito com o atalho usual de reabrir a aba fechada. As abas
fechadas vão para a mesma pilha de dez que um fechamento único usa, e
reabrem na ordem em que estavam na faixa. Mais de dez de uma vez não voltam
todas.

## Fetch e pull de uma seção inteira

Cada cabeçalho de seção carrega um botão de **fetch** e um botão partido de
**pull**. Eles agem em cada repositório daquela seção, pulando os cuja
pasta está **ausente**. Os repositórios não precisam estar abertos. Uma
seção de repos que você nunca abriu nesta sessão funciona igual.

Os dois rodam **em sequência**, não em paralelo, para uma seção de
quarenta repositórios não disparar quarenta processos git de uma vez. A
barra de status mostra qual repositório está sendo trabalhado e até onde o
lote foi, e o lote inteiro termina com **um** toast, não um por
repositório. Se alguns falharem, o toast diz quantos deram certo e quantos
não. A corrida não para na primeira falha.

A seta ao lado de **pull** escolhe o que puxar significa:

| Modo | O que faz |
|---|---|
| Pull (fast-forward se possível) | O padrão do Git. Fast-forward quando dá, merge quando não dá |
| Pull (somente fast-forward) | Recusa em vez de criar um commit de merge |
| Pull (rebase) | Reaplica seus commits locais em cima do upstream |

Essa escolha é uma **preferência global única**, não uma por seção:
descreve como você faz pull, e definir pela seta de uma seção muda em
todo lugar. Todo pull **de vários repositórios** honra isso. Os botões de
seção aqui, o fetch/pull numa [aba de grupo](workspaces.md) e o pull em
massa da [central de controle](mission-control.md). Fazer pull de um
**único** repositório pela barra não é afetado, porque aquele menu já
pergunta que tipo de pull você quer.

## A barra de ações

**Abrir pasta…**, **Clonar…** e **Adicionar pasta de varredura…**. Três
jeitos de trazer um repositório para o registro do Gitcito, da mesma página
em que você procura um que já está lá.

## Resumo WIP

Uma caixa opcional. Ligada, cada linha **expandida** roda um `git status`
de verdade e mostra trabalho não commitado e estado de sync. Desligada, as
linhas não custam nada além de ler arquivos dentro de `.git`.

É opcional de propósito: um resumo custa uns cinco processos git por
repositório, em lotes de oito, para um registro grande não travar a
interface. Ligar é um "confere tudo que estou vendo agora" deliberado, não
um custo permanente.

## Limites

- **Nada nesta página atualiza no timer.** Reabra a página, ou desligue e
  ligue o resumo WIP, para ver o estado atual.
- **O resumo WIP só cobre seções expandidas.** Uma seção recolhida não
  mostra status nenhum, caixa marcada ou não.
- **Um repositório só é conhecido depois que você o abre, ou varre uma
  pasta que o contém.** Daqui não se busca no sistema de arquivos.
- **Montar workspaces não se desfaz num passo só.** Cancelar o diálogo não
  cria nada, mas um plano que você confirmou e depois se arrepende se
  desfaz apagando os workspaces à mão.
- **Só um nível de profundidade.** Pastas abaixo do primeiro nível são
  achatadas na faixa de abas do workspace. `client-a/nested/app` vira uma
  aba em `client-a`, não uma pasta dentro.
- **"Varrer agora" das Configurações não oferece isto.** Ele varre todas as
  raízes configuradas de uma vez, onde um diálogo por pasta não faz
  sentido, e só indexa.
- **Fechar todas reabre uma aba de cada vez, até dez.** Fechar mais de dez
  repositórios de uma vez significa que os mais antigos não voltam da
  pilha, embora todos ainda estejam em **Recentes**.
- **O pull não é filtrado pelo que está atrasado.** Ele faz pull de cada
  repositório da seção, porque saber quais estão atrasados exigiria fetch
  primeiro. Pull de um repositório já atualizado é um no-op, custa tempo,
  não segurança.
- **Um fetch ou pull de seção não se desfaz da pilha de desfazer.** Fetch
  não muda o que você já tinha. Um pull que faz merge ou rebase se reverte
  por repositório a partir da história daquele repositório, não daqui.
- **Cores de seção são cosméticas.** Não filtram, ordenam, agrupam nem
  sincronizam em lugar nenhum, e a cor na seção de um workspace não é a
  cor daquele workspace.
- **Forget tira a entrada da lista, nunca do disco.** Se a pasta ainda
  está lá, varrer a mesma raiz (ou abrir de novo) traz de volta na hora.

**Veja também:** [Central de controle](mission-control.md) · [Workspaces, abas e grupos](workspaces.md)
