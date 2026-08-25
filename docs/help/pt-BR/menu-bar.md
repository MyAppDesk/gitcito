---
title: A barra de menus
category: Comece por aqui
order: 5
summary: O que há nos menus do Gitcito no macOS, e por que Windows e Linux não têm barra de menus.
keywords: barra de menus menu aplicativo arquivo editar visualizar janela ajuda repositório macos nativo sobre encerrar
---

# A barra de menus

Uma barra de menus responde a uma pergunta que nenhuma outra superfície responde
bem: *o que este aplicativo sabe fazer?* A [paleta de comandos](search.md) é
mais rápida quando você já sabe o que procura, e a [colinha](keyboard.md) lista
as teclas — mas não se navega por nenhuma das duas. Pelos menus, sim.

Tudo o que está neles também é alcançável de dentro da janela. Nada é exclusivo
do menu, de propósito: um recurso que só existe no menu é um recurso que quem
usa Windows e Linux não tem.

## O que fica onde

| Menu | Contém |
|---|---|
| **Gitcito** | Sobre, busca de atualizações, [Ajustes](repo-settings.md), os itens padrão de ocultar e encerrar |
| **Arquivo** | Nova aba, abrir ou [clonar](cloning.md) um repositório, abrir recente, fechar e reabrir abas |
| **Editar** | Recortar, copiar, colar, desfazer — a edição de texto que seu teclado já faz — mais a [busca no código](search.md) |
| **Visualizar** | Paleta de comandos, os interruptores da barra lateral e do painel, o [terminal](terminal.md), o [mission control](mission-control.md), o [cofre](vault.md), zoom |
| **Repositório** | Fetch, pull, push, commit, stash, novo branch, [pull request](hosting.md), desfazer, mostrar no Finder, ajustes do repositório |
| **Janela** | Minimizar, zoom, trazer tudo para a frente |
| **Ajuda** | Este manual, a colinha, novidades, licenças, relatar um problema |

O menu Repositório fica inteiro esmaecido quando a aba ativa não é um
repositório git, e **Desfazer** fica esmaecido quando não há nada a desfazer — o
menu é um resumo legível do que o aplicativo vai deixar você fazer agora.

## Atalhos exibidos, não confiscados

As teclas ao lado de cada item são as que você realmente atribuiu. Reatribua
<kbd>⌘K</kbd> nos Ajustes e o menu Visualizar passa a dizer isso.

Isso funciona porque o menu *exibe* essas combinações sem reivindicá-las: o
tratamento de teclado do próprio Gitcito continua no comando, e é o que permite
que um atalho se comporte de forma diferente conforme onde está o cursor. A
única coisa que isso não mostra é um atalho que o Gitcito não possui —
<kbd>⌘F</kbd> pertence ao arquivo ou diff que você está lendo, então nenhum item
de menu o reivindica.

## Os limites

- **Somente macOS.** No Windows e no Linux a janela não tem moldura — a barra de
  título é desenhada pelo Gitcito e não há onde uma barra de menus morar. Essas
  plataformas recebem os mesmos comandos pela [paleta de comandos](search.md) e
  pelos [atalhos de teclado](keyboard.md).
- **Recarregar e as Ferramentas de desenvolvimento aparecem apenas em builds de
  desenvolvimento.** Recarregar joga fora o estado de todas as abas abertas, o
  que uma versão publicada não deve oferecer ao lado de Zoom.
- **Abrir recente lista no máximo dez repositórios**, do mais recente ao mais
  antigo, e segue a mesma lista da [tela de boas-vindas](getting-started.md).
- **Reabrir aba fechada nunca fica esmaecido.** A pilha de abas fechadas vive só
  durante a sessão e o menu não a enxerga; escolher o item sem nada a reabrir
  não faz nada.
