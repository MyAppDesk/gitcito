---
title: Repository-Chat
category: KI
order: 82
summary: Stelle Fragen zu diesem Repository — mit den Dateien und Commits, die du als Kontext anheftest.
keywords: chat frage fragen assistent kontext anheften anhängen ziehen ablegen commit datei beleg belegt ki panel
---

# Repository-Chat

Manche Fragen sind schneller gestellt als gesucht. *Wo passiert die
Token-Erneuerung wirklich? Was hat dieser Commit geändert, in einem Satz? Warum
gibt es diese Datei?* Der Repository-Chat beantwortet das für das geöffnete
Repository und zeigt die Zeilen, auf die er sich stützt.

Er teilt sich die rechte Spalte mit **Details**: die Reiter oben wechseln
zwischen beiden, ohne dass der Graph seine Auswahl verliert.

## Was er liest

Jede Antwort entsteht in zwei Durchgängen. Der erste wählt wenige Pfade und
wörtliche Suchen aus der Liste der versionierten Dateien des Repositorys. Der
zweite antwortet nur mit den Ausschnitten, die dabei herauskommen, und darf auch
nur diese zitieren: eine erfundene Datei oder Zeile ist ein Validierungsfehler,
keine plausibel klingende Antwort.

| Enthalten | Ausgeschlossen |
|---|---|
| Versionierte Dateien, so wie sie im Arbeitsverzeichnis stehen | Nicht versionierte Dateien |
| Gestagte und ungestagte Diffs versionierter Dateien | Alles, was eine Ignore-Regel trifft — auch versioniert |
| Branch, Ahead/Behind und die Liste geänderter Pfade | [Geheimnis-verdächtige Dateien](security.md), Binärdateien, generierte Pfade |

Weil er das Arbeitsverzeichnis liest, kannst du über noch nicht committete
Änderungen sprechen. Es heißt auch: diese Änderungen verlassen beim Fragen
deinen Rechner — der in [KI-Funktionen](ai.md) konfigurierte Anbieter bekommt sie.

## Kontext anheften

Das Modell entscheidet, was es liest. Anheften überstimmt das: Angeheftetes wird
**zuerst** gelesen und bekommt den größeren Teil des Kontextbudgets.

Vier Wege, alle in dieselbe Chip-Reihe über dem Eingabefeld:

| Das tun | Ergibt |
|---|---|
| Auf einen Vorschlags-Chip klicken | Die im Viewer geöffnete Datei oder den im Graphen gewählten Commit |
| Eine Zeile aus dem Reiter **Dateien** ziehen | Diese Datei |
| Eine Zeile aus dem **Commit-Graphen** ziehen | Diesen Commit — Nachricht und Diff als Hunks |
| **+** → *Datei wählen…*, oder aus Finder/Explorer ziehen | Jede Datei auf der Platte, auch außerhalb des Repositorys |

Chips bleiben für Folgefragen angeheftet; das `×` entfernt einen, das Löschen der
Unterhaltung alle. Acht ist die Grenze.

Ein angehefteter Commit steuert seine Nachricht und bis zu zwölf Diff-Hunks bei.
Hunks auf ausgeschlossenen Pfaden fallen aus diesem Diff heraus, nicht der ganze
Commit.

## Einstellungen

**Einstellungen → KI → Repository-Chat**:

| Einstellung | Wirkung |
|---|---|
| **Fragen zum Repository stellen** | Aus entfernt Reiter, Symbolleisten-Knopf und Kürzelziel. Der Rest der KI bleibt |
| **Chat-Modell** | Ein Modell nur für den Chat. Leer heißt: das des Profils — Fragen kosten weniger als Reviews, ein kleineres reicht oft |
| **Nur committete Inhalte** | Antwortet aus dem letzten Commit statt aus dem Arbeitsverzeichnis: nicht committete Änderungen verlassen den Rechner nie |

Ist die KI ganz aus, verschwindet der Chat mit ihr — kein Panel, das etwas
anbietet, was niemand beantworten kann.

## Was er verweigert

- **Geheimnis-verdächtige Dateien werden nie gelesen**, angeheftet oder nicht:
  der Chip kommt als übersprungen zurück, mit Begründung. Anheften umgeht die
  [Geheimnis-Maskierung](security.md) nicht.
- **Binärdateien und Dateien über 512 KB** von außerhalb des Repositorys werden
  genauso übersprungen. Innerhalb gelten die üblichen Regeln.
- **Er schreibt nie.** Kein Staging, kein Commit, kein Branch-Wechsel — er hat
  keine Werkzeuge, nur Text. Eine Antwort, die etwas getan haben will,
  beschreibt, sie berichtet nicht.
- **Unterhaltungen liegen nur im Speicher.** Jedes Repository hat seinen eigenen
  Verlauf; beim Beenden von Gitcito sind sie weg.

## Öffnen

| Tasten | Wirkung |
|---|---|
| Der Sprechblasen-Knopf in der Symbolleiste | Schaltet den Chat-Reiter um |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Schaltet das ganze rechte Panel um |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Enter</kbd> | Sendet die Nachricht |

[Tastatur & Kürzel](keyboard.md) hat den Rest, auch das Neubelegen der
Panel-Schalter.

**Siehe auch:** [KI-Funktionen](ai.md) · [Sicherheit & Geheimnisse](security.md) ·
[Repo-Wiki](repo-wiki.md)
