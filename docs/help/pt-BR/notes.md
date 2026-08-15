---
title: Notas de commit
category: Lendo o histórico
order: 26
summary: Anexe texto a um commit que já foi enviado — sem alterar o commit.
keywords: notas notes git notes anotar comentário commit refs/notes revisão ticket amend rewrite push notes fetch notes
---

# Notas de commit

Uma mensagem de commit é escrita uma vez e depois congela: mudá-la reescreve o
commit, dá a ele um hash novo, e quebra todo mundo que já tem o antigo. Isso é
tranquilo uma hora depois de commitar e impossível uma semana depois.

O `git notes` é a saída. Uma nota é guardada **ao lado** do commit, em
`refs/notes/commits`, e anexar uma deixa o commit idêntico byte a byte. Ou seja,
funciona em histórico que já foi publicado — que é exatamente quando você mais
quer acrescentar alguma coisa.

Uso típico: a revisão que o aprovou, o ticket que ele fechou, por que ele foi
revertido, em qual release ele saiu.

## Escrevendo uma

Selecione um commit. Embaixo da mensagem existe uma seção **Nota**: *Adicionar uma
nota*, digite, **Salvar nota**. Várias linhas são bem-vindas.

![Escrevendo uma nota embaixo da mensagem de um commit já enviado, e depois salvando](../../screenshots/clip-commit-note.webp)

Salvar uma nota é uma ação comum do Gitcito — ela mostra um toast, e **Desfazer**
devolve o texto anterior, inclusive restaurando uma nota que você removeu.

Apagar o texto e salvar remove a nota; não existe nota vazia.

## Encontrando uma

Notas são invisíveis num log normal, que é a principal razão de as pessoas nunca
descobrirem que elas existem. O Gitcito marca um commit que carrega uma com um
pequeno ícone de nota na coluna de mensagem do grafo, de forma que a anotação seja
encontrável sem que você já saiba que ela está lá.

Pela linha de comando, `git log --notes` imprime as notas embaixo de cada
mensagem.

## Compartilhando

**Esta é a parte que surpreende todo mundo: um `git push` normal não envia notas,
e um `git fetch` normal não as busca.** Elas vivem fora de `refs/heads` e
`refs/tags`, então os refspecs padrão as ignoram por completo. Notas escritas no
seu laptop ficam no seu laptop até alguém movê-las explicitamente.

Ferramentas → **Nota** → *Enviar notas* / *Buscar notas*, por remote. Eles rodam:

```sh
git push <remote> refs/notes/*
git fetch <remote> +refs/notes/*:refs/notes/*
```

Alguns hosts também precisam que notas estejam habilitadas ou permitidas do lado
deles; uma rejeição ali é política do host, não um limite do Gitcito.

## Limites

- **Uma única ref de notas.** O Gitcito lê e escreve a `refs/notes/commits`
  padrão. Namespaces personalizados (`git notes --ref=review`) não são expostos —
  um repositório que os use não vai ver essas notas aqui.
- **Sem merge de notas divergentes.** Se duas pessoas anotam o mesmo commit e as
  duas dão push, o git recusa o segundo push. Resolver isso significa
  `git notes merge` no [terminal](terminal.md).
- **Notas não entram no backup de uma limpeza de histórico** nem nos
  [snapshots](recovery.md). São refs comuns e sobrevivem a operações normais, mas
  um repositório re-clonado do zero começa sem elas.

Veja também: [Commitando](committing.md) · [O grafo de commits](graph.md)
