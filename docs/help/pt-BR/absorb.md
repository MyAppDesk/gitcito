---
title: Absorb
category: Trabalhando com mudanças
order: 33
summary: Manda cada correção preparada de volta para o commit que introduziu aquela linha.
keywords: absorb absorver fixup autosquash amend preparado staged hunks blame revisão review correções
---

# Absorb

Você resolveu três comentários de revisão em três arquivos. O honesto seriam três
commits `fixup!` apontados para os pais certos. O que as pessoas realmente fazem é
um commit chamado "correções da revisão".

O Absorb faz a coisa honesta por você.

![O Absorb roteando cada hunk preparado para o commit que o introduziu](../../screenshots/absorb.webp)

## Como funciona

1. Prepare as correções.
2. Ferramentas → **Absorver mudanças preparadas…** (ou <kbd>⌘K</kbd>).
3. O Gitcito dá blame nas linhas que cada hunk preparado toca, descobre qual dos
   **seus commits ainda não enviados** as introduziu, e mostra o plano antes de
   fazer qualquer coisa.

O plano lista cada commit de destino com os hunks que vão para ele, mais um grupo
**Ainda não pertence a nada** — um arquivo novinho não tem histórico para ser
absorvido, então ele fica preparado para você commitar normalmente.

| Botão | O que acontece |
|---|---|
| **Criar fixups** | Um commit `fixup!` por destino. Nada é rebaseado. |
| **Criar fixups e rebase** | O mesmo, e em seguida um rebase com autosquash dobra tudo para dentro. |

## As regras que ele respeita

- **Só commits não enviados são candidatos.** Qualquer coisa já publicada não é
  nossa para reescrever. Se tudo já foi enviado, o absorb diz isso e não faz nada.
- **A árvore de trabalho nunca é tocada.** Só o índice e os commits que o próprio
  absorb cria.
- **Uma falha não deixa bagunça.** Se qualquer etapa falhar, HEAD e o índice são
  colocados de volta exatamente como estavam.
- Ele se recusa a rodar durante um merge ou rebase — aquele índice pertence ao git.

**Veja também:** [Rebase interativo](rebase.md) · [Staging](staging.md)
