---
title: Clonagem
category: Comece por aqui
order: 2
summary: Clone de uma URL ou direto do seu host — e reduza o que vem junto quando o repositório é enorme.
keywords: clone clonar shallow raso depth profundidade partial parcial filter blob none single branch submodules recursive ls-remote seletor de branch unshallow monorepo
---

# Clonagem

**Novo repositório → Clonar**, ou `⌘K` → *Clonar*. Cole uma URL, ou entre no
GitHub, GitLab, Bitbucket ou Azure DevOps e escolha entre os seus próprios
repositórios — o token do [perfil](profiles.md) escolhido é usado para o clone e
depois descartado, nunca escrito no `.git/config`.

Escolha uma pasta-mãe e um nome; a linha abaixo dos campos mostra exatamente onde
o repositório vai parar. Uma pasta que já existe é recusada em vez de receber o
clone por cima.

## Avançado — estreitando o clone

Tudo em **Avançado** vem desligado: deixe como está e você recebe um clone
comum e completo. Essas opções ganham seu lugar em repositórios onde "completo"
significa vinte minutos e vários gigabytes.

![O diálogo de clone com Avançado aberto: parcial, raso, branch única, submódulos e um seletor de branch](../../screenshots/clone-advanced.webp)

| Opção | O que o git faz | O que custa |
|--------|---------------|---------------|
| **Clone parcial** | `--filter=blob:none` | Histórico completo, sem conteúdo de arquivo. Os blobs chegam sob demanda, então abrir um arquivo antigo exige rede. |
| **Clone raso** | `--depth=N` | Só os N commits mais recentes existem. Blame, log, bisect e range-diff param no corte. |
| **Somente uma branch** | `--single-branch` | As outras branches ficam no remote até você buscá-las. |
| **Clonar submódulos** | `--recurse-submodules` | Todo submódulo também é feito checkout — mais tempo agora, nenhum diretório faltando depois. |
| **Branch para checkout** | `--branch <name>` | Começa nessa branch em vez da padrão do remote. |

**Parcial antes de raso.** Um clone parcial mantém todos os commits — o
histórico continua pesquisável, e só o conteúdo dos arquivos é buscado
preguiçosamente. Um clone raso realmente descarta histórico: o `git log` termina
no corte e o blame não enxerga além dele. Se você está clonando um monorepo para
trabalhar nele, parcial costuma ser o que você quer.

O raso é reversível: `git fetch --unshallow` no [terminal](terminal.md) preenche
o histórico de volta.

### Escolhendo a branch

Digite um nome de branch, ou aperte **Listar branches** para perguntar ao remote
o que ele tem (`git ls-remote --heads`) e escolher num dropdown. Isso é uma ida e
volta na rede, feita só quando você aperta o botão — nada é consultado enquanto
você digita.

Se a listagem falhar — uma URL privada ainda sem token, um erro de digitação, sem
rede — o campo continua sendo uma caixa de texto simples e o próprio clone
reporta o erro real.

### Duas notas sobre as flags

- **`--depth` implica `--single-branch`.** Com um clone raso, deixar *Somente uma
  branch* desmarcado é o que pede as outras branches de volta
  (`--no-single-branch`), e é por isso que a dica embaixo dela muda.
- **Clonar uma pasta local** normalmente ignora o `--depth` por completo, porque o
  git faz hardlink do banco de objetos em vez de buscar. O Gitcito clona por uma
  URL `file://` quando você pede uma cópia rasa de um repositório local, então a
  profundidade que você pediu é a profundidade que você recebe.

## Progresso

A barra reporta o que o git reporta: contando, comprimindo, recebendo,
resolvendo, fazendo checkout. Uma etapa que não consegue informar um total mostra
uma barra indeterminada em vez de uma porcentagem falsa.

O novo repositório abre numa aba, fixado ao perfil com que você clonou.
