---
title: Worktrees e submódulos
category: Sincronização e vários repositórios
order: 54
summary: Vários checkouts de um mesmo repositório; e repositórios dentro de repositórios.
keywords: worktree worktrees submódulo submodule submodules checkout vinculado init sync
---

# Worktrees e submódulos

## Worktrees

Um worktree é um segundo checkout do mesmo repositório, numa pasta própria — então
você pode olhar a `main` enquanto a `feature/x` fica exatamente como você a deixou,
sem stash nenhum.

- Crie e remova worktrees pela barra lateral. **Duplo clique** abre uma worktree
  como aba própria; o botão direito traz *Abrir worktree*, *Mostrar na pasta* e a
  remoção.
- Clique com o botão direito em qualquer branch local → **Abrir num worktree** para
  criar um numa pasta irmã e abri-lo como aba.
- Uma branch só vive em uma worktree por vez, então dar checkout numa branch que
  outra worktree já segura não tem como funcionar — o git recusa com *already used
  by worktree at …*. O Gitcito te leva até lá: o menu da branch diz *Ir para `x`
  na sua worktree*, e o duplo clique na linha abre a aba daquela worktree em vez
  de falhar.

### Cuidando das worktrees

Uma worktree criada mês passado é fácil de esquecer, e as perguntas aparecem na
hora de limpar: tem trabalho nela? A pasta ainda existe? Cada linha responde
antes de você precisar perguntar.

| Na linha | Significa |
|---|---|
| **●3** | Três arquivos com alterações não commitadas naquela worktree |
| **↑2 ↓1** | A branch dela está dois commits à frente e um atrás do upstream |
| 🔒 | Bloqueada — passe o mouse para ver o motivo informado no bloqueio |
| **ausente**, nome riscado | A pasta sumiu; o git só tem o registro dela |

Os números são lidos quando a seção abre, quando o commit daquela worktree muda e
quando a janela volta ao foco — não a cada atualização, porque cada um é um
`git status` dentro de outra pasta.

Clique com o botão direito numa linha para:

| Ação | O que faz |
|---|---|
| **Bloquear worktree** | Impede o git (e qualquer outro cliente) de limpar, mover ou remover a worktree. Informe um motivo — *no disco externo* — e ele aparece no cadeado. Para worktrees em mídias que nem sempre estão conectadas. |
| **Desbloquear worktree** | O inverso. Desfazer bloqueia de novo, com o mesmo motivo. |
| **Mover worktree…** | Move a pasta e atualiza os vínculos do git nos dois sentidos. Não aparece com a worktree bloqueada nem aberta numa aba — abas e o layout delas são lembrados pelo caminho, então a aba ficaria apontando para o nada. Feche-a antes. Desfazer move de volta. |
| **Remover worktree** | Pergunta ao git o que seria perdido antes. Uma worktree limpa recebe a confirmação normal, e desfazer a recria na mesma branch e na mesma pasta. Uma com alterações não commitadas recebe outra confirmação, *Descartar e remover*, que diz quantos arquivos, e não tem desfazer — as alterações se perdem. |
| **Reconectar pasta movida…** | Só numa linha *ausente*: aponte para onde a pasta foi (você a moveu pelo gerenciador de arquivos) e o git refaz o vínculo com `git worktree repair`. |
| **Esquecer worktrees ausentes** | Também é o botão de borracha no cabeçalho da seção, que aparece quando alguma linha está ausente. Roda `git worktree prune`. |

O que essas ações **não** fazem:

- **Remover uma worktree apaga também os arquivos ignorados** — `.env`,
  `node_modules`, saída de build. O git não os conta como alterações, então até a
  confirmação "limpa" avisa, e o desfazer não os traz de volta.
- **Esquecer só apaga o registro do git.** Não há arquivos para apagar — a pasta
  já sumiu — e worktrees bloqueadas são puladas, porque uma worktree bloqueada
  num disco desconectado é idêntica a uma apagada.
- O bloqueio é um combinado entre clientes git, não uma proteção de arquivos: não
  impede nada fora do git de apagar a pasta.
- A worktree principal — o próprio repositório — não pode ser bloqueada, movida
  nem removida.
- Remover uma worktree nunca apaga a branch dela. Apague pela lista de branches
  se tiver terminado.

![As seções de worktree e submódulo da barra lateral, as duas povoadas](../../screenshots/worktrees.webp)

## Submódulos

Adicione, atualize (init e checkout), sincronize URLs e remova submódulos, com
status ao vivo para cada um:

| Status | Significa |
|---|---|
| **Em dia** | Em checkout no commit que o pai registra |
| **Modificado** | Em checkout em outro lugar, ou sujo |
| **Não inicializado** | Registrado, mas nunca colocado em checkout |

![Submódulos carregando seu status, uma linha cada](../../screenshots/submodule-states.webp)

**Veja também:** [LFS e sparse-checkout](lfs-sparse.md) · [Fetch, pull e push](syncing.md)
