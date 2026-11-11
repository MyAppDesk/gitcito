---
title: Perfis
category: Deixe do seu jeito
order: 101
summary: Identidades e tokens separados para o trabalho e para todo o resto.
keywords: perfil perfis profile profiles identidade git usuário user e-mail email tokens contas alternar
---

# Perfis

Um perfil junta uma **identidade Git** (nome e e-mail) com os **tokens de
integração** dela. Troque de perfil e os dois mudam juntos — os commits são
atribuídos corretamente e as chamadas de API usam a conta certa.

Útil quando a mesma máquina cuida de repositórios de trabalho e pessoais, ou quando
você tem duas contas no GitHub.

![Um perfil: a identidade git de um lado, os tokens de integração dela do outro](../../screenshots/settings-profiles.webp)

## Cada perfil com as suas contas

Além de um token, um perfil pode **vincular** um login que já esteja na máquina —
do credential helper do git ou do GitHub CLI — em Configurações → Integrações.
Um vínculo pertence a um só perfil: um perfil novo começa desconectado, e uma
conta que outro perfil já tem é recusada. Assim, dois perfis podem ter duas
contas do GitHub (ou do Azure DevOps) lado a lado. Veja [Hospedagem](hosting.md).

## Vínculo por repositório

Um repositório pode ser **vinculado a um perfil**, para que um fetch em segundo
plano nele sempre se autentique como a conta certa — mesmo enquanto você está
olhando um repositório que pertence à outra.

Os tokens vivem no [keychain do seu sistema](security.md), nunca no arquivo de
configurações.

**Veja também:** [Segurança e segredos](security.md) · [Hosting](hosting.md)
