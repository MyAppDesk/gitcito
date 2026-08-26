---
title: Problemas
category: Ferramentas do workspace
order: 92
summary: O que os analisadores do seu projeto dizem, e o quanto disso o seu diff causou.
keywords: problemas analisador diagnósticos erros avisos lint tsc typescript eslint dart analyze clippy cargo go vet ruff painel arquivos alterados
---

# Problemas

Todo projeto já traz uma ferramenta que diz o que está errado nele — `tsc`,
`dart analyze`, ESLint, Clippy, `go vet`, Ruff. O que nenhuma delas diz é se foi
o **seu** diff que introduziu os quarenta avisos que acabou de imprimir. O
Gitcito sabe quais arquivos estão sujos, então a mesma lista responde a isso com
um botão.

![O painel de Problemas e o contador da barra de status](../../screenshots/problems.webp)

A barra de status carrega a contagem — erros, avisos, informações: os três
números que o VS Code ensinou todo mundo a ler. Clique (ou use **Problemas** na
paleta de comandos) e o painel abre embaixo, agrupado por arquivo. Clicar numa
linha abre o arquivo ali.

## O que ele executa

| Se o repositório tem | O Gitcito executa |
|----------------------|-------------------|
| `pubspec.yaml` | `dart analyze --format=machine` |
| `tsconfig.json` | `tsc --noEmit` |
| uma configuração do ESLint | `eslint -f json` |
| `Cargo.toml` | `cargo clippy --message-format=short` |
| `go.mod` | `go vet ./...` |
| `pyproject.toml` ou `ruff.toml` | `ruff check --output-format=json` |

**Flutter entra pela linha do Dart:** um app Flutter é um projeto Dart, e
`flutter analyze` chama o mesmo analisador que `dart analyze`.

**O projeto não precisa estar na raiz.** Esses marcadores também são procurados
alguns níveis abaixo, então um app Flutter em `mobile/` ou um pacote em
`apps/web` é encontrado, e cada analisador roda no diretório do seu próprio
projeto. Um projeto aninhado do mesmo tipo é pulado quando um ancestral já o
cobre — um `tsconfig.json` na raiz diz exatamente isso — e uma varredura para em
doze projetos, porque um monorepo não deve subir cinquenta compiladores.

Um binário em `node_modules/.bin` ganha do que está no PATH, do mesmo jeito que
os scripts do próprio projeto resolvem. Tudo roda em paralelo, e a saída de cada
ferramenta vira uma forma só, sem duplicatas e ordenada: dois analisadores
apontando a mesma linha viram uma linha só.

**Nada roda sozinho.** `tsc --noEmit` num repositório grande são dezenas de
segundos, e esses comandos são a toolchain do repositório, não do Gitcito. Eles
começam quando você abre o painel ou aperta atualizar, nunca por conta própria.
Por isso a lista é um retrato: edite um arquivo e ela fica velha até você rodar
de novo.

## Só o que você mudou

O botão do cabeçalho descarta todo problema em arquivo que você não tocou. Essa é
a visão que vale deixar aberta: uma lista plana de todos os avisos de uma base de
código vira papel de parede em uma semana, enquanto "foi este diff que os
adicionou" é uma pergunta que se responde antes de commitar.

As pastilhas de severidade também filtram. Apagadas significam *mostrar tudo*;
acender uma restringe àquela severidade.

## Os limites

- **Sem language server.** Isto é uma varredura, não um daemon: sem rabiscos
  enquanto você digita, sem resultados antes de pedir.
- **Ferramenta que não está instalada é nomeada, não escondida.** O rodapé diz o
  que não deu para rodar, porque lista vazia sem explicação é pior que lista
  curta com motivo.
- **Só a saída legível por máquina é entendida.** Cada analisador é lido do seu
  formato de máquina documentado; uma ferramenta configurada para imprimir outra
  coisa é invisível aqui.
- **Cinco mil problemas é o teto.** Passando disso o painel avisa e para — um
  repositório nesse estado tem um problema maior que uma barra de rolagem.

**Veja também:** [CI local](local-ci.md) · [Terminal integrado](terminal.md)
