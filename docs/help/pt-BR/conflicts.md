---
title: Resolvendo conflitos
category: Trabalhando com mudanças
order: 32
summary: Um resolvedor de três painéis que diz qual lado é qual.
keywords: conflito conflict resolvedor resolver merge conflicts ours theirs resolver marcadores markers three-way rerere reuse recorded resolution lembrar repetir
---

# Resolvendo conflitos

Quando um merge, rebase, cherry-pick ou revert para, um aviso diz **o que** parou
e **entre o que** — "fazendo merge de `feature/x` em `main`", não só "conflito".

![O resolvedor de conflitos](../../screenshots/conflict-resolver.webp)

## Por que isso conflita

**Por que isso conflita**, no cabeçalho, lista por lado os commits que tocaram
neste arquivo desde que as branches se separaram — é o `git log --merge`, que o
git entrega desde sempre e ninguém encontra.

![Os commits de cada lado que tocaram no arquivo em conflito](../../screenshots/conflict-why.webp)

Os marcadores dizem o que colide. Isto diz quem mudou e por quê, que é geralmente
o que de fato decide a resolução. Nada ali significa que nenhum dos lados
commitou uma mudança exatamente neste caminho — a colisão veio de uma renomeação
ou de uma movimentação.

## Os três painéis

| Painel | É |
|---|---|
| Esquerdo | **Nosso** — o lado em que você estava, rotulado com o commit dele |
| Direito | **Deles** — o lado que está chegando, rotulado com o commit dele |
| Central | A **saída**: editável, com números de linha, e o que de fato vai ser preparado |

Os três painéis são redimensionáveis, e o cabeçalho da saída traz duas
alternâncias de visão:

| Alternância | O que faz |
|---|---|
| **Quebrar linha** | Quebra linhas longas dentro dos painéis A e B em vez de rolá-las. O painel de saída mantém uma fileira por linha — os marcadores laterais dele dependem disso — então ele sempre rola |
| **Vinculado** | Rola A, B e a saída juntos, na vertical e na horizontal. As contagens de linhas deles diferem, então a posição vertical é alinhada por proporção |

Quebrar linha começa desligado, Vinculado começa ligado, e os dois lembram o
próprio estado.

## Navegando

Abrir um arquivo leva você ao **primeiro conflito** dele, não ao topo do
arquivo. As setas ⌃ / ⌄ no cabeçalho da saída — ou <kbd>Alt+↑</kbd> /
<kbd>Alt+↓</kbd> — percorrem os demais, rolando os três painéis até cada um.

## Escolhendo

Por **linha**, por **bloco**, ou o **lado inteiro** de uma vez — e você pode ficar
com os dois lados de um bloco quando a resposta é "manter os dois". Um navegador
conflito a conflito leva você pelo que sobrou, para que não seja possível deixar
um marcador para trás sem querer.

## Assistência da IA

Com a IA ligada, **Resolver com IA** propõe um merge no painel de saída. Ela nunca
aplica nada por conta própria: você lê, edita e prepara. Veja
[Recursos de IA](ai.md).

## Arquivos de projeto do Xcode

`project.pbxproj` entra em conflito mais do que qualquer outro arquivo de um
repositório iOS, e quase nunca porque alguém discordou. É um único dicionário
plano de objetos com chaves hexadecimais de 24 dígitos, então adicionar um
arquivo escreve quatro entradas: um `PBXBuildFile`, um `PBXFileReference`, uma
linha nos `children` do grupo que o contém e uma na fase de build do target.
Duas pessoas adicionando um arquivo cada escrevem oito entradas que caem sobre
as mesmas poucas linhas. O git vê uma colisão; não há nada a resolver.

Quando o arquivo em conflito é um `project.pbxproj`, o resolvedor lê as três
versões como projetos em vez de texto e oferece **mesclar por estrutura**: casar
objetos por identificador, pegar toda adição dos dois lados, unir os arrays
`children` e `files` e parar no que de fato divergiu. A faixa acima dos painéis
diz o que cada lado adicionou e o que — se algo — sobra para você.

Como a proposta da IA, ela cai no painel de saída e não prepara nada. Você lê
antes de salvar.

![A faixa de mesclagem estrutural acima dos painéis de conflito, em um arquivo de projeto do Xcode](../../screenshots/conflict-pbxproj.webp)

### O que ela se recusa a fazer

**Nunca adivinha uma configuração que os dois mexeram.** Se você põe
`MARKETING_VERSION` em `1.1` e eles em `2.0`, isso é uma decisão, e aparece
nomeada na faixa — a configuração, o seu valor, o deles — em vez de resolvida
pelas suas costas. Um objeto que ela não conseguiu decidir mantém a *sua* versão
exata, para que uma mesclagem pela metade nunca chegue ao disco.

**Ela recusa o arquivo inteiro se qualquer uma das três versões não for
analisável.** Um `project.pbxproj` que o Xcode não consegue abrir custa mais que
uma mesclagem manual, então tudo que ela não puder ler com certeza continua um
conflito de texto comum, e ela diz isso.

**Ela não detecta dois identificadores cunhados para objetos diferentes.** Raro,
já que o Xcode os escolhe aleatoriamente — mas quando acontece, pegar qualquer um
dos lados descartaria em silêncio o arquivo de alguém, então é relatado em vez de
mesclado.

### Não use `merge=union`

O remédio que circula para isso é `*.pbxproj merge=union` no
[`.gitattributes`](attributes.md). Evite. A união funciona enquanto as únicas
mudanças forem adições independentes, e no instante em que duas pessoas editam a
mesma configuração de build ela emite as duas linhas e produz um arquivo que o
Xcode se recusa a abrir — justo no momento em que é menos provável que você esteja
lendo o diff com atenção. A mesclagem estrutural dá a mesma conveniência sem essa
falha.

## Lockfiles

`Podfile.lock`, `Package.resolved`, `yarn.lock` e seus primos registram um grafo
de dependências que o resolvedor de alguém já resolveu. Metade de uma solução
costurada à metade de outra é um grafo que ninguém resolveu: pode não instalar,
e se instalar, instala algo que nenhum dos dois branches testou.

Então, quando o arquivo em conflito é um lockfile, a faixa nomeia a ferramenta
que manda nele, oferece **Ficar com o nosso** e **Ficar com o deles** ali mesmo,
e te dá o comando que o regenera depois. Escolher um lado aqui não é um meio
termo — é o método inteiro, e a regeneração é o que o torna correto.

![A faixa do lockfile acima dos painéis de conflito](../../screenshots/conflict-lockfile.webp)

Os três painéis continuam disponíveis, porque de vez em quando você quer mesmo
ler o que mudou: um checksum que reconhece, uma versão que esperava. Editá-los à
mão é justamente do que isto tenta te dissuadir.

## Evitando conflitos antes deles acontecerem

O [radar de conflitos](conflict-radar.md) diz quais branches vão conflitar antes
de você fazer merge de qualquer uma delas.

## Deixando o git lembrar (rerere)

Faça rebase de uma branch de vida longa e você reencontra o mesmo conflito toda
vez. O `rerere` — *reuse recorded resolution* — é a resposta do git: ele memoriza
como você resolveu um conflito e repete essa resposta na próxima vez que o
conflito idêntico aparecer.

**Configurações → Geral → Lembrar resoluções de conflito.** Isso escreve
`rerere.enabled` no seu git config global, então a linha de comando se comporta do
mesmo jeito.

Quando o git respondeu por você, o resolvedor diz isso em vez de mostrar uma tela
vazia de "sem marcadores de conflito", e oferece **Esquecer esta resolução** — que
descarta a memória *e* traz o conflito de volta, para você resolver de outro jeito.

Duas coisas que vale saber:

- **Uma resolução repetida não é preparada** a menos que você ligue *Preparar
  automaticamente uma resolução repetida*. Deixe isso desligado: o sentido da
  pausa é que uma resposta memorizada pode estar errada para este merge em
  particular, e preparar sem olhar é como ela chega até um commit.

  É por isso que um arquivo repetido **continua em Arquivos em conflito**: o git
  escreveu o conteúdo, mas o índice ainda o mantém como não mesclado, e só o
  staging resolve isso. **Preparar como está** no resolvedor, ou **Marcar todos
  como resolvidos** na lista, é o que o move dali.
- **O rerere não entende todo conflito.** Conflitos de adicionar/adicionar e de
  apagar/modificar não geram preimage, então voltam sempre crus. A contagem nas
  Configurações é quantos ele realmente guarda, e **Esquecer tudo** esvazia.

**Veja também:** [Radar de conflitos](conflict-radar.md) · [Merge e rebase](merging.md)
