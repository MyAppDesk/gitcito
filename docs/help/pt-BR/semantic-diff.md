---
title: Diff semântico
category: Lendo mudanças
order: 21
summary: O que mudou, símbolo por símbolo — renomeações, mudanças de assinatura, movimentações.
keywords: diff semântico semantic diff ast tree-sitter renomear rename assinatura signature movido moved símbolos symbols o que mudou
---

# Diff semântico

Uma renomeação pura aparece num diff de linhas como um arquivo inteiro removido e
um arquivo inteiro adicionado. Tecnicamente verdadeiro e completamente inútil.

Acima de cada diff de arquivo, o Gitcito mostra uma faixa **O que mudou**: as duas
versões do arquivo são analisadas com **tree-sitter** — árvores de sintaxe de
verdade, não expressões regulares — e suas declarações são pareadas.

![A faixa "o que mudou": renomeações e mudanças de assinatura, símbolo por símbolo](../../screenshots/semantic-diff.webp)

| Veredito | Exemplo |
|---|---|
| **Renomeado** | `startServer` → `bootServer` |
| **Assinatura** | `open(path)` → `open(path, mode)` |
| **Adicionado** / **Removido** | uma função nova; uma função apagada |
| **Movido** | mesmo código, 40 linhas mais abaixo |
| **Alterado** | mesmo nome e mesma assinatura, corpo diferente |

Renomeações e mudanças de assinatura vêm primeiro na ordenação — são o que quem
revisa não pode deixar passar. Clique numa linha para pular até aquele símbolo no
diff.

## O que ele consegue analisar

TypeScript, TSX, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP,
Swift, Kotlin, Scala, Lua, Bash e Zig.

Um arquivo cuja linguagem não tem gramática simplesmente mantém o diff de linhas
normal — a faixa nem aparece. O mesmo vale para arquivos acima de 400 KB.

## Limites honestos

- Uma renomeação cujo corpo também mudou é reportada como renomeação **e** avisa
  disso.
- Duas funções de uma linha que por acaso se parecem *não* são pareadas: abaixo de
  um limite de tamanho a correspondência precisa ser quase exata, então você
  recebe um removido + adicionado limpo em vez de uma renomeação fictícia.
- Símbolos que só deslizam algumas linhas porque algo acima deles cresceu não são
  reportados como "movidos" — isso soterraria as movimentações de verdade.

**Veja também:** [Visualizador de diff](diffs.md) · [O que mudou desde](range-diff.md)
