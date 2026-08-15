---
title: Configurações por repositório
category: Ferramentas de workspace
order: 94
summary: Branches protegidas, informações, analytics, histórico e o log de operações.
keywords: configurações do repo repo settings branches protegidas protected branches analytics log de operações operation log histórico informações engrenagem
---

# Configurações por repositório

A engrenagem ao lado das ferramentas da barra abre as configurações que pertencem a
**este** repositório, não ao app.

![Configurações por repositório](../../screenshots/repo-settings.webp)

| Aba | O que contém |
|---|---|
| **Geral** | Branches protegidas (uma seleção múltipla de branches, guardada no git config), assinatura |
| **Informações** | Notas e campos livres sobre este repositório, mantidos localmente |
| **Cofre** | As entradas do [cofre](vault.md) deste repositório |
| **Insights** | O [painel de histórico](insights.md) |
| **Analytics** | O que você fez neste repositório, contado localmente |
| **Histórico** · **Logs** | O log de operações: todo comando git que o Gitcito rodou, com a saída dele |

O log de operações é o honesto: quando algo se comporta de forma estranha, ele
mostra o comando exato e o erro exato, para que um relato de bug possa carregar
fatos em vez de adjetivos.

**Veja também:** [Segurança e segredos](security.md) · [Insights](insights.md)
