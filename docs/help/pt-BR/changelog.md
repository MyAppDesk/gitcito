---
title: Gerador de changelog
category: Trabalhando com mudanças
order: 34
summary: Transforma os conventional commits entre duas refs num changelog agrupado.
keywords: changelog notas de release release notes conventional commits gerar CHANGELOG
---

# Gerador de changelog

Dê a ele duas refs — o padrão é **última tag → HEAD** — e ele transforma os
commits entre elas num changelog, agrupado por tipo de Conventional Commit.

![O gerador de changelog](../../screenshots/changelog-gen.webp)

- **Breaking changes** aparecem primeiro, venham do tipo que vierem.
- Depois Features, Fixes, Performance e por aí vai.
- Commits que não seguem convenção nenhuma caem em **Outros** em vez de serem
  descartados — um changelog que perde commits em silêncio é pior do que um
  changelog bagunçado.

Copie o resultado, ou **acrescente-o direto no topo do `CHANGELOG.md`**.

> Escrever suas mensagens no [estilo Conventional](committing.md) é o que torna
> isso útil. O gerador é tão bom quanto os assuntos que ele lê.

**Veja também:** [Commitando](committing.md) · [Hosting e pull requests](hosting.md)
