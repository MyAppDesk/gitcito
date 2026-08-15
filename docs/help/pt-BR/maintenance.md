---
title: Manutenção do repositório
category: Repositório e histórico
order: 15
summary: Quanto o repositório custa em disco, quanto disso é recuperável, e o que cada tarefa do git realmente faria.
keywords: manutenção maintenance gc coleta de lixo garbage collect repack prune fsck count-objects loose packed objetos espaço em disco tamanho otimizar optimise optimize commit-graph git maintenance agendar dangling
---

# Manutenção do repositório

O git nunca te diz quanto um repositório custa. Ele continua funcionando no estado
em que o banco de objetos estiver, então o primeiro sinal de problema costuma ser
um clone que se arrasta ou um laptop sem disco — muito depois do ponto em que um
único comando teria resolvido.

Este painel é o mostrador que faltava: para onde foi o espaço, quanto dele é
recuperável, e o que cada tarefa faz antes de você rodá-la.

`⌘K` → **Manutenção do repositório**.

![Uso de disco dividido em empacotado, solto e inalcançável, com as tarefas de manutenção logo abaixo](../../screenshots/maintenance.webp)

## Lendo os números

Tudo vem de `git count-objects -v` e de uma caminhada de alcançabilidade de
verdade — nada é estimado.

| Linha | O que é | Por que cresce |
|-----|-----------|--------------|
| **Empacotado** | Objetos dentro de packfiles, comprimidos e com deltas | Este é o estado saudável |
| **Solto** | Um arquivo por objeto, mal comprimido | Todo commit, todo fetch escreve destes |
| **Inalcançável** | Objetos que nada mais aponta | Commits descartados, mensagens emendadas, rebases abandonados |

A contagem ao lado de **Solto** — *"n objetos, m já empacotados"* — é a que vale
observar. Aqueles `m` estão guardados em dobro: uma vez soltos, uma vez dentro de
um pack. São pura duplicação, e o `git gc` é o que os colapsa.

**Inalcançável ainda não é lixo.** Esses objetos são o que faz o `git reflog`
trazer de volta um commit que você resetou fora. O git os mantém por duas semanas
de propósito.

## As tarefas

| Botão | Roda | Custo |
|--------|------|------|
| **Otimizar** | `git gc` | De segundos a um minuto. A resposta certa quase sempre |
| **Reempacotar do zero** | `git gc --aggressive` | Minutos num repositório grande. Recalcula cada delta |
| **Reconstruir o commit graph** | `git commit-graph write --reachable` | Rápido. Deixa o log e as caminhadas do grafo perceptivelmente mais ágeis |
| **Verificar integridade** | `git fsck --dangling` | Lento num repositório grande, não muda nada |
| **Descartar inalcançáveis agora** | `git gc --prune=now` | Destrói a rede de segurança do reflog |

**Otimizar** é a opção a que recorrer. Ela empacota os objetos soltos, descarta o
que está inalcançável há mais de duas semanas, e deixa o histórico recente
recuperável.

**Reempacotar do zero** é supervalorizado. Ele joga fora cada delta existente e
recalcula do nada, o que leva minutos e normalmente economiza uns poucos por cento
em relação a um gc comum. Vale fazer uma vez depois de importar um histórico
enorme; não vale fazer rotineiramente.

**Descartar inalcançáveis agora** pergunta antes, e a confirmação diz quantos
objetos e quanto espaço. Depois disso, um commit que você resetou fora uma hora
atrás é irrecuperável — a entrada do reflog pode continuar listada, mas o objeto
por trás dela se foi.

## Verificar integridade

O `git fsck` verifica se todo objeto referenciado por outro objeto está de fato
presente e internamente consistente.

- **Objetos pendurados (dangling) são normais.** São os inalcançáveis, listados
  pelo nome. Um repositório com centenas deles depois de um rebase está saudável.
- **Objetos faltando são dano** — uma escrita truncada, um disco ruim, uma
  transferência interrompida. Se algum aparecer, não reempacote: reempacotar um
  banco de dados danificado pode transformar um problema recuperável num problema
  permanente. Clone uma cópia boa do seu remote e leve suas branches não enviadas
  com um [bundle](export.md).

## Manutenção em segundo plano

A caixa de seleção registra o repositório no **`git maintenance`**, que empacota e
faz prefetch numa agenda que o seu sistema operacional executa (launchd, systemd ou
Agendador de Tarefas).

Nada aqui é específico do Gitcito: a mesma agenda serve ao seu terminal, e
`git maintenance unregister` desfaz isso de qualquer lugar. Desmarcar a caixa faz
exatamente isso, e deixa a agenda no lugar para quaisquer outros repositórios
registrados.

## Limites que vale conhecer

- **A contagem de inalcançáveis exige uma caminhada de alcançabilidade completa**,
  então abrir o painel num repositório muito grande demora um instante. Esse é o
  número honesto, não uma estimativa.
- **Os tamanhos são o que o disco entrega**, não o comprimento do conteúdo. Um
  objeto solto de 400 bytes ainda ocupa um bloco de 4 KB, que é por que mil deles
  custam megabytes — e por que empacotá-los vale a pena.
- **Um worktree ou submódulo tem o próprio `.git`**, então o tamanho mostrado é só
  o deste repositório.
- **A manutenção não consegue encolher o histórico.** Se um blob de 400 MB está num
  commit, ele é alcançável, e o gc vai mantê-lo para sempre — isso é
  [remover um arquivo do histórico](history-purge.md), uma operação diferente e
  muito mais disruptiva.
- **O Gitcito nunca roda gc pelas suas costas.** O próprio `gc --auto` do git ainda
  pode, como sempre pôde; se um falhar, ele deixa uma nota em `.git/gc.log`, que
  este painel traz à tona.

Veja também: [Remover um arquivo do histórico](history-purge.md) ·
[Bundles e arquivos](export.md) · [Recuperação](recovery.md)
