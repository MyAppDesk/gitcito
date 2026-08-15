---
title: Cofre
category: Segurança
order: 71
summary: Um armazenamento local e criptografado para os segredos de que um repo precisa — nunca commitados.
keywords: cofre vault segredos secrets env keychain criptografado local por repo global copiar
---

# Cofre

Os valores de `.env` de que um projeto precisa têm que morar em algum lugar. O cofre
é esse lugar, sem que eles acabem dentro do repositório.

![O cofre](../../screenshots/vault.webp)

- **Criptografado em repouso** com o keychain do seu sistema.
- **Dois escopos**: entradas presas a um repositório, e um conjunto **global** que
  você pode referenciar de qualquer lugar.
- **Não é um arquivo, e não tem nada a ver com o seu `.env`.** As entradas são
  *associadas* a um repositório mas nunca escritas dentro dele, nunca commitadas,
  nunca enviadas.
- **Nada nunca sai da sua máquina.** Sem sync, sem nuvem.

## Usando

Abra com <kbd>⌘⇧V</kbd>, pelo menu de ferramentas, pelas Configurações, ou pela
paleta de comandos. Alterne entre qualquer repositório conhecido, revele ou copie um
valor, ou faça **Copiar como .env** de um conjunto inteiro direto para a área de
transferência.

## Levando de uma máquina para outra

O [compartilhamento seguro](secure-share.md) consegue empacotar o cofre num bundle
criptografado — e só quando você pede explicitamente que os segredos sejam
incluídos.

**Veja também:** [Segurança e segredos](security.md) · [Compartilhamento seguro](secure-share.md)
