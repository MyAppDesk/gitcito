---
title: Fetch, pull e push
category: Sincronização e vários repositórios
order: 50
summary: Ficar em dia, com proteções nas operações que mordem.
keywords: fetch pull push force forçado auto-fetch prune remotes upstream branch protegida vários remotes fork mirror push tags all
---

# Fetch, pull e push

## Pull

Três modos, escolhidos no dropdown: **padrão**, **somente fast-forward** ou
**rebase**. As mudanças locais entram e saem do stash automaticamente em volta do
pull, então uma árvore suja não te bloqueia.

### Um branch que não rastreia nada

`git pull` é um fetch seguido de um merge, e o merge precisa saber *em que*
mesclar — o upstream do branch. Um branch criado localmente, ou obtido sem
rastreamento, não tem nenhum. O fetch funciona mesmo assim, passa uma lista longa
de refs `origin/*` atualizadas, e então o git para com *"There is no tracking
information for the current branch"*. Nada foi puxado e nada quebrou: a segunda
metade simplesmente não tinha alvo.

O Gitcito lê esse erro e oferece o conserto como um botão, escolhendo qual
conforme o remoto já carregue ou não o branch:

| | |
|---|---|
| **Está no remoto** | **Ligar e fazer pull** — define o upstream como `<remoto>/<branch>` e então roda o pull que você pediu. **Desfazível com ⌘Z**, que tira o rastreamento de novo. |
| **Ainda não está lá** | **Fazer push do branch** — um push comum, que define o upstream no caminho. |

O remoto oferecido é `origin` quando existe, senão o primeiro da lista. Em qual
caso você está é lido das refs de rastreamento, não da rede — então a resposta
reflete o fetch que acabou de rodar.

## Push

Force pushes sempre usam `--force-with-lease` — a variante segura, que recusa se o
remote se mexeu desde a última vez que você olhou. Dar push forçado numa **branch
protegida** pede confirmação (a lista fica na engrenagem de configurações do repo).

![A confirmação que uma branch protegida exige antes de um force-push](../../screenshots/force-push-guard.webp)

### Mais de um remote

O botão **Push** mira no upstream da branch. A seta ao lado dele também oferece,
assim que um repositório tem mais de um remote:

| | |
|---|---|
| **Push para um remote** | Escolha um único remote — um fork, um mirror, um destino de deploy |
| **Push para todos os N remotes** | Um push por remote, em ordem |
| **Push de todas as tags para** | `git push <remote> --tags`, toda tag local de uma vez |

As mesmas duas ações ficam na linha de cada remote na barra lateral, que costuma
ser onde você está quando a pergunta aparece.

**Uma rejeição não cancela o resto.** Dar push num fork e no upstream dele é
exatamente o caso em que um lado recusa e o outro ainda deve passar, então cada
remote reporta separadamente: os sucessos são nomeados num toast, e cada falha ganha
o seu próprio, com o motivo do git.

Somente o **primeiro** remote da lista define o upstream da branch. Uma branch tem
um upstream, e o último remote para o qual você deu push não é automaticamente o
que você quer que ela rastreie.

Os dois caminhos rodam as mesmas verificações de um push comum — a confirmação de
branch protegida e a [proteção contra segredos](security.md). Publicar em dois
remotes é o dobro da exposição, não metade do cuidado.

## Branches em que você não está

`git pull` só move o HEAD, e por isso a maioria dos clientes exige checkout antes
de atualizar uma branch. O Gitcito não: clique com o botão direito em qualquer
branch local — na sidebar ou no badge do [grafo](graph.md) — e você tem **Pull de
\<branch\>** e **Push de \<branch\>**, ambos agindo sobre *aquela* branch.

| | |
|---|---|
| **Pull de `<branch>`** | Avança a ref local até o upstream, sem checkout. A árvore de trabalho não é tocada. **Desfazível com ⌘Z** — o undo devolve a branch ao ponto anterior. |
| **Push de `<branch>`** | Um push comum daquela branch, com as mesmas proteções de branch protegida e de [segredos](security.md) do botão da barra. |

O pull fica desabilitado para uma branch que não rastreia nada: não há de onde
puxar. Na branch em que você *está*, os dois caem no pull normal, que também
atualiza a árvore de trabalho.

**O limite que importa:** uma branch que **divergiu** do upstream é recusada, com
uma mensagem dizendo isso. Reconciliar uma divergência é um merge ou um rebase, e
ambos precisam de árvore de trabalho — esse caso ainda custa um checkout. O force
push de uma branch em que você não está é oferecido quando o remoto rejeita; o
caminho "puxar e tentar de novo", não, pelo mesmo motivo.

## Fetch

**Fetch** tem seu próprio botão na barra de ferramentas, ao lado de Pull. Ele faz
fetch de todos os remotos e prune, deixando suas refs `origin/*` e todos os
contadores à frente/atrás em dia — e não toca nem no seu branch nem na sua árvore
de trabalho. É o botão para quando você quer *ver* o que os outros fizeram sem
mexer no seu próprio trabalho.

Há também o **auto-fetch** em segundo plano num intervalo que você define
(Configurações → Geral). Passe o mouse no botão Fetch e a idade aparece embaixo —
*há 4min* — em âmbar assim que um fetch passa de quinze minutos. Ela nunca ocupa
espaço na barra, porque responde a uma pergunta que você só faz enquanto vai
clicar no botão. É lida do `FETCH_HEAD`, então um `git fetch` rodado num terminal
conta igual a um rodado aqui.

Um fetch que encontra **histórico reescrito** avisa: um toast nomeia a branch, e a
linha dela ganha um marcador que abre [o que mudou desde](range-diff.md) exatamente
no commit para o qual ela apontava antes.

## Muitos repositórios de uma vez

- Uma aba de grupo pode fazer **Fetch em todos / Pull em todos** de toda a sua
  subárvore.
- A [central de controle](mission-control.md) faz isso no workspace inteiro, e pode
  dar pull *apenas* nos repositórios que estão de fato atrasados.

## Remotes

Adicione, edite, remova e busque remotes individuais pela barra lateral. As linhas
de branch carregam selos de presença por remote, então você vê de relance quais
remotes têm uma cópia de uma branch.

**Veja também:** [Central de controle](mission-control.md) · [Hosting e pull requests](hosting.md)
