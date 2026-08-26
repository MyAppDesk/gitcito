---
title: Probleme
category: Workspace-Werkzeuge
order: 92
summary: Was die Analyzer deines Projekts sagen — und welcher Teil davon auf dein Diff zurückgeht.
keywords: probleme analyzer diagnose fehler warnungen lint tsc typescript eslint dart analyze clippy cargo go vet ruff panel geänderte dateien
---

# Probleme

Jedes Projekt bringt bereits ein Werkzeug mit, das dir sagt, was daran nicht
stimmt — `tsc`, `dart analyze`, ESLint, Clippy, `go vet`, Ruff. Was keines davon
sagt: ob **dein** Diff die vierzig Warnungen verursacht hat, die es gerade
ausgegeben hat. Gitcito weiß, welche Dateien schmutzig sind — dieselbe Liste
beantwortet die Frage mit einem Schalter.

![Die Probleme-Leiste und der Zähler in der Statusleiste](../../screenshots/problems.webp)

Die Statusleiste trägt den Zähler — Fehler, Warnungen, Hinweise: die drei Zahlen,
die VS Code allen beigebracht hat. Ein Klick (oder **Probleme** in der
Befehlspalette) öffnet unten die Leiste, nach Datei gruppiert. Ein Klick auf eine
Zeile öffnet die Datei genau dort. Vor dem ersten Durchlauf zeigt er Striche statt Nullen: es hat noch niemand nachgesehen, und drei Nullen würden etwas anderes behaupten.

## Was ausgeführt wird

| Wenn das Repository hat | führt Gitcito aus |
|-------------------------|-------------------|
| `pubspec.yaml` | `dart analyze --format=machine` |
| `tsconfig.json` | `tsc --noEmit` |
| eine ESLint-Konfiguration | `eslint -f json` |
| `Cargo.toml` | `cargo clippy --message-format=short` |
| `go.mod` | `go vet ./...` |
| `pyproject.toml` oder `ruff.toml` | `ruff check --output-format=json` |

**Flutter deckt die Dart-Zeile ab:** eine Flutter-App ist ein Dart-Projekt, und
`flutter analyze` ruft denselben Analyzer auf wie `dart analyze`.

**Das Projekt muss nicht im Wurzelverzeichnis liegen.** Diese Marker werden auch
ein paar Ebenen tiefer gesucht, also wird eine Flutter-App unter `mobile/` oder
ein Paket unter `apps/web` gefunden, und jeder Analyzer läuft im Verzeichnis
seines eigenen Projekts. Ein verschachteltes Projekt derselben Art wird
übersprungen, wenn ein Vorfahre es bereits abdeckt — genau das sagt eine
`tsconfig.json` im Wurzelverzeichnis — und ein Durchlauf endet bei zwölf
Projekten, denn ein Monorepo soll keine fünfzig Compiler starten.

Ein Binary in `node_modules/.bin` schlägt das auf dem PATH — genauso lösen es die
Skripte des Projekts auf. Alles läuft parallel, und die Ausgabe jedes Werkzeugs
wird in eine Form gebracht, dedupliziert und sortiert: Melden zwei Analyzer
dieselbe Zeile, wird daraus eine Zeile.

**Nichts läuft von selbst.** `tsc --noEmit` sind in einem großen Repository
zig Sekunden, und diese Befehle sind die Toolchain des Repositories, nicht die
von Gitcito. Sie starten, wenn du die Leiste öffnest oder aktualisierst, sonst
nie. Deshalb ist die Liste eine Momentaufnahme: Bearbeite eine Datei, und sie ist
veraltet, bis du erneut ausführst.

**Einstellungen → Allgemein → Code-Analyzer** entscheidet, wie eifrig das ist:
beim Öffnen der Leiste (Standard), nur auf Aktualisieren, oder aus — was die
Analyzer-Hälfte, ihren Zähler in der Statusleiste und ihren Befehl ganz
ausblendet.

**Generierte Ausgabe fliegt raus.** Ein Werkzeug, das auf das Projektwurzel-
verzeichnis zeigt, prüft alles, was es findet — und dazu gehören
`.next/build/chunks`, ein gebündeltes `dist`, eine eingecheckte Kopie: Hunderte
Beschwerden über maschinengeschriebenen Code, die die Handvoll über deinen
begraben. Gitcito fragt git, welche Dateien ignoriert sind, und wirft diese weg —
aber nie eine *versionierte* Datei: generierte Ausgabe einzuchecken ist eine
Entscheidung, und `git check-ignore` respektiert sie. `node_modules` fliegt
ohnehin.

## Nur was du geändert hast

Der Schalter in der Kopfzeile wirft jedes Problem aus Dateien weg, die du nicht
angefasst hast. Das ist die Ansicht, die sich zu öffnen lohnt: Eine flache Liste
aller Warnungen einer Codebasis wird binnen einer Woche zur Tapete, während "hat
dieses Diff sie hinzugefügt" eine Frage ist, die man vor dem Commit beantworten
will.

Auch die Severity-Chips filtern. Unbeleuchtet heißt *alles zeigen*; einen
anzuschalten grenzt darauf ein.

## Die Grenzen

- **Kein Language Server.** Das ist ein Durchlauf, kein Daemon: keine
  Kringel beim Tippen, keine Ergebnisse, bevor du fragst.
- **Ein nicht installiertes Werkzeug wird benannt, nicht verschwiegen.** Die
  Fußzeile sagt, was nicht laufen konnte — eine leere Liste ohne Erklärung ist
  schlimmer als eine kurze mit Grund.
- **Nur maschinenlesbare Ausgabe wird verstanden.** Jeder Analyzer wird aus
  seinem dokumentierten Maschinenformat gelesen; ein Werkzeug, das etwas anderes
  ausgibt, ist hier unsichtbar.
- **Fünftausend Probleme sind das Limit.** Danach sagt die Leiste es und hört auf
  — ein Repository in diesem Zustand hat ein größeres Problem als eine
  Bildlaufleiste.

**Siehe auch:** [Lokale CI](local-ci.md) · [Integriertes Terminal](terminal.md)
