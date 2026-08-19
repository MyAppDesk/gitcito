---
title: Repository-Chat
category: KI
order: 82
summary: Stelle Fragen zu diesem Repository — mit den Dateien und Commits, die du als Kontext anheftest — und lass ihn Git-Aktionen vorschlagen, die du vor dem Ausführen freigibst.
keywords: chat frage fragen assistent kontext anheften anhängen ziehen ablegen commit datei beleg belegt ki panel aktionen ausführen freigeben freigabe automatisch erlauben beheben fehler toast
---

# Repository-Chat

Manche Fragen sind schneller gestellt als gesucht. *Wo passiert die
Token-Erneuerung wirklich? Was hat dieser Commit geändert, in einem Satz? Warum
gibt es diese Datei?* Der Repository-Chat beantwortet das für das geöffnete
Repository und zeigt die Zeilen, auf die er sich stützt.

Er teilt sich die rechte Spalte mit **Details**: die Reiter oben wechseln
zwischen beiden, ohne dass der Graph seine Auswahl verliert.

![Repository-Chat mit angeheftetem Kontext](../../screenshots/repo-chat.webp)

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

Eine Feinheit: mit aktivierten
[Aktionsvorschlägen](#aktionen-aus-dem-chat-ausführen) stehen die **Namen**
nicht versionierter Dateien im Repository-Zustand — „stage die neue Datei“
braucht sie — ihr Inhalt wird aber weiterhin nie gelesen.

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
| **Datei- und Git-Aktionen im Chat vorschlagen** | Aus macht den Chat wieder rein lesend: keine Aktionskarten, kein Freigabe-Menü |
| **Dateien nur lesen** | Ein verhindert Erstellen, Bearbeiten, Ersetzen und Löschen von Dateien; Git-Aktionen bleiben verfügbar. Standardmäßig eingeschaltet |
| **Wie vorgeschlagene Aktionen ausgeführt werden** | Der Freigabemodus — siehe [Freigabemodi](#freigabemodi). Destruktive Aktionen bestätigen in jedem Fall |

Ist die KI ganz aus, verschwindet der Chat mit ihr — kein Panel, das etwas
anbietet, was niemand beantworten kann.

Das Chat-Modell lässt sich auch in der Kopfzeile des Panels umstellen, neben dem
Anbieternamen — dieselbe Einstellung, ohne die Einstellungen zu öffnen.

Der Zauberstab-Knopf neben dem Paneltitel öffnet den
**KI-Konfigurationsassistenten** — einen geführten Ablauf, der
Assistenten-Konfigurationsdateien (Anweisungen, Agenten, Hooks) für dieses
Repository erzeugt. Siehe [KI-Funktionen](ai.md).

![Einstellungen des Repository-Chats](../../screenshots/settings-repo-chat.webp)

## Mit Nachrichten arbeiten

Nachrichten sind gewöhnlicher Text. Markiere einen beliebigen Teil und kopiere
ihn, oder rechtsklicke auf eine Blase: **Kopieren** nimmt die Auswahl,
**Nachricht kopieren** die ganze Nachricht — eine Antwort wird als ihr
Markdown-Quelltext kopiert — und wenn der Klick auf einem Link landete, nimmt
**Link kopieren** dessen Adresse.

Links öffnen sich in deinem Standardbrowser, nie in Gitcito — Markdown-Links
in Antworten genauso wie einfache `https://`-Adressen in deinen eigenen
Nachrichten.

Erwähnt eine Nachricht ein Bild — einen Repository-Pfad wie `docs/logo.png`
oder eine URL mit Bild-Endung — zeigt das Überfahren der Erwähnung eine kleine
Vorschau. Repository-Pfade werden aus deinem Arbeitsbaum gelesen; eine
Erwähnung, die nicht zu einem lesbaren Bild führt, zeigt einfach nichts.

![Bildvorschau beim Überfahren](../../screenshots/repo-chat-image-hover.webp)

## Aktionen aus dem Chat ausführen

Bitte um eine Änderung statt um eine Auskunft — *stage die Markdown-Dateien,
committe das als Fix, setz die Build-Ausgabe auf die Ignore-Liste* — und die
Antwort kommt mit einer **Aktionskarte**. Eine leere Unterhaltung bietet unter
der Einführung ein paar Beispielanfragen als Chips an; ein Klick darauf füllt
das Eingabefeld, sodass du sie vor dem Senden bearbeiten kannst. Die Karte
listet die konkreten Schritte, die der
Assistent gehen will, eine Zeile pro Aktion, mit den Knöpfen **Ausführen** und
**Ablehnen**. Nichts auf der Karte ist schon passiert; das Modell kann nur
vorschlagen, und jeder Vorschlag wird gegen das Arbeitsverzeichnis geprüft,
bevor du ihn überhaupt siehst — eine Aktion, die eine nicht existierende Datei
nennt, wird abgewiesen, nicht angezeigt.

![Leere Unterhaltung mit Beispielanfragen](../../screenshots/repo-chat-empty.webp)

![Vorgeschlagene Aktionen im Chat](../../screenshots/repo-chat-actions.webp)

Der Repository-Chat kann exakte Bearbeitungen, das Erstellen oder vollständige
Ersetzen sowie das Löschen von Dateien vorschlagen, gefolgt von den Git-Aktionen
des **Ausführen**-Assistenten. Gitcito berechnet den aufklappbaren Diff lokal.
Bestehende Dateien müssen aus gelesenen Belegen stammen; unsichere, geheime,
ignorierte, generierte, binäre, veraltete, zu große oder verlinkte Ziele werden
abgewiesen. Push, Pull, Reset, Rebase und erzwungene Operationen bleiben in der
dafür vorgesehenen Oberfläche.

Der gesamte Dateistapel wird vor dem ersten Schreiben erneut geprüft und bei
einem Fehler zurückgerollt. Vor einem Commit prüft Gitcito außerdem, ob etwas
vorgemerkt ist. Die Karte zeigt abgeschlossene, fehlgeschlagene und übersprungene
Schritte sowie Teilergebnisse. Danach fasst ein separater Modellaufruf ohne
Aktionen das tatsächliche Ergebnis zusammen.

### Freigabemodi

Das Schild-Menü unter dem Eingabefeld (auch in **Einstellungen → KI →
Repository-Chat**) entscheidet, wie eine Karte läuft:

| Modus | Führt aus |
|---|---|
| **Immer fragen** | Nichts, bis du **Ausführen** auf der Karte drückst |
| **Sichere Aktionen automatisch ausführen** | Vorschläge, die nur aus umkehrbarer Routinearbeit bestehen — stagen, unstagen, ignorieren, Branch, Tag — laufen beim Eintreffen; alles andere wartet auf den Knopf |
| **Alle Aktionen automatisch ausführen** | Jeder Vorschlag läuft beim Eintreffen, außer destruktiven |

Ein Vorschlag, der **nicht committete Änderungen verwerfen würde, fragt immer
zuerst**, in jedem Modus, und die Bestätigung nennt die Dateien, die verloren
gingen. Die Karte berichtet, was tatsächlich passiert ist — wie viele Aktionen
liefen, oder den Fehler, der sie stoppte — und der Assistent erfährt das
Ergebnis, sodass eine Folgefrage weiß, ob ihr Plan ausgeführt oder abgelehnt
wurde.

### Fehler mit dem Assistenten beheben

Schlägt eine Git-Operation fehl und der KI-Chat ist verfügbar, bekommt der
Fehler-Toast einen Funkel-Knopf: er öffnet den Chat mit dem Fehlschlag im
Eingabefeld — „warum ging das schief und was tue ich jetzt“ ist ein Klick. Der
Entwurf bleibt bearbeitbar; nichts wird gesendet, bis du Senden drückst.

## Was er verweigert

- **Geheimnis-verdächtige Dateien werden nie gelesen**, angeheftet oder nicht:
  der Chip kommt als übersprungen zurück, mit Begründung. Anheften umgeht die
  [Geheimnis-Maskierung](security.md) nicht.
- **Binärdateien und Dateien über 512 KB** von außerhalb des Repositorys werden
  genauso übersprungen. Innerhalb gelten die üblichen Regeln.
- **Er schreibt nie von allein.** Das Modell hat keine Werkzeuge, nur Text:
  eine Änderung kommt als Vorschlagskarte, läuft nur nach
  [deinen Freigaberegeln](#freigabemodi), und ein destruktiver Schritt
  bestätigt immer. Mit **Git-Aktionen im Chat vorschlagen** aus schlägt er
  nicht einmal vor.
- **Unterhaltungen liegen nur im Speicher.** Jedes Repository hat seinen eigenen
  Verlauf; beim Beenden von Gitcito sind sie weg.

## Öffnen

| Tasten | Wirkung |
|---|---|
| Der Sprechblasen-Knopf in der Symbolleiste | Schaltet den Chat-Reiter um |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Schaltet das ganze rechte Panel um |
| <kbd>Enter</kbd> | Sendet die Nachricht |
| <kbd>Shift+Enter</kbd> | Fügt eine neue Zeile ein |

[Tastatur & Kürzel](keyboard.md) hat den Rest, auch das Neubelegen der
Panel-Schalter.

**Siehe auch:** [KI-Funktionen](ai.md) · [Sicherheit & Geheimnisse](security.md) ·
[Repo-Wiki](repo-wiki.md)
