---
title: Bundles e arquivos
category: Sincronização e vários repositórios
order: 58
summary: Um repositório como um arquivo único do qual o git consegue clonar, ou uma árvore como um zip que ninguém precisa do git para abrir.
keywords: bundle git bundle archive arquivo zip tarball tar gz exportar air gap offline pendrive usb e-mail transferência export-ignore gitattributes clonar de arquivo intervalo range
---

# Bundles e arquivos

Duas formas de colocar um repositório num arquivo único. Elas parecem
intercambiáveis e não são, e escolher a errada é a razão inteira desta página
existir.

| | Um **bundle** | Um **arquivo compactado** |
|---|---|---|
| Contém | Histórico: commits, branches, tags | Os arquivos em um commit |
| Aberto por | `git clone` / `git fetch` — ele *é* um remote | Qualquer ferramenta de descompactação |
| Depois | Você pode buscar dele de novo, fazer merge, seguir trabalhando | Nada. É um instantâneo |
| Use para | Levar trabalho para uma máquina sem rede | "Me manda o código na v2.1" |

`⌘K` → **Empacotar o repositório (bundle)** ou **Exportar um arquivo**.

![Empacotando um repositório num arquivo único, com a opção de intervalo pronta](../../screenshots/export.webp)

## Bundles

Um bundle é a resposta do git para um vão que rede nenhuma atravessa: uma máquina
isolada da rede, um pendrive, um anexo de e-mail, um laptop num avião. Do outro
lado, roda-se `git clone work.bundle myrepo` e nasce um repositório de verdade, com
o seu histórico e as suas branches, que busca daquele arquivo como se ele fosse um
servidor.

Três escopos:

| Escopo | O que viaja | Tamanho |
|-------|--------------|------|
| **Tudo** | Toda branch e tag, histórico completo | O repositório inteiro |
| **Uma branch ou tag** | Aquela ref e tudo que ela alcança | Normalmente quase tudo |
| **Um intervalo de commits** | Só o que está entre as duas pontas | Pequeno |

**Um bundle de intervalo é um patch de histórico, não um repositório.** Ele
registra a ponta distante como *pré-requisito*: o git se recusa a abri-lo num
repositório que ainda não tenha aquele commit, porque não haveria onde prender os
commits novos. Esse é o comportamento certo e uma surpresa na primeira vez. Use um
intervalo quando o outro lado já tem o seu trabalho até certo ponto — a tag que ele
recebeu por último, o commit do qual vocês dois ramificaram.

### Recebendo um

**Importar um bundle…** lê o arquivo, lista o que ele contém, e diz de cara se este
repositório consegue usá-lo — se faltam pré-requisitos, ele te diz quantos, em vez
de falhar depois com o texto do próprio git.

As refs importadas caem em **`bundle/…`**, no namespace de rastreamento remoto. Nada
local se move: nenhuma branch é avançada, nenhum trabalho é sobrescrito. Você então
faz merge, rebase ou checkout de `bundle/main` nos seus próprios termos, exatamente
como faria com uma branch de qualquer outro remote.

Para começar um repositório *novo* a partir de um bundle, clone do arquivo num
terminal: `git clone work.bundle myrepo`. O Gitcito importa para dentro de um
repositório aberto; ele não clona a partir de um arquivo.

## Arquivos compactados

O `git archive` escreve a árvore de um commit como zip ou tarball. Sem `.git`, sem
histórico, sem jeito de buscar dele — que é exatamente o ponto quando quem recebe
deve receber código-fonte, não um repositório.

| Opção | O que faz |
|--------|-------------|
| Referência | Branch, tag ou commit a exportar. Uma tag é a resposta usual |
| Formato | `zip`, `tar.gz` ou `tar` |
| Envolver num diretório | Adiciona uma pasta de primeiro nível, para descompactar nunca espalhar arquivos por tudo |
| Somente este caminho | Exporta um subdiretório em vez da árvore inteira |

### O export-ignore é o motivo para usar isto

Um repositório pode marcar caminhos no `.gitattributes`:

```
.github/     export-ignore
test/        export-ignore
*.psd        export-ignore
```

Esses caminhos são **deixados de fora de todo arquivo compactado** enquanto
continuam no repositório. É assim que um projeto entrega um tarball de release sem
a configuração de CI, sem os fixtures e sem os 200 MB de arquivos de design, com a
regra morando no repositório em vez de no script de release de alguém.

## Limites que vale conhecer

- **Um bundle é uma cópia completa**, a menos que você use um intervalo. Empacotar
  um repositório de 2 GB escreve um arquivo de 2 GB, e demora o mesmo que um clone.
- **Bundles vazios são recusados** pelo git, não pelo Gitcito: um intervalo sem nada
  entre as pontas produz um erro em vez de um arquivo inútil.
- **A importação não faz merge.** As refs chegam em `bundle/…` e ficam ali até você
  fazer alguma coisa com elas.
- **Um arquivo compactado não tem histórico**, então não pode ser transformado de
  volta num repositório. Se quem recebe vai precisar commitar, mande um bundle.
- **O `export-ignore` só afeta arquivos compactados.** Ele não esconde nada de um
  clone, de um bundle ou do histórico — para isso, veja
  [remover um arquivo do histórico](history-purge.md).

Veja também: [Sincronização](syncing.md) · [Compartilhamento seguro](secure-share.md) ·
[Remover um arquivo do histórico](history-purge.md)
