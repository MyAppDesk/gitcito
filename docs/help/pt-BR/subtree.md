---
title: Subtrees
category: Branches e cirurgia
order: 49
summary: Vendorize outro repositório num diretório deste — arquivos realmente presentes, sem a cerimônia dos submódulos.
keywords: subtree git subtree vendorizar vendor biblioteca library embutir prefix split squash monorepo submódulo submodule alternativa pull push
---

# Subtrees

Um subtree copia outro repositório para dentro de um diretório do seu. Depois
disso os arquivos estão **realmente lá**: um `git clone` comum os traz, o
`git checkout` os move como qualquer outro arquivo, e ninguém precisa saber que o
diretório veio de outro lugar.

Essa é a diferença inteira para um [submódulo](lfs-sparse.md), que guarda só um
ponteiro e precisa de `--recurse-submodules`, de checkout próprio e de um HEAD
destacado próprio para você manter na cabeça.

`⌘K` → **Subtrees**.

![Um diretório vendorizado encontrado no histórico, com a origem que o Gitcito lembra para ele](../../screenshots/subtree.webp)

## A pegadinha que ninguém menciona

**O git não registra manifesto nenhum para subtrees.** Um submódulo tem
`.gitmodules`, listando toda url e todo caminho. Um subtree não tem nada — só um
trailer `git-subtree-dir:` no commit que fez a importação.

Ou seja, um repositório pode conter um subtree e não te dar jeito nenhum de
descobrir de onde ele veio. O Gitcito faz o que dá:

- A lista é descoberta a partir do histórico, lendo esses trailers. Qualquer
  subtree adicionado por qualquer pessoa, com qualquer ferramenta, aparece.
- O **repositório de origem e a ref** são lembrados pelo Gitcito, no git config
  deste repositório. Um subtree descoberto pelo histórico começa com esses campos
  vazios — preencha uma vez e o pull e o push funcionam a partir dali.

Os valores lembrados vivem em `gitcito.subtree.*` no `.git/config`, então ficam com
o repositório mas não viajam para um clone. **Esquecer** limpa esses valores e não
toca em mais nada.

## Adicionando um

| Campo | Significado |
|-------|---------|
| Diretório | Onde ele vai parar, ex.: `vendor/parser`. Não pode existir ainda |
| Repositório de origem | Uma URL ou um caminho no disco |
| Branch ou tag | O que importar |
| Squash | Trazer como um commit só, em vez do histórico inteiro |

**Deixe o Squash ligado** a menos que você tenha um motivo. Sem ele, cada commit da
biblioteca fica intercalado no seu log para sempre, e o `git log` deixa de ser
sobre o seu projeto.

## Convivendo com ele

| Ação | O que ela roda |
|--------|--------------|
| **Pull** | `git subtree pull` — as mudanças de upstream chegam como um merge no seu diretório |
| **Push** | `git subtree push` — suas mudanças locais dentro daquele diretório voltam para a origem |
| **Split** | `git subtree split -b <branch>` — extrai o histórico próprio do diretório numa branch, com os arquivos na raiz dela |

O **Split** é o que vale conhecer: ele transforma um diretório vendorizado de volta
no histórico de um repositório independente, que é como um subtree deixa de ser um
subtree.

## Limites que vale conhecer

- **O push é lento.** Ele recalcula o histórico do diretório do zero toda vez. Num
  repositório grande isso é de segundos a minutos, não instantâneo, e o Gitcito só
  pode esperar.
- **Um pull é um merge**, então pode conflitar como qualquer merge — você cai n[o
  resolvedor](conflicts.md).
- **O `git subtree` é um script de contrib**, não um builtin do git. Uma instalação
  enxuta do git pode não tê-lo; o Gitcito diz isso com todas as letras em vez de
  repassar um "'subtree' is not a git command".
- **Histórico com squash não pode ser des-squashado** depois. Os commits nunca
  foram importados.
- O Gitcito não converte um submódulo em subtree, nem o contrário.

Veja também: [Merge e rebase](merging.md) · [Plumbing com uma interface](lfs-sparse.md)
