---
title: Verificação do ambiente
category: Comece por aqui
order: 6
summary: Do que o Gitcito depende fora da própria instalação — git, LFS, terminal nativo, credential helper do git, GitHub CLI e observação de arquivos — verificado num só lugar.
keywords: ambiente environment doctor diagnóstico saúde verificação versão do git lfs node-pty terminal modo básico credential helper store gh github cli escopos workflow inotify max_user_watches
---

# Verificação do ambiente

Algumas falhas não têm nada a ver com o repositório. Elas vêm da máquina: um
git velho demais para o login de perfil, um terminal que caiu sem aviso para o
modo básico, um login do GitHub CLI que não pode enviar arquivos de workflow.
Cada uma aparece depois como um erro vago, no meio de outra coisa.
**Configurações → Ambiente** (também *Configurações: Ambiente* na paleta de
comandos) verifica tudo isso antes.

O [doctor do repositório](repo-settings.md) responde outra pergunta: se *este
repositório* consegue ser compilado aqui, a partir do que o `.gitcito.json` dele
pede. A verificação do ambiente cobre o próprio app e é igual para todos os
repositórios.

## O que é verificado

| Linha | Verde quer dizer | Amarelo ou vermelho quer dizer |
|-------|------------------|-------------------------------|
| **Git** | git 2.31 ou mais novo está no `PATH` | Mais velho que 2.31: a conta de um [perfil](profiles.md) não consegue entrar para fetch e push. Ausente: nada funciona até instalar o git |
| **Git LFS** | `git lfs` está instalado | Não instalado. Só repositórios que guardam arquivos no LFS precisam dele |
| **Terminal** | O terminal nativo carregou | O [terminal](terminal.md) roda no modo básico: sem cores, sem redimensionar, sem programas em tela cheia |
| **Credential helper** | O git tem um helper para as senhas HTTPS — global, ou para hosts específicos (o que o `gh auth setup-git` configura) | Nenhum helper, então o git fora do Gitcito pede toda vez. Ou `store`, que guarda as senhas em texto puro. Veja [Credential helper](credentials.md) |
| **GitHub CLI** | O `gh` está conectado com o escopo `workflow` | Conectado sem ele: o GitHub recusa qualquer push que altere `.github/workflows` |
| **Observação de arquivos** (Linux) | O limite do inotify é de pelo menos 65.536 | Um limite menor se esgota com alguns repositórios grandes abertos, e pastas novas param de atualizar o status |

Uma linha que não se aplica fica de fora: o GitHub CLI quando não está instalado
ou conectado, e a observação de arquivos no macOS e no Windows.

## Corrigindo o que ela encontra

Quando há correção, a linha mostra um comando com botão de copiar. Por exemplo,
`gh auth refresh -h github.com -s workflow` adiciona o escopo que falta, e uma
linha de `sysctl` aumenta o limite do inotify. **A página nunca roda nada
sozinha.** Algumas correções pedem `sudo` ou mudam a configuração global, e cabe
a você ler antes de rodar. Depois de rodar uma, clique em **Verificar de novo**.

## Limites

- Ela verifica o que o app enxerga do próprio processo. Um perfil de shell que
  muda o `PATH` só dentro do seu terminal pode fazer os dois discordarem.
- A linha do GitHub CLI reflete o login do próprio `gh`, não as contas
  conectadas em **Configurações → Integrações**. São credenciais separadas. Se
  faltar o escopo `workflow` numa delas, o efeito é um push recusado.
- Ela informa o que está instalado. Não instala nem atualiza nada.
