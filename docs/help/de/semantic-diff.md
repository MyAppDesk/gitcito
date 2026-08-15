---
title: Semantischer Diff
category: Änderungen lesen
order: 21
summary: Was sich geändert hat, Symbol für Symbol — Umbenennungen, Signaturänderungen, Verschiebungen.
keywords: semantischer diff semantic diff ast tree-sitter umbenennung rename signatur signature verschoben moved symbole was sich geändert hat
---

# Semantischer Diff

Eine reine Umbenennung sieht im Zeilen-Diff aus wie eine komplett gelöschte und
eine komplett hinzugefügte Datei. Technisch korrekt und vollkommen nutzlos.

Über jedem Datei-Diff zeigt Gitcito einen Streifen **Was sich geändert hat**:
Beide Fassungen der Datei werden mit **tree-sitter** geparst — echte
Syntaxbäume, keine regulären Ausdrücke — und ihre Deklarationen einander
zugeordnet.

![Der Streifen „Was sich geändert hat": Umbenennungen und Signaturänderungen, Symbol für Symbol](../../screenshots/semantic-diff.webp)

| Befund | Beispiel |
|---|---|
| **umbenannt** | `startServer` → `bootServer` |
| **Signatur** | `open(path)` → `open(path, mode)` |
| **hinzugefügt** / **entfernt** | eine neue Funktion; eine gelöschte |
| **verschoben** | derselbe Code, 40 Zeilen weiter unten |
| **geändert** | gleicher Name, gleiche Signatur, anderer Rumpf |

Umbenennungen und Signaturänderungen stehen oben — sie sind das, was ein
Reviewer auf keinen Fall übersehen darf. Klick eine Zeile an, um im Diff zu
diesem Symbol zu springen.

## Was geparst werden kann

TypeScript, TSX, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP,
Swift, Kotlin, Scala, Lua, Bash und Zig.

Eine Datei, für deren Sprache es keine Grammatik gibt, behält schlicht ihren
normalen Zeilen-Diff — der Streifen erscheint dann gar nicht. Dasselbe gilt für
Dateien über 400 KB.

## Ehrliche Grenzen

- Eine Umbenennung, deren Rumpf sich ebenfalls geändert hat, wird als
  Umbenennung gemeldet **und** sagt genau das dazu.
- Zwei einzeilige Funktionen, die sich zufällig ähneln, werden *nicht* gepaart:
  unterhalb einer Größenschwelle muss die Übereinstimmung nahezu exakt sein, du
  bekommst also ein sauberes entfernt + hinzugefügt statt einer erfundenen
  Umbenennung.
- Symbole, die nur ein paar Zeilen verrutschen, weil etwas darüber gewachsen
  ist, werden nicht als „verschoben" gemeldet — das würde die echten
  Verschiebungen zuschütten.

**Siehe auch:** [Diffs & Vorschauen](diffs.md) · [Was sich geändert hat seit](range-diff.md)
