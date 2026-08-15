---
title: Repo-Wiki (KI)
category: KI
order: 81
summary: Ein generierter Leitfaden zu einer Codebasis, in dem jede Aussage eine Datei belegt.
keywords: wiki dokumentation generiert codebasis überblick abhängigkeiten dependencies architektur export docs
---

# Repo-Wiki

Richte es auf ein Repository, und es schreibt ein kurzes Wiki, das die Codebasis
erklärt.

## Die Repo-Karte

- **Sprachverteilung** nach Bytes.
- **Der Stack** — Frameworks als Badges (Next, Angular, Electron, Tailwind,
  Django…).
- **Abhängigkeiten**, direkt aus deinen Manifesten gelesen (`package.json`,
  `Cargo.toml`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, `Gemfile`…) und nach
  ihrer architektonischen Rolle gruppiert. Gerüstzeug — Typ-Stubs, Loader,
  Lint-Plugins — wird vorher herausgefiltert, und es können nur Pakete
  auftauchen, die das Projekt wirklich deklariert.
- **Ein Graph der Modulabhängigkeiten**, aus dem Quellcode geparst (JS/TS,
  Python, Go, Rust, Dart, Ruby, C/C++, PHP) und gegen die eigenen Dateien des
  Repositorys aufgelöst, damit ein Paket-Import nie zu einer falschen Kante
  wird.

## Die geschriebenen Seiten

Gitcito plant eine Handvoll Seiten aus den Dateien, die das Repository trackt —
zuerst Dokumentation und Manifeste, dann das, was sich am meisten ändert — und
schreibt jede Seite aus den Dateien, die sie abdeckt.

**Jede Aussage belegt die Datei, aus der sie stammt**, und eine Behauptung, die
keine Datei stützt, wird verworfen statt veröffentlicht. Die Seiten werden
parallel geschrieben und in einem Rutsch gespeichert, sodass ein
fehlgeschlagener Lauf nie ein gutes Wiki ersetzt. Es sagt dir, wenn das Wiki zu
einem älteren Commit geschrieben wurde.

## Export

**Nach docs/ exportieren** schreibt das Ganze als verlinktes Markdown nach
`docs/wiki/` — damit es committet, in einem PR reviewt und auf deinem Host
gelesen werden kann.

Dateien, die nach Geheimnissen aussehen, werden nie verschickt.

**Siehe auch:** [KI-Funktionen](ai.md)
