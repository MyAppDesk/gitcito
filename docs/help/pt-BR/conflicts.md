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
