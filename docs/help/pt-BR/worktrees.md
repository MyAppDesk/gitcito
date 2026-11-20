---
title: Worktrees e submódulos
category: Sincronização e vários repositórios
order: 54
summary: Vários checkouts de um mesmo repositório; e repositórios dentro de repositórios.
keywords: worktree worktrees submódulo submodule submodules checkout vinculado init sync
---

# Worktrees e submódulos

## Worktrees

Um worktree é um segundo checkout do mesmo repositório, numa pasta própria —
assim você olha a `main` enquanto a `feature/x` fica exatamente como você deixou,
sem stash.

- Crie e remova worktrees pela barra lateral. **Clique duas vezes** num para
  abri-lo numa aba própria; clique com o botão direito para *Abrir worktree*,
  *Revelar na pasta* e remover.
- O **+** da seção WORKTREES abre a janela de adicionar worktree: escolha a
  branch base, opcionalmente dê nome a uma branch nova criada a partir dela
  (deixe vazio para fazer checkout da própria base), escolha ou digite a pasta —
  sugerida como irmã, `repo--branch` — e decida se o worktree abre numa aba logo
  de cara.
- Clique com o botão direito em qualquer branch local → **Abrir num worktree**
  para criar um numa pasta irmã e abri-lo numa aba.
- Se você marcar **Indexar o worktree com codegraph** na janela (desligado por
  padrão), o repositório estiver indexado com codegraph (uma pasta
  `.codegraph/`) e a CLI estiver no PATH, um worktree novo também é indexado em
  segundo plano — sessões de agente abertas nele ganham a mesma inteligência de
  código sem um `codegraph init` manual.
- Marque **Copiar arquivos ignorados (.env) para o novo worktree** (desligado
  por padrão) e cada worktree novo já começa com os arquivos ignorados do
  repositório de origem no lugar — `.env`, ajustes locais, arquivos de
  credenciais —, listados pelo próprio mecanismo de ignore do git, então
  .gitignore aninhados e exclusões globais contam. Pastas geradas
  (`node_modules`, `dist`, `.venv`, …) e arquivos acima de 64 MB ficam de fora: o
  objetivo são configurações, não saída de build.
- O arquivo `.git` do worktree é gravado com um caminho `gitdir:` relativo em
  vez do caminho absoluto com letra de unidade que o git grava por padrão, então
  a árvore continua funcionando em shells que não entendem `E:/…` — terminais WSL
  e os agentes que rodam neles.
- Uma branch só pode estar em um worktree por vez, então fazer checkout de uma
  branch que outro worktree já tem não funciona — o git recusa com *already used
  by worktree at …*. O Gitcito leva você até lá: o menu da branch passa a dizer
  *Ir para `x` no worktree dela*, e clicar duas vezes na linha abre a aba
  daquele worktree em vez de falhar.

### Cuidando dos worktrees

Um worktree que você criou no mês passado é fácil de esquecer, e as perguntas
aparecem na hora de limpar: tem trabalho nele? Aquela pasta ainda existe? Cada
linha vinculada responde antes de você precisar perguntar.

| Na linha | Significa |
|---|---|
| **●3** | Três arquivos com mudanças não commitadas naquele worktree |
| **↑2 ↓1** | A branch dele está dois commits à frente e um atrás do upstream |
| 🔒 | Travado — passe o mouse para ver o motivo dado ao travar |
| **ausente**, nome riscado | A pasta sumiu; o git só tem o registro dela |

As contagens são lidas quando a seção abre, quando o commit daquele worktree
muda e quando a janela recupera o foco — não a cada atualização, porque cada uma
é um `git status` dentro de outra pasta.

Clique com o botão direito numa linha para:

| Ação | O que faz |
|---|---|
| **Travar worktree** | Impede o git (e qualquer outro cliente) de podar, mover ou remover o worktree. Dê um motivo — *no HD externo* — e ele aparece no cadeado. Para worktrees em mídias que nem sempre estão conectadas. |
| **Destravar worktree** | O contrário. Desfazer coloca o cadeado de volta com o mesmo motivo. |
| **Mover worktree…** | Move a pasta e atualiza os vínculos do git nos dois sentidos. Não aparece enquanto o worktree está travado ou aberto numa aba — abas e o layout delas são lembrados pelo caminho, então a aba ficaria apontando para o nada. Feche-a antes. Desfazer move de volta. |
| **Remover worktree** | Pergunta antes ao git o que seria perdido. Um worktree limpo ganha uma confirmação normal, e desfazer o recria na mesma branch e na mesma pasta. Um com mudanças não commitadas ganha uma confirmação separada, *Descartar e remover*, que diz a contagem, e não tem desfazer — as mudanças se perdem. |
| **Reconectar pasta movida…** | Só numa linha *ausente*: aponte para onde a pasta foi (você a moveu num gerenciador de arquivos) e o git refaz o vínculo com `git worktree repair`. |
| **Esquecer worktrees ausentes** | Também é o botão de borracha no cabeçalho da seção, que aparece quando alguma linha está ausente. Roda `git worktree prune`. |

O que essas ações **não** fazem:

- **Remover um worktree apaga também os arquivos ignorados dele** — `.env`,
  `node_modules`, saída de build. O git não os conta como mudanças, então até a
  confirmação "limpa" avisa isso, e desfazer não os traz de volta.
- **Esquecer só apaga o registro do git.** Não há arquivos para apagar — a pasta
  já sumiu — e worktrees travados são pulados, porque um worktree travado num
  disco desconectado parece exatamente um apagado.
- Um cadeado é um combinado entre clientes git, não proteção de arquivo: ele não
  impede que algo fora do git apague a pasta.
- O worktree principal — o próprio repositório — não pode ser travado, movido
  nem removido.
- Remover um worktree nunca apaga a branch dele. Apague-a pela lista de branches
  se já terminou com ela.

### Agrupando worktrees no cabeçalho

Abas de worktree abrem com rótulos `raiz · branch`, que ficam largos rápido.
Marque **Oferecer agrupar worktrees que compartilham um repositório raiz** na
janela de adicionar worktree (desligado por padrão, lembrado como a opção do
codegraph) e a janela se adapta à família: se a raiz ou um worktree irmão já está
num grupo, ela diz isso e o worktree novo entra nele; se a raiz está aberta numa
aba avulsa, aparece um campo **Nome do grupo** (preenchido com o nome da pasta da
raiz) e os dois vão para um grupo novo; sem nenhum membro da família aberto, ela
só avisa que o worktree abre numa aba própria. Dentro do grupo, os chips encolhem
para só a ponta (`main`, `feature/x`), porque o grupo já diz de qual repositório
eles são — uma opção em Configurações → Layout mantém o nome completo
`raiz · branch`, se você preferir. A oferta só junta worktrees com a mesma raiz —
nunca mistura repositórios sem relação.

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
