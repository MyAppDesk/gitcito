---
title: O que mudou desde
category: Lendo mudanças
order: 23
summary: Alguém deu force-push na branch que você revisou. Veja o que realmente mudou.
keywords: range-diff force push rebase reescrito rewritten revisão review interdiff reflog atualização forçada
---

# O que mudou desde

Você revisou uma branch. Alguém fez rebase nela e deu force-push. Um diff normal
agora não vale nada: depois de um rebase, todo commit é um commit novo, então
tudo parece novo.

O `git range-diff` pareia as duas versões commit a commit, e o Gitcito lê as
posições antigas direto do **reflog** — ou seja, nada precisou ser registrado com
antecedência para isso funcionar.

![Commits reescritos, novos e descartados depois de um force-push](../../screenshots/range-diff.webp)

| Veredito | Significado |
|---|---|
| **Reescrito** | Mesmo commit, alterado. Expanda para ver o interdiff — o ajuste na mensagem e a verificação extra, não o arquivo inteiro. |
| **Novo** | Adicionado desde a última vez que você olhou. |
| **Descartado** | Sumiu desde a última vez que você olhou. |
| **Inalterado** | Sobreviveu à reescrita intacto. |

## Como chegar lá

- **Um fetch que encontra histórico reescrito avisa você.** Um toast nomeia a
  branch, e a linha dela em Remotes ganha um **⟳** clicável que abre a comparação
  exatamente no commit para onde ela apontava antes.
- Clique com o botão direito em qualquer branch → *O que mudou desde…*
- <kbd>⌘K</kbd> → *O que mudou desde*

## Posições anteriores

Os chips embaixo dos campos de ref são o reflog da branch: atualizações forçadas,
rebases, resets, cada um com o momento em que aconteceu. Escolha um e a comparação
roda de novo contra ele. É esse o recurso inteiro — a história de onde uma branch
já esteve já está no seu disco.

**Veja também:** [Radar de conflitos](conflict-radar.md) · [Recuperação e reflog](recovery.md)
