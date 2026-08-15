---
title: Teclado e atalhos
category: Comece por aqui
order: 2
summary: As teclas que vale a pena aprender, e como remapeá-las.
keywords: atalhos shortcuts teclado keyboard teclas cheatsheet colinha remapear rebind hotkeys paleta palette
---

# Teclado e atalhos

Aperte <kbd>?</kbd> em qualquer lugar para ver a colinha de atalhos.

![A colinha de atalhos](../../screenshots/cheatsheet.webp)

## Os que valem a pena aprender

| Teclas | O que faz |
|---|---|
| <kbd>⌘K</kbd> | [Paleta de comandos](search.md) — branches, commits, arquivos, ações |
| <kbd>⌘⇧F</kbd> | [Busca em código](search.md) na árvore de trabalho |
| <kbd>⌘⇧V</kbd> | [Cofre](vault.md) |
| <kbd>⌘O</kbd> / <kbd>Ctrl+O</kbd> | Abrir um repositório |
| <kbd>⌘,</kbd> / <kbd>Ctrl+,</kbd> | Abrir as Configurações |
| <kbd>⌘F</kbd> | Buscar dentro do arquivo ou do diff que você está lendo |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Abrir o seletor de repositório ou grupo para uma nova aba |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Fechar a aba ativa — ou a janela, quando não sobra nenhuma aba |
| <kbd>⌘1</kbd>–<kbd>⌘9</kbd> / <kbd>Ctrl+1</kbd>–<kbd>Ctrl+9</kbd> | Ir para uma aba pela posição dela |
| <kbd>⌘⇧T</kbd> | Reabrir a última aba fechada |
| <kbd>?</kbd> | Esta colinha |

## Andando sem o mouse

| Onde | Teclas |
|---|---|
| Grafo de commits | <kbd>↑</kbd> <kbd>↓</kbd> ou <kbd>j</kbd> <kbd>k</kbd> |
| Listas de arquivos (commit, WIP, stash) | as mesmas |
| [Máquina do tempo](time-machine.md) | <kbd>←</kbd> <kbd>→</kbd>, <kbd>⇧</kbd> para dez, <kbd>Home</kbd>/<kbd>End</kbd> |
| [Central de controle](mission-control.md) | <kbd>↑</kbd><kbd>↓</kbd>, <kbd>Enter</kbd> para abrir, <kbd>f</kbd>/<kbd>p</kbd> para fetch/pull, <kbd>/</kbd> para filtrar |
| Caixa de mensagem do commit | <kbd>↑</kbd> <kbd>↓</kbd> traz de volta suas mensagens recentes |

## Remapeando

**Configurações → Atalhos**. Os atalhos centrais de navegação (paleta, busca em
código, cofre, abrir repositório, configurações) são remapeáveis, com detecção de
conflito e reset individual por atalho.

Os atalhos fixos da tabela acima não são remapeáveis, e também são recusados como
_destino_: o app responde a <kbd>⌘T</kbd>, <kbd>⌘W</kbd>,
<kbd>⌘1</kbd>–<kbd>⌘9</kbd>, <kbd>⌘⇧T</kbd>, <kbd>⌘S</kbd>, <kbd>⌘Z</kbd>,
<kbd>⌘⇧Z</kbd> e <kbd>⌘F</kbd> antes de consultar os seus mapeamentos, então um
atalho atribuído a um deles pareceria configurado e nunca dispararia. Escolha um
desses e o editor avisa em vez de aceitar.

![Atalhos remapeáveis nas configurações](../../screenshots/settings-shortcuts.webp)

**Veja também:** [Paleta de comandos e busca](search.md)
