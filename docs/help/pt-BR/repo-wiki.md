---
title: Wiki do repo (IA)
category: IA
order: 81
summary: Um guia gerado para uma base de código em que toda afirmação cita um arquivo.
keywords: wiki documentação gerada codebase base de código visão geral dependências arquitetura exportar docs
---

# Wiki do repo

Aponte para um repositório e ele escreve uma wiki curta explicando a base de código.

## O cartão do repo

- **Composição de linguagens** por bytes.
- **A stack** — frameworks mostrados como selos (Next, Angular, Electron,
  Tailwind, Django…).
- **Dependências** lidas direto dos seus manifestos (`package.json`, `Cargo.toml`,
  `go.mod`, `pyproject.toml`, `pubspec.yaml`, `Gemfile`…) e agrupadas por papel
  arquitetural. O andaime — stubs de tipos, loaders, plugins de lint — é filtrado
  antes, e só pacotes que o projeto de fato declara podem aparecer.
- **Um grafo de dependências entre módulos**, parseado a partir do código-fonte
  (JS/TS, Python, Go, Rust, Dart, Ruby, C/C++, PHP) e resolvido contra os próprios
  arquivos do repo, para que um import de pacote nunca vire uma aresta falsa.

## As páginas escritas

O Gitcito planeja um punhado de páginas a partir dos arquivos que o repositório
rastreia — documentação e manifestos primeiro, depois o que mais muda — e escreve
cada página a partir dos arquivos que ela cobre.

**Toda afirmação cita o arquivo de onde veio**, e uma alegação que nenhum arquivo
sustenta é rejeitada em vez de publicada. As páginas são escritas em paralelo e
guardadas de uma vez só, então uma execução que falha nunca substitui uma wiki boa.
Ele avisa quando a wiki foi escrita num commit mais antigo.

## Exportar

**Exportar para docs/** escreve tudo em `docs/wiki/` como Markdown interligado — para
poder ser commitado, revisado num PR, e lido no seu host.

Arquivos com cara de segredo nunca são enviados.

**Veja também:** [Recursos de IA](ai.md)
