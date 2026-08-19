---
title: Radar de colegas
category: Branches e cirurgia
order: 45
summary: Quem moveu o quê no upstream — e se isso cai sobre o seu trabalho não commitado.
keywords: radar de colegas teammate radar atividade remota remote activity upstream sobreposição overlap arquivos sujos dirty colisão quem tocou conflito fetch
---

# Radar de colegas

Você está editando o `api.ts`. Outra pessoa também, numa branch que você não
olhou. O jeito habitual de descobrir é um conflito de merge na semana que vem;
o jeito do radar é uma lista, hoje.

Tudo é calculado a partir do seu **último fetch** — refs remote-tracking, um
`merge-tree` em memória, nada mais. Sem servidor, sem agente nas máquinas dos
seus colegas, sem rede além do fetch que você já ia fazer de qualquer jeito.

![Radar de colegas](../../screenshots/teammate-radar.webp)

## O que uma linha diz

Para cada branch remota que tem commits que o seu `HEAD` não tem:

| Coluna | Significado |
|--------|---------|
| Quem e quando | O último committer naquela branch, e há quanto tempo |
| Commits / arquivos | Quanto está chegando, e quantos arquivos isso toca |
| **Sobreposição** | Quais desses arquivos estão **sujos na sua árvore de trabalho agora mesmo** — a pílula vermelha |
| Risco | Se fazer merge daquela branch no `HEAD` conflitaria (o mesmo motor do [radar de conflitos](conflict-radar.md)) |

As linhas são ordenadas por quanto colidem com você: sobreposição primeiro,
depois conflitos previstos, depois o quão recente é a atividade. Expanda uma
linha para as listas exatas de arquivos; **Comparar** abre a comparação
completa entre branches.

## Quando ele se manifesta

Depois de cada fetch — manual ou automático — o radar varre em silêncio. Ele
mostra um toast só quando commits do upstream tocam arquivos que você modificou
**e** esse conjunto realmente mudou desde a última varredura. Sem arquivos
sujos, sem barulho: uma árvore de trabalho limpa não colide com nada.

## Limites

- Ele vê o que o último fetch viu. Um colega que ainda não fez push é
  invisível — isto lê refs, não mentes.
- A sobreposição é por caminho, não por linha: tocar no mesmo arquivo é um
  alerta, não prova de conflito. A coluna **Risco** é a resposta em nível de
  linha, mas só entre estados commitados.
- Branches paradas há mais de ~45 dias são puladas, e só as 30 movidas mais
  recentemente são varridas.

**Veja também:** [Radar de conflitos](conflict-radar.md) · [Fetch, pull e push](syncing.md) · [O que mudou desde](range-diff.md)
