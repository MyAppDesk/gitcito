---
title: Chaves SSH
category: Sincronização e vários repositórios
order: 57
summary: Por que o seu token não faz nada por um remote git@, e como ver qual chave está falhando.
keywords: ssh chave key keys agente agent ssh-add ssh-keygen ed25519 publickey permission denied fingerprint impressão digital passphrase enviar github known_hosts
---

# Chaves SSH

**Configurações → Segurança → Chaves SSH.**

## Por que isto existe ao lado dos tokens

O Gitcito autentica duas coisas diferentes, e as pessoas razoavelmente supõem que
são uma só:

| | Autenticado por |
|---|---|
| A **API do host** — repos, PRs, issues, checks de CI | Seu [token](hosting.md) |
| Transporte git por `https://` | Seu token, injetado na URL |
| Transporte git por **`git@…`** | **Sua chave SSH, via o ssh do sistema** |

Um remote como `git@github.com:me/api.git` nunca encosta no token. O git entrega a
conexão ao `ssh`, que nunca ouviu falar de um personal access token. Isso não é um
caso de borda — é o que você recebe quando um colega configurou o repo, quando um
`.gitmodules` usa URLs `git@`, quando a sua empresa desabilita a autenticação por
HTTPS, ou quando o host é um GitLab autogerenciado.

Quando isso dá errado, o ssh diz `Permission denied (publickey)` e mais nada.
Tecnicamente verdadeiro, inútil como conselho.

![Cada chave em ~/.ssh com seu tipo, impressão digital e se o agente a está segurando](../../screenshots/ssh-keys.webp)

## O que a seção te conta

Cada chave encontrada em `~/.ssh` mostra seu tipo, tamanho, impressão digital e
comentário, mais o único fato que explica a maioria das falhas repentinas:

**no agente** / **fora do agente.** Uma chave que o agente não está segurando não
consegue autenticar nada, e o agente esquece o conteúdo dele ao reiniciar, a menos
que o sistema operacional tenha sido instruído de outra forma. "Funcionava ontem"
geralmente é isto.

## O que você pode fazer aqui

| Ação | O que ela roda |
|--------|--------------|
| **Copiar chave pública** | Coloca a linha do `.pub` na área de transferência, pronta para colar em qualquer host |
| **Adicionar ao agente** | `ssh-add` (com `--apple-use-keychain` no macOS, para sobreviver a um reboot) |
| **Enviar para o GitHub** | `POST /user/keys` com o token deste perfil |
| **Gerar chave** | `ssh-keygen -t ed25519`, comentada com o seu e-mail do git |
| **Testar conexão** | `ssh -T git@<host>`, traduzido numa frase |

**Testar conexão** existe porque a resposta do próprio ssh é enganosa: o GitHub te
autentica com sucesso e *depois* sai com um código de falha, já que ele não oferece
um shell. O Gitcito lê a mensagem em vez do código de saída, e mostra a saída crua
embaixo para você conferir a leitura dele.

## Os limites, ditos com todas as letras

- **O envio é só para o GitHub.** GitLab, Bitbucket e Azure DevOps ganham *Copiar
  chave pública* e um link direto para a página de configuração de chaves deles.
  Registrar chaves nos outros três não está implementado, e o botão não finge o
  contrário.
- **Gerar nunca sobrescreve.** Um nome já presente em `~/.ssh` é recusado.
  Sobrescrever uma chave privada revoga silenciosamente o seu acesso a tudo que
  confia nela, e nenhum diálogo de confirmação torna isso recuperável.
- **Passphrases não são guardadas pelo Gitcito.** Você digita uma ao gerar ou ao
  adicionar ao agente; ela é passada ao `ssh-keygen`/`ssh-add` e descartada.
  Persisti-la entre reboots é trabalho do keychain do sistema, via `ssh-add`.
- **Nenhuma edição de `~/.ssh/config`**, nenhum alias de host, nenhuma seleção de
  chave por repo. Isso mora na sua configuração de ssh, e o Gitcito não mexe nesse
  arquivo.

## O que nunca sai da sua máquina

**O Gitcito nunca lê, exibe ou transmite uma chave privada.** A seção lista as
metades públicas e as impressões digitais. A única coisa que chega a ser enviada
para algum lugar é a chave pública em que você aperta **Enviar** explicitamente — e
ela vai para o GitHub, sob o seu próprio token, depois de uma confirmação que
nomeia a impressão digital.

Veja também: [Segurança e segredos](security.md) · [Hosting e pull requests](hosting.md)
