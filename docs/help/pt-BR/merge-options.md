---
title: Opções de merge
category: Branches e cirurgia
order: 45
summary: As chaves do git merge para os merges que dão errado sempre do mesmo jeito — -X ours, espaços em branco, squash, subtree.
keywords: opções de merge merge options estratégia strategy -X ours theirs ignore-space-change whitespace espaços squash no-ff ff-only no-commit subtree resolve ort recursive log --merge por que conflito
---

# Opções de merge

Um merge simples é um botão, e na maior parte do tempo essa é a história inteira.
Esta página é para as outras vezes: o lockfile que colide em todo merge, o arquivo
que alguém reindentou, o projeto vendorizado cujos caminhos não batem. O git tem
chaves para os três há anos; elas só estão enterradas numa página de manual que
ninguém abre no meio de um conflito.

Clique com o botão direito numa branch → **Merge com opções…** — nas linhas de
branch e de remote da barra lateral *e* nos selos coloridos de ref no grafo, que
compartilham o mesmo bloco de menu — ou `⌘K` → **Merge com opções**.

![Opções de merge, com o comando git exato soletrado logo abaixo](../../screenshots/merge-options.webp)

O comando é impresso conforme você o monta. Ele está ali para ser conferido contra
o manual — e para ser rodado num terminal na próxima vez, sem este diálogo.

## Quando um hunk conflita

| Escolha | Flag | Significa |
|--------|------|-------|
| Parar e me perguntar | — | O padrão. Você resolve |
| Ficar com o lado desta branch | `-X ours` | Hunks em colisão resolvem para o que já está em checkout |
| Ficar com o lado que está chegando | `-X theirs` | Hunks em colisão resolvem para a branch que está entrando |

**`-X ours` não é `-s ours`.** A chave aqui decide apenas os hunks que de fato
colidem; toda outra mudança da outra branch é mesclada normalmente. A estratégia
chamada `ours` — que o Gitcito não oferece — pega a sua árvore inteira e joga o
outro lado fora, produzindo um commit de merge que afirma conter um trabalho que
não contém. Essa distinção é a coisa mais mal-entendida sobre merges no git.

**Ela não consegue decidir tudo.** Um conflito de modificar/apagar — um lado
editou um arquivo, o outro apagou — não é um hunk de conteúdo, e o `-X` deixa isso
para você. E está certo: não existe versão de "prefira o nosso" que responda se um
arquivo apagado deve voltar.

## Espaços em branco

| Escolha | Flag |
|--------|------|
| Ignorar mudanças em espaços em branco existentes | `-X ignore-space-change` |
| Ignorar espaços em branco por completo | `-X ignore-space-at-eol`, `-X ignore-all-space` |

O caso para o qual isso existe: uma branch reindentou um arquivo (ou um formatador
reindentou), a outra editou as mesmas linhas. O git vê duas edições numa linha e
para. Com os espaços em branco ignorados, a reindentação não é uma mudança a ser
pesada, e a edição de verdade passa pelo merge.

O resultado mantém os espaços em branco do *outro* lado nas linhas que ele tocou,
então rodar o formatador em seguida não é má ideia.

## O que registrar

| Escolha | Flag | Deixa você com |
|--------|------|-----------------|
| Fast-forward quando possível | — | Um commit de merge só quando o histórico divergiu |
| Sempre criar um commit de merge | `--no-ff` | Um commit de merge mesmo num fast-forward, para a branch ficar visível no grafo para sempre |
| Somente fast-forward, ou recusar | `--ff-only` | Nada, se um merge de verdade fosse necessário. Útil como verificação |
| Squash | `--squash` | As mudanças preparadas, nenhum merge registrado, o commit é seu para escrever |
| Fazer merge mas não commitar | `--no-commit` | O merge preparado e em andamento, para você inspecionar ou emendar antes |

**Squash e `--no-commit` não são a mesma coisa.** O squash esquece que houve merge:
o git não registra segundo pai, e a branch vai parecer não mesclada na próxima vez.
O `--no-commit` é um merge em andamento que está simplesmente esperando por você —
`MERGE_HEAD` está definido, e commitar o conclui normalmente.

**O `--ff-only` não falha em silêncio.** Se um commit de merge fosse necessário, o
git recusa e nada se mexe, que é exatamente o que faz dele uma boa verificação de
sanidade antes de um merge automatizado.

## Estratégia

| Estratégia | Para |
|----------|-----|
| Padrão (`ort`) | Tudo. O merge de três vias moderno do git |
| `subtree` | Os dois lados vivem em caminhos diferentes — um projeto vendorizado num subdiretório deste |
| `resolve` | O merge de três vias antigo. De vez em quando dá certo onde o `ort` desiste num histórico entrecruzado |

O `-s subtree` é o que vale lembrar. Fazer merge de atualizações de um projeto que
mora em `vendor/parser/` seria lido, de outra forma, como "todo arquivo apagado,
todo arquivo adicionado"; a estratégia subtree descobre o deslocamento de caminho
primeiro. Veja [subtrees](subtree.md) para o fluxo completo.

## Por que isso conflita

Dentro do [resolvedor de conflitos](conflicts.md) existe um botão **Por que isso
conflita**. Ele roda `git log --merge` para o arquivo à sua frente e lista, por
lado, os commits que o tocaram desde que as branches se separaram.

![Os commits de cada lado que tocaram no arquivo em conflito](../../screenshots/conflict-why.webp)

Marcadores de conflito dizem *o que* colide. Isto diz *quem mudou, quando e por
quê* — que costuma ser a pergunta que de fato decide a resolução, e o motivo para
ir perguntar a alguém antes de escolher um lado.

Se não mostrar nada, nenhum dos lados commitou uma mudança exatamente neste
arquivo: a colisão vem de uma renomeação ou de uma movimentação de diretório mais
acima.

## Limites que vale conhecer

- **As opções valem para um merge.** Elas não são lembradas, e não mudam a entrada
  simples **Fazer merge na atual** nem o menu de arrastar e soltar.
- **O Desfazer continua funcionando**: um merge rodado com opções registra a mesma
  entrada de undo, que reseta para `ORIG_HEAD`.
- **Merges polvo** (mais de duas branches de uma vez) não são oferecidos aqui.
- **As entradas "Merge X em Y" por ref do menu de commit** continuam sendo merges
  simples. Use o próprio selo de ref quando quiser as opções.
- **O `-X` decide em silêncio.** Nada marca quais hunks foram auto-resolvidos,
  então num merge importante, leia o diff depois em vez de confiar na ausência de
  conflitos.

Veja também: [Merge e rebase](merging.md) · [Conflitos](conflicts.md) ·
[Subtrees](subtree.md) · [Radar de conflitos](conflict-radar.md)
