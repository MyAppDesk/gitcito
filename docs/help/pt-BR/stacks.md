---
title: Branches empilhadas
category: Branches e cirurgia
order: 43
summary: Correntes de branches dependentes — restack em cascata e PRs encadeados com um clique.
keywords: stack pilha branches empilhadas stacked graphite restack dependente corrente pai parent PR por nível submit enviar autopilot piloto automático retarget mudar base
---

# Branches empilhadas

Uma pilha é uma corrente de branches em que cada uma se constrói sobre a de baixo:
`main → api → ui`. Revisar três PRs pequenos é melhor que revisar um PR enorme.

![Uma pilha de branches](../../screenshots/branch-stack.webp)

O Gitcito desenha isso como uma **rota**: um branch de início no topo, depois uma
parada por nível. A PR de cada parada aponta para a parada acima, e a primeira
aterrissa no branch de início. Cada parada mostra os próprios commits, se precisa
de restack e, depois de enviada, o número da PR.

## Editando a rota

**Nada roda até você apertar Aplicar.** Escolher um branch, mover uma parada,
tirá-la da rota — tudo isso edita uma lista na tela. A operação de verdade
rebaseia branches e faz checkout deles, e isso não é coisa para um clique
exploratório fazer. Quando a rota estiver certa, **Aplicar rota** executa tudo
como um passo só, desfazível; **Descartar** volta o desenho para o que o
repositório diz.

A rota é desenhada em ordem de merge: o branch de cima entra no de baixo, até o
branch em que a pilha aterrissa.

| Controle | O que faz |
|----------|-----------|
| O campo **Início** | Onde a pilha aterrissa. Troque-o e a cadeia inteira é religada ao novo branch e reproduzida. |
| O campo de uma **parada** | Troca qual branch ocupa aquela posição. O branch que sai é só desvinculado, nunca apagado. |
| **↑ / ↓** | Move uma parada uma posição na rota. |
| **✕** | Tira a parada da rota; as vizinhas se juntam. |
| **Adicionar parada** | Escolha um branch que você já tem e ele entra no topo, ou digite um nome que ainda não existe: ele é criado na ponta da última parada e você vai para ele. |
| O botão de seta | Faz checkout daquela parada. |

Todo campo tem digitação preditiva: digite para filtrar, ↑/↓ e Enter para escolher,
e o que você digitar fora da lista também vale — então uma referência remota como
`origin/main` serve de branch de início.

Por baixo, todas essas edições são a *mesma* operação: a rota inteira, devolvida de
uma vez. É por isso que um gesto é um desfazer só (<kbd>⌘Z</kbd>) em vez de um
rastro de vínculos meio aplicados.

## Quanto custa editar a rota

Tudo que muda a ordem — uma troca, um movimento, outro início — **reproduz** a
cadeia: os commits próprios de cada parada são rebaseados na nova base. Então pode
dar **conflito**, igual a um restack. Duas paradas que mexem nas mesmas linhas não trocam de
lugar sem gente, e quando isso acontece **não acontece nada**: a edição inteira é
desfeita — pontas, vínculos de pai e o rebase pela metade — e o Gitcito diz quais
duas paradas batem. Um menu que você encostou não deve largar você no meio de um
rebase.

**Restack** é a outra metade do trato: é um rebase que você pediu pelo nome,
então ele para no conflito e entrega a tela de conflitos — que também é o jeito
de conseguir a reordenação recusada: resolva ali e depois mova a parada.

O desfazer reproduz a rota anterior. Ele não ressuscita os commits antigos, porque
os novos são o mesmo trabalho com outros pais.

## Enviar tudo

**Enviar tudo** envia cada nível com `--force-with-lease` e para por aí — é o `gh
stack push`, sem abrir nada. **Enviar pilha como PRs** faz o mesmo push e depois
o trabalho de PR; use **Enviar tudo** quando quiser os branches no remoto mas
ainda não a revisão.

## Envie a pilha como PRs encadeados

**Enviar pilha como PRs** faz com um clique o que as ferramentas de stacking
cobram para fazer:

1. Faz push de cada nível com `--force-with-lease` (branches novas toleram,
   as que passaram por restack precisam).
2. Abre um PR para cada nível que não tem um — cada um **baseado na branch
   pai**, não na `main`, de forma que cada revisão mostre apenas os próprios
   commits. Título e descrição vêm dos commits do próprio nível.
3. Muda a base de qualquer PR existente cuja base tenha derivado.
4. Escreve uma **seção de navegação da pilha** no corpo de cada PR, para que um
   revisor em qualquer nível veja a corrente inteira e onde este PR se encaixa
   nela.

A ação é **idempotente**: aperte depois de cada restack, novo nível ou PR
mesclado e ela converge — nada é duplicado, só o que derivou é tocado.

Quando o PR de baixo foi **mesclado**, o mesmo botão limpa o que ficou: o
filho do nível mesclado passa a ter o trunk como pai, o nível deixa de ser
rastreado, a branch local dele é apagada (sem risco — o trunk comprovadamente
a contém), a corrente passa por restack e todos os PRs restantes têm a base
atualizada. Mescle de baixo para cima, aperte Enviar, repita.

## Restack

Quando uma branch mais abaixo muda — você atendeu aos comentários de revisão na
`api` — toda branch acima dela passa a estar construída sobre a base errada. O
**Restack** faz rebase em cascata da corrente inteira com `rebase --onto`, de forma
que a reescrita de um pai não duplique commits nos filhos. Depois de um restack,
aperte **Enviar** de novo: ele faz force-push dos níveis reescritos e os PRs se
atualizam no lugar.

## Limites

- O envio é **só para o GitHub** por enquanto (a criação funciona nos quatro
  hosts, mas mudar a base e atualizar o corpo exigem a API do GitHub).
- A limpeza após o merge de baixo enxerga merges e merges por rebase pela
  ancestralidade, e merges por **squash** perguntando ao GitHub se o PR da
  branch foi integrado — então, com um token do GitHub, todo estilo de merge é
  limpo. Em outros hosts, ou sem um token, um nível mesclado com squash ainda
  precisa deixar de ser rastreado à mão. Faça fetch antes, também — a
  verificação de ancestralidade lê o trunk como estava no seu último fetch.
- A seção da pilha no corpo de um PR é mantida entre marcadores ocultos — a sua
  própria descrição acima dela é preservada.
- Reordenar e trocar de tronco **reescrevem o histórico** em todo nível que
  tocam. Os branches são seus e níveis não enviados não custam nada, mas um
  nível já em revisão leva um force-push no próximo envio.
- Um nível só anda uma posição por vez. Duas trocas são dois rebases, e parar no
  meio é um estado legível; um arraste que cai três posições adiante não é.
- Uma parada é **rebaseada**, então o branch em que a pilha aterrissa nunca é
  também uma parada, e um branch **protegido** também não (`main` e `master`, a
  menos que você mude a lista). Os dois são recusados em vez de reescrever
  silenciosamente história compartilhada.
- Antes de abrir qualquer coisa, o envio pergunta ao remoto quais branches
  realmente chegaram e diz quais faltaram. O GitHub responde a um head ausente com
  um seco "Validation Failed", que não ajuda ninguém.
  O branch em que a pilha aterrissa também é conferido: se ele só existe local, o
  envio se oferece para enviá-lo e seguir.

## Onde os vínculos ficam

Os vínculos de pai são guardados no **git config**, então viajam com o repositório
e sobrevivem a um novo clone. Nada mora num serviço.

**Veja também:** [Rebase interativo](rebase.md) · [Hosting e pull requests](hosting.md)
