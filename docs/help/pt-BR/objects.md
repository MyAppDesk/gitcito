---
title: Explorador de objetos
category: Repositório e histórico
order: 16
summary: Caminhe pela camada abaixo do grafo — commits, trees, blobs, tags e as refs que apontam para eles. Nada aqui muda nada.
keywords: objetos objects explorador de objetos blob tree commit tag ref plumbing cat-file ls-tree sha1 internals banco de dados rev-parse HEAD^{tree} loose packed
---

# Explorador de objetos

O git tem fama de ser complicado. Quase toda essa fama vem de nunca se ver o
modelo: **quatro tipos de objeto, e ponteiros**. Assim que você consegue clicar num
commit, cair na tree dele, e descobrir que o seu arquivo *é* um blob com um nome
dado a ele por uma tree, a porcelana deixa de ser mágica.

`⌘K` → **Explorador de objetos**. Nada nesta página consegue mudar um byte — toda
chamada por trás dela é uma leitura.

![Os campos de um commit, com a tree e os pais como links, ao lado da lista de refs](../../screenshots/objects.webp)

## Os quatro objetos

| Objeto | É | Sabe |
|--------|----|-------|
| **blob** | O *conteúdo* de um arquivo | Nada. Nem o nome, nem o caminho, nem o histórico |
| **tree** | Uma listagem de diretório | Nomes, modos, e o sha de cada blob ou tree filho |
| **commit** | Um instantâneo | Sua tree, seus pais, autor, committer, mensagem |
| **tag** | Uma tag anotada | O objeto para o qual aponta, quem tagueou, uma mensagem |

A surpresa, para a maioria das pessoas, é a primeira linha. **Um blob não tem
nome.** Dois arquivos com conteúdo idêntico em qualquer ponto do seu histórico são
o mesmo blob, guardado uma vez só. O nome mora na tree que aponta para ele — que é
por que o git rastreia conteúdo em vez de arquivos, e por que renomeações são
detectadas em vez de registradas.

Uma **ref** — `refs/heads/main`, `refs/tags/v1.0`, `HEAD` — é só um arquivo
contendo um sha. É nisso que consiste todo o "criar branch é barato".

## Caminhando

A coluna da esquerda lista toda ref do repositório, agrupada como o git as agrupa.
Clique numa para cair no objeto que ela nomeia.

Dali em diante tudo é link:

- Um **commit** mostra sua `tree` e cada `parent` — clique para atravessar até o
  instantâneo, ou para trás pelo histórico, um commit por vez.
- Uma **tree** lista suas entradas com modo, tipo, sha e tamanho. Clique num nome
  para abrir aquele filho.
- Um **blob** mostra seu texto (o começo dele, para qualquer coisa grande), ou diz
  com todas as letras quando é binário.
- Uma **tag anotada** mostra para o que ela aponta — clique para atravessar até o
  commit.

**Voltar** refaz seus passos.

## Digitando uma revisão

A caixa aceita qualquer coisa que o `git rev-parse` aceite, que é onde isto deixa
de ser um navegador e passa a ser um jeito de aprender:

| Digite isto | Para obter |
|-----------|--------|
| `HEAD` | O commit atual |
| `HEAD~3` | Três commits atrás |
| `HEAD^{tree}` | A tree daquele commit, descascada |
| `HEAD:src/app.ts` | O blob daquele caminho, diretamente |
| `v1.0^{}` | Para o que uma tag anotada aponta, em vez do objeto da tag |
| `a1b2c3d` | Qualquer objeto, pelo sha — abreviações funcionam |

Os dígitos de modo numa listagem de tree valem conhecer: `100644` um arquivo,
`100755` executável, `040000` uma subtree, `120000` um symlink, `160000` um gitlink
de submódulo — sendo este último tudo o que um submódulo guarda.

## Limites que vale conhecer

- **Somente leitura, de propósito.** Não há nada aqui com que escrever. Criar
  objetos na mão é um exercício de `git hash-object`, e pertence a um terminal.
- **Blobs grandes são truncados** depois dos primeiros 200 KB — o suficiente para
  ver o que é, não o suficiente para travar a janela.
- **Os tamanhos são o tamanho do conteúdo do objeto**, como o `git cat-file -s`
  reporta, não o que ele custa em disco depois de empacotado. Para isso, veja
  [manutenção](maintenance.md).
- **Objetos inalcançáveis continuam sendo objetos.** Cole um sha de um relatório de
  dangling do `git fsck` e ele abre, o que muitas vezes é a forma mais rápida de
  ver o que um commit perdido continha antes de decidir se vale recuperá-lo.

Veja também: [O grafo](graph.md) · [Manutenção do repositório](maintenance.md) ·
[Recuperação](recovery.md)
