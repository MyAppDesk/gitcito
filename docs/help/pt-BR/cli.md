---
title: A linha de comando
category: Ferramentas de workspace
order: 93
summary: `gitcito .` — como o `code .`, mas para Git.
keywords: cli linha de comando command line terminal shim path instalar abrir pasta instância única single instance
---

# A linha de comando

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## Instalando o shim

Paleta de comandos (<kbd>⌘K</kbd>) → **Instalar o comando 'gitcito' no PATH**
(macOS). Isso cria um symlink de um pequeno shim em `/usr/local/bin` ou
`/opt/homebrew/bin`, pedindo direitos de administrador só se nenhum dos dois for
gravável por você. Rode o mesmo comando de novo para desinstalar.

## Como ele se comporta

- Se o caminho **já estiver aberto** — como aba ou dentro de um grupo — o Gitcito
  **foca nele** em vez de abrir uma duplicata.
- Se ainda não for um repositório Git, ele abre mesmo assim, oferecendo o fluxo de
  "inicializar repositório aqui".
- O `-g` adiciona o repositório a um grupo com aquele nome, criando o grupo se ele
  não existir.
- O Gitcito é de **instância única**: rodar `gitcito` com o app aberto entrega o
  pedido àquela janela em vez de lançar uma segunda cópia.

**Veja também:** [Workspaces, abas e grupos](workspaces.md)
