---
title: Central de controle
category: Sincronização e vários repositórios
order: 51
summary: Todo repositório do workspace numa tela só, o pior primeiro.
keywords: central de controle mission control painel dashboard todos os repos visão geral status sujo não enviado atrasado workspace
---

# Central de controle

Vinte repositórios, e a pergunta é sempre a mesma: qual deles precisa de mim?

A central de controle responde. Todo repositório do **workspace ativo** numa tela
só, ordenado pelo que de fato precisa de você:

1. **Travados** — um rebase ou merge deixado pela metade, conflitos, um repo que
   não consegue nem ser lido.
2. **A sincronizar** — commits para puxar, depois commits para enviar.
3. **Em andamento** — trabalho não commitado, arquivos não rastreados.
4. **Limpos** — os quietinhos, lá embaixo, onde é o lugar deles.

![Todo repositório numa tela só, o pior primeiro](../../screenshots/mission-control.webp)

## O que uma linha te diz

Cada linha se lê da esquerda para a direita, e as colunas se alinham ao longo da
lista, então as contagens se comparam como numa tabela:

| Coluna | O que mostra |
|---|---|
| **Repositório** | Nome, grupo, a branch e seu upstream — ou **sem upstream** em âmbar, já que uma branch assim nunca é enviada por engano, mas também nunca sincroniza |
| **Último commit** | Assunto e autor: o que o repositório estava fazendo, sem abri-lo |
| **Contagens** | Conflitos · ↓ para baixar · ↑ para enviar · no stage · modificados · não rastreados · stashes · PRs abertos (quando o repo já está carregado). Passe o mouse para ver o que cada uma conta |
| **Atividade** | Um sparkline de commits de 14 dias, e quantos commits são |
| **Idades** | Quanto tempo desde o último commit, e desde o último **fetch** |

Passe o mouse no ícone de status para ver por que a linha está naquela posição —
"2 para enviar · 1 sem commit".

A idade do fetch está ali porque ler esta tela nunca faz fetch: a contagem "para
baixar" é tão recente quanto o último fetch. Quando uma branch com upstream está
sem fetch há um dia ou mais, ou nunca fez, a idade fica âmbar — faça fetch antes
de confiar num 0. O horário vem do próprio git, então um `git fetch` no terminal
também conta.

Numa janela estreita, a coluna do último commit sai primeiro; as contagens ficam.

Expanda uma linha (a setinha, ou <kbd>espaço</kbd>) para ver exatamente quais
commits estão esperando para ser enviados e quais arquivos estão sujos.

## Trabalhando a lista

- As pílulas de status no topo são **filtros** — clique em "3 travados" para ver só
  esses.
- Ordene por **urgência**, **nome** ou **atividade**.
- **Marque vários repos** para buscar neles, ou dê pull só nos que estão atrasados
  (o botão conta para você).
- **Fetch em N desatualizados** aparece quando há branches com upstream sem fetch
  há um dia ou mais, e faz fetch só nelas — as que podem estar com o "para baixar" errado.
- Ela se atualiza sozinha a cada 30 segundos enquanto está aberta.

| Tecla | Ação |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> ou <kbd>j</kbd> <kbd>k</kbd> | Percorrer a lista |
| <kbd>Enter</kbd> | Abrir aquele repositório |
| <kbd>f</kbd> / <kbd>p</kbd> | Fetch / pull nele |
| <kbd>espaço</kbd> | Expandir |
| <kbd>/</kbd> | Pular para o filtro |

## É uma visão, não uma aba

O medidor ao lado do nome do workspace a liga e desliga; clicar em qualquer aba te
devolve ao seu trabalho. Ela nunca acrescenta uma aba própria, e pertence ao
workspace em que você está — troque de workspace e você recebe o painel daquele
workspace.

Ler a central é **puramente local**: um `git status` por repositório, sem rede, sem
tokens. Abrir o painel nunca autentica em lugar nenhum. Buscar é sempre algo que
você pediu.

**Veja também:** [Workspaces e abas](workspaces.md) · [Workspaces, abas e grupos](workspaces.md)
