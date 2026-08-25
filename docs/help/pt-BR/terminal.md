---
title: Terminal integrado
category: Ferramentas de workspace
order: 90
summary: Um PTY de verdade acoplado embaixo do repo, com abas por repositório.
keywords: terminal shell pty xterm console abas tabs acoplado
---

# Terminal integrado

Um PTY de verdade (xterm + node-pty), não um executador de comandos. Seu shell, seu
prompt, seus aliases.

![O terminal integrado](../../screenshots/terminal.webp)

- **Várias abas por repositório**, cada uma começando na pasta daquele repositório.
- Acople-o **embaixo** do grafo ou como uma **coluna à direita**; o painel lembra o
  tamanho dele.
- A visibilidade do terminal é por repositório: mudar para uma aba que nunca abriu
  um terminal o mantém fechado.
- As abas se nomeiam conforme o que está rodando nelas.
- Colapsar a lista de terminais a encolhe num **trilho**: um ícone por terminal
  (terminais divididos mostram um mini mapa de painéis), clique para trocar, botão
  direito para o menu de sempre com renomear/dividir/matar.
- **Arraste um terminal sobre outro** na lista para fundi-los em um grupo
  dividido. Cada terminal mantém seu nome como painel; o grupo resultante
  recebe um novo nome numerado.

![Dois painéis divididos lado a lado num mesmo grupo de terminal](../../screenshots/terminal-split.webp)

## O seu PATH

O shell sobe como **shell de login**, igual ao Terminal.app ou ao iTerm, então
`~/.zprofile`, `~/.zlogin` e `~/.bash_profile` são executados. Isso importa
porque gerenciadores de versão e o `brew shellenv` costumam se instalar ali —
uma ferramenta como `fvm`, `nvm` ou `pyenv` que funciona no seu terminal
funciona aqui também.

O Gitcito também pergunta ao seu shell de login qual é o `PATH` real na
inicialização e o mescla em tudo o que dispara, porque um app gráfico aberto
pelo Dock não herda quase nada. Se um comando continuar não sendo encontrado,
confira se ele está no `PATH` de um shell de login, e não só no de um
interativo.

Qualquer coisa que você rode aqui é invisível para o travamento interno do Gitcito,
então um `git rebase` longo digitado à mão e um clique na interface ainda podem
colidir — o app se atualiza a partir do disco quando o terminal muda alguma coisa.

**Veja também:** [Rodar e depurar](launch.md) · [Hooks](hooks.md)
