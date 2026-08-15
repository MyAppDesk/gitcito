---
title: Remover um arquivo do histórico
category: Branches e cirurgia
order: 48
summary: Tire uma credencial vazada ou um binário enorme de todo commit — e entenda exatamente o que isso custa.
keywords: purgar purge histórico history reescrever rewrite filter-branch bfg filter-repo vazamento segredo secret credencial token remover arquivo blob grande encolher repositório backup pre-purge rotacionar navegar maiores arquivos
---

# Remover um arquivo do histórico

O `git rm` impede que um arquivo apareça em commits *novos*. Ele não faz nada com
os que já foram feitos: o blob continua no banco de objetos, continua em todo
clone, continua a um `git show` de distância.

Isso importa em duas situações — quando o arquivo era uma credencial, e quando ele
tinha 400 MB.

`⌘K` → **Remover arquivo do histórico**, ou clique com o botão direito no arquivo —
na árvore do projeto, na lista de arquivos de um commit, ou no compositor de
commit. O commit que *apagou* um arquivo costuma ser onde alguém percebe que ele
ainda está no histórico, então a saída está naquele menu também.

## Encontrando o caminho

Duas portas de entrada, porque elas respondem a perguntas diferentes.

**Digite** — relativo ao repositório, sem barra inicial — quando você já sabe o que
veio remover.

**Navegar pelo histórico** quando você não sabe. Ele lista todo caminho que já foi
commitado, do mais pesado ao mais leve, com quantas versões cada um tem e se ainda
está rastreado. Caminhos apagados são marcados como tal e costumam ser os que você
quer: um arquivo que sumiu da árvore de trabalho mas continua em todo clone é
exatamente o caso que um diálogo de arquivos normal não consegue mostrar, porque o
arquivo não está lá para ser escolhido.

A mesma lista responde ao outro motivo pelo qual as pessoas chegam aqui — *por que
este clone tem dois gigabytes* — já que ela é ordenada pelos bytes que os blobs de
cada caminho de fato ocupam. Escolher uma linha já faz a medição na hora.

![Todo caminho já commitado, do mais pesado ao mais leve, com os apagados marcados](../../screenshots/history-purge-browse.webp)

## Meça antes de concordar

Aperte **Medir** (ou escolha uma linha). Nada é escrito ainda. Você recebe:

| | |
|---|---|
| **Commits reescritos** | Todo commit a partir do primeiro que continha o arquivo |
| **Branches / tags** | Refs que vão se mover |
| **Ocupado pelos blobs** | Bytes que essas versões de fato ocupam |
| **Primeiro commit** | Onde a reescrita começa — tudo depois dele ganha um hash novo |

![A medição: commits reescritos, refs afetadas, bytes ocupados, e o aviso para rotacionar o segredo mesmo assim](../../screenshots/history-purge.webp)

Se a contagem for zero, o caminho está errado. Isso costuma ser um erro de
digitação ou um prefixo de diretório, não uma ausência.

## O que a reescrita realmente faz

O Gitcito copia toda branch e tag para `refs/gitcito/pre-purge/<timestamp>/…`, e
então roda:

```sh
git filter-branch --force \
  --index-filter 'git rm --cached --ignore-unmatch -- <path>' \
  --prune-empty --tag-name-filter cat -- --branches --tags
```

O `--index-filter` reescreve o índice diretamente em vez de fazer checkout de cada
commit, que é a diferença entre minutos e horas. O `--branches --tags` em vez de
`--all` é deliberado: o `--all` incluiria as refs de backup, e a reescrita comeria
a própria rede de segurança.

Commits que não continham nada além do arquivo removido são descartados
(`--prune-empty`). As tags são reapontadas para os commits reescritos.

## O backup, e por que o espaço ainda não volta

A purga é reversível, e o preço disso é que **o espaço em disco não é recuperado
até você mandar**. Enquanto o backup existir, os commits antigos continuam
alcançáveis, então o git não vai coletá-los.

| Ação | Efeito |
|--------|--------|
| **Restaurar** | Toda branch e tag volta ao commit anterior à purga; o arquivo volta junto |
| **Descartar backup** | Apaga as refs de backup, expira o reflog, roda `git gc --prune=now` — espaço devolvido, purga agora permanente |

São dois passos em vez de um, porque o primeiro é a metade recuperável e o segundo
não é.

## Rotacione o segredo mesmo assim

**Se uma credencial chegou a ser enviada, reescrever o seu histórico não
desvaza.** Alguém pode tê-la buscado; servidores de forja guardam objetos sem
referência por aí; um log de CI pode tê-la impresso. A reescrita impede que ela se
espalhe mais — ela não desfaz a exposição.

Rotacione a chave. Depois purgue, para que a próxima pessoa a clonar não a
encontre.

## O que ele não vai fazer

- **Ele não vai dar push.** Reescrever é local. Publicar o resultado significa um
  force push em toda branch afetada, e todo mundo precisa re-clonar ou fazer hard
  reset — a [proteção de force-push](syncing.md) é onde essa decisão mora.
- **Ele recusa numa árvore de trabalho suja** ou no meio de um merge/rebase. Uma
  reescrita move o HEAD repetidamente, e fazer isso em volta de trabalho não
  commitado é como ele se perde.
- **Ele reescreve por caminho, não por conteúdo.** Remover um segredo que foi colado
  dentro de um arquivo-fonte, em vez de morar num arquivo próprio, exige um filtro
  de conteúdo — isso é território do `git filter-repo --replace-text`, e o Gitcito
  não o embrulha.
- **O `filter-branch` é lento em históricos muito grandes.** Ele é o que vem com o
  git em todo lugar, que é por isso que é o que o Gitcito usa. Num repositório com
  dezenas de milhares de commits, o `git filter-repo` no [terminal](terminal.md) é
  a ferramenta mais rápida.
- **Os clones das outras pessoas não são o seu repositório.** Elas ficam com o
  histórico antigo até re-clonarem.
