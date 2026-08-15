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

![Dois painéis divididos lado a lado num mesmo grupo de terminal](../../screenshots/terminal-split.webp)

Qualquer coisa que você rode aqui é invisível para o travamento interno do Gitcito,
então um `git rebase` longo digitado à mão e um clique na interface ainda podem
colidir — o app se atualiza a partir do disco quando o terminal muda alguma coisa.

**Veja também:** [Rodar e depurar](launch.md) · [Hooks](hooks.md)
