---
title: Segurança e segredos
category: Segurança
order: 70
summary: Mascaramento, proteções, o keychain — e o que o Gitcito se recusa a fazer.
keywords: segurança security segredos secrets mascaramento masking keychain safeStorage tokens branch protegida arquivo grande proteção guard privacidade
---

# Segurança e segredos

O Gitcito **não tem backend**. As únicas chamadas de rede são para o seu host Git e,
se você ligar, para o seu provedor de IA.

![Configurações de segurança](../../screenshots/settings-security.webp)

## Mascaramento de segredos

Valores em `.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials.*` e companhia são
renderizados como `KEY=••••••` nas visões de diff, arquivo e blame, para que um
compartilhamento de tela ou um print não os vaze.

É **só de exibição**: nunca muda o arquivo e nunca muda o que você prepara. Um
interruptor de olho os revela por visão. `.env.example`, `.sample` e `.template` são
tratados como templates, não como segredos.

![Um .env renderizado com todo valor mascarado, e o interruptor de revelar](../../screenshots/secret-masking.webp)

## Proteções antes de você causar dano

| Proteção | Quando |
|---|---|
| **Arquivo de segredo** | Ao commitar algo que parece uma credencial — com um *Ignorar e parar de rastrear* em um clique |
| **Arquivo grande** | Ao commitar um blob acima do tamanho (limite em Configurações → Segurança) |
| **Branch protegida** | Ao commitar direto na `main`/`master`, ou dar force push numa delas |
| **Segredos rastreados** | Ao dar push num repositório que *rastreia* um arquivo de segredo — avisado uma vez por sessão |

## O keychain do sistema

Tokens e entradas do [cofre](vault.md) são criptografados com o keychain do seu
sistema (o `safeStorage` do Electron), nunca com uma chave no arquivo de
configurações.

**Nada toca no keychain até você mandar.** Antes que o diálogo de permissão do
próprio sistema possa aparecer, o Gitcito explica o que está sendo guardado, o que
ele não consegue fazer (um app só consegue ler de volta a entrada que ele mesmo
criou — as suas outras senhas são inalcançáveis), e que dizer não está tudo bem: os
tokens então vivem na memória apenas pela sessão, o cofre fica fechado, e você pode
ligar depois em **Configurações → Segurança → Keychain do sistema**.

Uma instalação nova faz **zero** chamadas ao keychain até algo de fato precisar ser
guardado.

## Compartilhando com segurança

O [compartilhamento seguro](secure-share.md) exporta configurações, entradas do
cofre ou workspaces inteiros como um **bundle criptografado** — segredos só são
incluídos quando você marca a caixa.

**Veja também:** [Cofre](vault.md) · [Compartilhamento seguro](secure-share.md)
