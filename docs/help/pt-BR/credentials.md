---
title: Credential helper
category: Segurança
order: 73
summary: O armazenamento de senhas do próprio git — o terceiro — e por que o https fica te perguntando de novo.
keywords: credential helper senha password https pergunta de novo osxkeychain wincred manager libsecret store cache git-credentials texto puro esquecer revogado token 401
---

# Credential helper

O Gitcito guarda três tipos diferentes de segredo, e as pessoas razoavelmente supõem
que são uma coisa só:

| | Guardado por |
|---|---|
| Tokens de API do host — PRs, issues, checks de CI | O Gitcito, no [keychain do sistema](security.md) |
| Transporte `git@…` | Sua [chave SSH](ssh-keys.md), via o agente ssh do sistema |
| **Transporte `https://`** | **O credential helper do próprio git** |

O terceiro não é ideia de recurso para ninguém até dar errado, e aí ele produz as
duas reclamações mais comuns do git: *por que ele está me perguntando de novo?* e
*por que ele ainda está mandando o token que eu revoguei?*

`⌘K` → **Credential helper**.

![O helper configurado, as regras por host, e o aviso do arquivo em texto puro](../../screenshots/credentials.webp)

## O que você está olhando

Todo `credential.helper` configurado, no escopo de onde ele vem — `system`,
`global`, e então este repositório. **Os helpers se empilham**: o git pergunta a
cada um por vez, e um no nível do repositório não substitui um global.

Cada um é verificado contra a sua máquina:

| Sinalização | Significa |
|------|-------|
| **pronto** | O programa do helper existe e vai rodar |
| **não instalado** | Configurado, mas o programa está faltando — todo prompt cai de volta em digitar tudo de novo |
| **senhas num arquivo simples** | O helper `store` (veja abaixo) |

**Regras para hosts específicos** lista as seções `credential.<url>.*`. Elas ganham
da configuração simples para as URLs que casarem, e costumam ser a resposta para
"por que este host se comporta diferente".

## Escolhendo um

| Helper | Para onde a senha vai |
|--------|------------------------|
| `osxkeychain` | Keychain do macOS — criptografado, por usuário |
| `manager` | Git Credential Manager (Windows, multiplataforma) |
| `wincred` | Gerenciador de Credenciais do Windows |
| `libsecret` | O serviço de segredos do Linux (GNOME Keyring, KWallet) |
| `cache` | Memória, por 15 minutos. Nada em disco |
| `store` | **Um arquivo simples na sua pasta pessoal. Sem criptografia** |

O Gitcito oferece o que está de fato instalado nesta máquina, marca o que combina
com o seu sistema operacional, e deixa o resto acinzentado.

**O escopo importa.** *Para todo repositório* escreve no seu config global, que é o
que você quase sempre quer; *somente para este repositório* é para aquele repo
esquisito que se autentica contra outra coisa.

## O helper `store` e o `~/.git-credentials`

O `store` escreve linhas `https://user:password@host` em `~/.git-credentials`, em
texto puro, sem criptografia de nenhum tipo. Qualquer coisa que rode como você
consegue ler: um script, o postinstall de uma dependência, qualquer coisa.

Se esse arquivo existir, esta página avisa e conta as entradas. Ela nunca as mostra
— a contagem é o ponto inteiro, e ler o conteúdo para exibi-lo seria cometer o mesmo
erro.

Se você encontrar um e não era a intenção: escolha um helper de verdade aqui, apague
o arquivo e autentique-se de novo uma vez.

## Esquecendo uma credencial guardada

Quando um token é revogado ou rotacionado, o helper continua entregando o antigo e
todo push falha com um 401 que não nomeia nada. **Esquecer** pede ao helper
configurado que apague a entrada dele para aquele host — `git credential reject`,
que é a rota documentada do próprio git.

Nada é lido no caminho: o Gitcito nunca chama `git credential fill`, o comando que
imprimiria uma senha viva na saída padrão.

O próximo push pergunta uma vez, e o helper guarda a nova resposta.

## Limites que vale conhecer

- **Este é o armazenamento do git, não o do Gitcito.** Mudá-lo muda o que o seu
  terminal faz também — que é o ponto, e vale saber antes de mudar.
- **Helpers em nível de sistema são mostrados, não editáveis.** Eles moram num
  config em que só um administrador pode escrever.
- **O Gitcito não consegue listar o que um helper guarda.** Nenhuma API de
  credenciais expõe isso sem entregar os segredos, então o diálogo reporta
  configuração e apaga sob pedido, e nada mais.
- **Um token que você deu ao Gitcito é separado.** Revogar um não toca no outro; veja
  [segurança](security.md) para o lado do keychain.

Veja também: [Segurança](security.md) · [Chaves SSH](ssh-keys.md) ·
[Sincronização](syncing.md)
