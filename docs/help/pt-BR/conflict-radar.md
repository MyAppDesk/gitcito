---
title: Radar de conflitos
category: Branches e cirurgia
order: 44
summary: Veja quais branches vão conflitar antes de fazer merge de qualquer uma delas.
keywords: radar de conflitos conflict radar merge prévia preview colisão risco branches merge-tree
---

# Radar de conflitos

Descobrir que uma branch conflita fazendo merge dela é um jeito caro de fazer uma
pergunta. O radar responde antes.

O Gitcito faz merge de cada branch numa base à sua escolha **dentro do banco de
objetos** (`git merge-tree --write-tree`). Sem checkout, sem mudança no índice, sem
mudança na árvore de trabalho, nada para limpar depois. Seu trabalho não commitado
pode ficar exatamente onde está enquanto a varredura roda.

![O radar, um veredito por branch](../../screenshots/conflict-radar.webp)

![Varrendo branch por branch, e depois abrindo os arquivos disputados](../../screenshots/clip-conflict-radar.webp)

## Usando

Abra pelo menu de ferramentas, por <kbd>⌘K</kbd> → *Radar de conflitos*, ou clique
com o botão direito numa branch para varrer tudo contra **aquela** branch.

Ele varre assim que abre, usando a sua branch atual como base.

| Veredito | Significado |
|---|---|
| **Vai conflitar** | Fazer merge exige mãos. Os caminhos exatos são listados. |
| **Merge limpo** | Ela se aplicaria sem briga. |
| **Já está dentro** | A base já a contém — nada para mesclar. |
| **Falhou** | O git recusou: históricos não relacionados, ref faltando. O motivo é mostrado. |

As branches são ordenadas da pior para a melhor, e a pior das piores — a que toca
em mais arquivos — vai para o topo.

## Arquivos disputados

Logo abaixo, **Arquivos disputados** ordena os caminhos por quantas branches os
estão reescrevendo. Duas branches brigando por um arquivo é uma conversa para ter
agora; cinco é um problema de design.

## Depois de uma varredura

As linhas de branch na barra lateral ganham um ponto colorido: vermelho vai
conflitar, verde está limpo, âmbar é uma branch que o git recusou. Branches já
contidas na base não recebem ponto — uma fileira de pontos cinzas em tudo que já
foi mesclado é só ruído.

> Varrer não muda nada. O `git status` continua limpo e o HEAD não se mexe.

**Veja também:** [O que mudou desde](range-diff.md) · [Merge e rebase](merging.md)
