---
title: Commits assinados
category: Recuperação e proteção
order: 61
summary: Assinatura GPG, SSH ou X.509, com um selo de verificação por commit.
keywords: assinar assinatura sign signing gpg ssh x509 verificado verified signature selo badge confiança trust
---

# Commits assinados

Ligue a assinatura por repositório (**Configurações → engrenagem do repo**): GPG,
SSH ou X.509, com a chave que você escolher. O Gitcito escreve `commit.gpgsign`,
`gpg.format` e `user.signingkey` para aquele repositório — a mesma configuração que
qualquer outra ferramenta lê.

| | |
|---|---|
| ![Coluna de assinatura, claro](../../screenshots/signed-commits-light.webp) | ![Coluna de assinatura, escuro](../../screenshots/signed-commits-dark.webp) |

O grafo ganha uma **coluna de assinatura** dedicada e reordenável:

| Selo | Significa |
|---|---|
| **Verificado** | Assinatura boa, de uma chave em que o git confia |
| **Não verificado** | Assinado, mas a chave é desconhecida ou não validada |
| **Expirado** | A assinatura ou a chave dela expirou |
| *(nada)* | Sem assinatura |

Tags também podem ser assinadas — veja [Tags](tags.md).

**Veja também:** [Segurança e segredos](security.md)
