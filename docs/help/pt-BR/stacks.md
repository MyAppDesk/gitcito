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

O Gitcito desenha a pilha de cima para baixo, terminando no tronco em que ela
aterrissa. Cada nível mostra os próprios commits, **para onde a PR dele vai
apontar** — o nível de baixo, e o tronco no caso do último — e, depois de
enviado, o número da PR como uma etiqueta clicável.

## Montando uma

| Faça isto | E |
|-----------|---|
| **Adicionar nível** | Cria um branch em cima da folha e faz checkout nele. É o `gh stack add`, com um seletor no lugar de um argumento obrigatório. |
| **Adicionar acima** em qualquer nível | O mesmo, mas no *meio* da pilha: o que estava sobre aquele nível é reapontado para o novo branch, então a cadeia mantém a ordem e ganha um andar. Nada é reproduzido — o novo branch nasce na ponta do pai. |
| **Adicionar um branch existente** | Um branch que você já tem entra na pilha em cima da folha. Útil quando você começou do jeito comum e só depois percebeu que era uma pilha. |

Todo campo de branch tem **digitação preditiva**: digite para filtrar, ↑/↓ e
Enter para escolher, e o que você digitar fora da lista também vale — uma
referência remota como `origin/main` serve de base.

## Reordenar

As setas **↑ / ↓** de um nível o trocam com o vizinho. Isso não é edição de
metadados: a cadeia é religada e reproduzida, de modo que os commits próprios de
cada nível aterrissam na nova base. O movimento é desfazível (<kbd>⌘Z</kbd>) — o
desfazer reproduz a ordem anterior, não ressuscita os commits antigos.

Como reordenar é uma sequência de rebases, pode dar **conflito**, igual a um
restack. O Gitcito para no primeiro e entrega a tela de conflitos; os níveis
abaixo dele já foram movidos.

## Apontando para outro lugar

**Definir pai** em um nível abre o mesmo seletor: escolha outro branch e o
vínculo daquele nível se move. A linha **base**, lá embaixo, faz isso com o
tronco — troque-o e a pilha inteira é religada ao novo tronco e reproduzida.

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

## Onde os vínculos ficam

Os vínculos de pai são guardados no **git config**, então viajam com o repositório
e sobrevivem a um novo clone. Nada mora num serviço.

**Veja também:** [Rebase interativo](rebase.md) · [Hosting e pull requests](hosting.md)
