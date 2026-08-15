---
title: Blame & Dateihistorie
category: Änderungen lesen
order: 22
summary: Wer hat diese Zeile geschrieben, wann, und wie sah sie vorher aus.
keywords: blame historie verlauf datei zeile autor annotate annotieren reblame follow
---

# Blame & Dateihistorie

Öffne eine beliebige Datei und wechsle den Ansichtsmodus: **Vorschau ·
Dateiansicht · Diff-Ansicht · Blame · Historie**.

![Blame, mit dem Commit hinter jeder Zeile in der Randspalte](../../screenshots/blame.webp)

## Blame

Jede Zeile trägt ihren Commit, ihren Autor und ihr Datum, farblich nach Commit
codiert — Blöcke gemeinsamer Historie sind so auf einen Blick zu erkennen.

- **Der Zeile in den Diff folgen**: springe von einer Blame-Zeile direkt zu der
  Änderung, die sie erzeugt hat.
- **Blame vor diesem Commit erneut ausführen**: Rechtsklick auf eine Zeile, um
  die Datei so zu blamen, wie sie *vor* diesem Commit aussah — so läuft man die
  Historie einer Zeile rückwärts ab, ohne die Ansicht zu verlassen.

## Historie

Jeder Commit, der diese Datei berührt hat, neueste zuerst. Wählst du einen aus,
siehst du die Version der Datei aus diesem Commit — so kannst du durchblättern,
wie sie gewachsen ist.

![Jeder Commit, der eine Datei berührt hat, neueste zuerst](../../screenshots/file-history.webp)

Für das gesamte Repository statt einer einzelnen Datei nimm die
[Zeitmaschine](time-machine.md).

## Hover zum Erklären

Mit aktivierter KI bekommst du, wenn du <kbd>⇧</kbd> hältst (konfigurierbar,
oder ganz ohne Taste) und auf einen Bezeichner zeigst, eine einzeilige Erklärung
dazu, plus die Zeilen, auf die sie sich stützt — klick eine an, um dorthin zu
springen. Es liest nur ein nummeriertes Fenster rund um das Token, sagt also,
wenn etwas anderswo definiert ist, statt es zu erfinden. Siehe
[KI-Funktionen](ai.md).

**Siehe auch:** [Der Commit-Graph](graph.md) · [Diffs](diffs.md)
