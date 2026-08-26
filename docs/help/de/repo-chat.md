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

**Ein zweiter Blick.** Der erste Durchgang muss allein am Namen raten, welche
Dateien zählen — genau die Vermutung, die bei „von wo wird das aufgerufen“
scheitert. Eine Antwort darf deshalb zurückfragen, statt zu raten: Sie kann
weitere Pfade, weitere wörtliche Suchen oder Commit-Hashes aus der jüngsten
Historie nennen, und die Frage wird mit dem Ergebnis erneut gestellt. Das
passiert höchstens zweimal — jede Runde ist ein weiterer Modellaufruf, auf den
Sie warten — und in der letzten muss sie mit dem antworten, was sie hat. Sie
sehen davon nichts außer einer etwas längeren Wartezeit und einer besseren
Antwort.

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
| **Chat darf Remote-Aktionen vorschlagen** | Standardmäßig aus. Eingeschaltet kommen Fetch, Pull, Push, das Öffnen eines Pull Requests und das Einreichen eines Stapels hinzu |

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
Ersetzen sowie das Löschen von Dateien vorschlagen, danach Git-Aktionen:
Ignore-Muster, Stagen, Unstagen, Commit, Stash, Verwerfen, Branch, Wechseln,
Tag und — weil ihm die Branch-Liste und die jüngsten Commits gezeigt werden —
Merge, Rebase, Revert und Cherry-Pick. Gitcito berechnet den aufklappbaren Diff
lokal. Vorhandene Dateien müssen aus gelesenen Belegen stammen; unsichere,
geheime, ignorierte, generierte, binäre, veraltete, zu große und über Symlinks
erreichte Ziele werden abgelehnt. Reset, das Umschreiben von Historie, das
Löschen von Branches und jede Force-Operation bleiben ihrer eigenen Oberfläche
vorbehalten.

Ein Merge oder ein Rebase kann an einem Konflikt stehenbleiben. Dann endet der
Lauf dort, die Karte markiert die Zeile als fehlgeschlagen und behält die Zahl
des bereits Gelaufenen, und das Konfliktbanner übernimmt genau wie bei derselben
Operation aus der Werkzeugleiste.

Der gesamte Dateistapel wird vor dem ersten Schreiben erneut geprüft und bei
einem Fehler zurückgerollt. Vor einem Commit prüft Gitcito außerdem, ob etwas
vorgemerkt ist. Die Karte zeigt abgeschlossene, fehlgeschlagene und übersprungene
Schritte sowie Teilergebnisse. Danach fasst ein separater Modellaufruf ohne
Aktionen das tatsächliche Ergebnis zusammen.

**Er kann auch `.gitcito.json` schreiben.** Dem Chat wird die Form der
[eigenen Konfigurationsdatei des Repositorys](repo-config.md) mitgegeben, also
wird aus *füge Ticket-Links für JIRA-1234 hinzu* oder *schütze die
Release-Branches* eine Dateiaktion gegen das echte Schema statt plausibel
aussehender Schlüssel, die der Loader ablehnen würde. Dafür müssen Dateiaktionen
erlaubt sein — derselbe Schalter für den Dateien-Lesemodus.

**Zeilen, die ein Bild brauchen, bekommen eines.** Eine Zeile Zusammenfassung
reicht für „stage zwei Dateien“ und keineswegs für „öffne vier Pull Requests auf
einem Stapel“. Deshalb zeichnen die Zeilen, die eine Form beschreiben, sie auch:
den Branch, den ein Push veröffentlicht, samt Vorsprung, die zwei Referenzen
eines Merge oder Rebase, die Commits, die ein Revert oder Cherry-Pick mit ihrem
Betreff wiederholen würde, den Pull Request so, wie er aussehen wird, und einen
Stapel als Leiter mit der Basis jeder Ebene und dem, was das Einreichen dort
täte: öffnen, neu ausrichten oder in Ruhe lassen.

### Aktionen, die den Rechner verlassen

Abrufen, Pullen, Pushen, einen Pull Request öffnen und einen Stapel einreichen
sind **standardmäßig aus**, hinter **Chat darf Remote-Aktionen vorschlagen**.
Arbeit zu veröffentlichen ist eine Entscheidung, die man bewusst trifft, und mit
ausgeschalteter Option erfährt das Modell nicht einmal, dass es diese Aktionen
gibt: Es kann keine vorschlagen und abgelehnt werden — der Fehlerfall, der
Menschen beibringt, Schalter ungelesen umzulegen.

Eingeschaltet:

| Aktion | Tut |
|---|---|
| **Abrufen** / **Pullen** | Dasselbe Fetch und Pull wie in der Werkzeugleiste; der Pull-Modus (Merge, nur Fast-Forward, Rebase) gehört zum Vorschlag |
| **Pushen** | Veröffentlicht einen Branch auf einem Remote. **Nie mit Force** — ein Force-Push kommt im Vokabular eines Vorschlags nicht vor und kann daher gar nicht vorgeschlagen werden |
| **PR öffnen** | Öffnet einen Pull Request, als Entwurf oder nicht, gegen das origin des Repositorys. Die Karte behält den Link |
| **Stapel einreichen** | Das komplette [Stacked-PR-Einreichen](stacks.md): jede Ebene pushen, je einen Pull Request öffnen oder neu ausrichten, den Navigationsabschnitt schreiben, den GitHub-Stapel registrieren |

![Ein Chat-Plan, der pusht und einen Pull Request öffnet](../../screenshots/repo-chat-remote-actions.webp)

Ein vorgeschlagener Push durchläuft vorher dieselben Prüfungen wie der Push der
Werkzeugleiste: die Bestätigung für geschützte Branches, die Warnung vor dem
Veröffentlichen [zugangsdatenverdächtiger Dateien](security.md) und die
Pre-Push-Checkliste des Repositorys. Das sind Dialoge, sie werden also
beantwortet, bevor der Plan startet — nicht aus ihm heraus.

### Einen Plan rückgängig machen

Ein Plan wird als Ganzes freigegeben, also wird er als Ganzes zurückgenommen.
Vor der ersten Aktion, die etwas ändern kann, merkt sich Gitcito, wo der Branch
stand, und macht einen Schnappschuss des Arbeitsbaums; die fertige Karte bietet
dann **Plan rückgängig** an. Sie setzt den Branch auf diesen Commit zurück und
stellt den Baum wieder her — was der Plan erzeugt hat, ist damit weg, also fragt
sie vorher nach und nennt den Ziel-Commit. Geöffnete Pull Requests bleiben
offen: Ein Remote kann ein lokaler Schnappschuss nicht zurückholen.

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
