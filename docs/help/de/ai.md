---
title: KI-Funktionen
category: KI
order: 80
summary: Optional, anbieterunabhängig und in deinem echten Code verankert.
keywords: ki ai openai anthropic ollama lokales llm commit-nachricht erklären review wiki verankert konten konto api-schlüssel abo abonnement cli claude codex gemini modelle
---

# KI-Funktionen

Jede KI-Funktion ist **optional** und aus, bis du einen Anbieter einrichtest.
Es wird nichts irgendwohin geschickt, bevor du nicht konkret etwas anforderst.

![KI-Einstellungen](../../screenshots/settings-ai.webp)

## Konten

Ein **Konto** ist ein Weg zu einem Modell: ein Anbieter, wo er erreichbar ist
und wie er sich authentifiziert. Du kannst mehrere einrichten, und sie bestehen
nebeneinander — ein Arbeitsschlüssel, ein privater, ein lokales Modell, eine
CLI, in der du bereits angemeldet bist.

Voreinstellungen gibt es für **OpenAI, Anthropic, Google Gemini, OpenRouter,
Groq, Mistral** und **Ollama** (vollständig lokal), dazu jeder
OpenAI-kompatible Endpunkt.

Anthropic nutzt seine eigene `/v1/messages`-API statt eines OpenAI-förmigen
Aufrufs, deshalb funktionieren Claude-Modelle jetzt wirklich, statt es nur zu
scheinen. Gemini wird über Googles OpenAI-kompatiblen Endpunkt angesprochen.

### Ein Abo statt eines API-Schlüssels nutzen

Wähle den Anbieter **Lokale CLI**, um mit einer Agent-CLI zu antworten, die auf
diesem Rechner bereits installiert und angemeldet ist — `claude`, `gemini` oder
`codex`. Gitcito startet das Programm mit deiner Eingabe und liest die Antwort;
es gibt keinen API-Schlüssel einzufügen und kein Token wird gespeichert.

Gitcito führt nur einen Befehl aus, den du als Konto eingerichtet hast, und
immer mit einer Argumentliste statt einer Shell — nichts aus einem Diff oder
einem Branch-Namen kann also als Befehl gelesen werden.

> **Das ist nicht privater als ein API-Schlüssel.** Deine Eingaben erreichen
> weiterhin denselben Anbieter, unter deinem eigenen Konto, genau wie mit einem
> Schlüssel. Es ändern sich Abrechnung und Einrichtung, nicht der Weg des Texts.

Liegt der Befehl nicht in deinem `PATH`, trage seinen vollständigen Pfad am
Konto ein.

### Welches Konto beantwortet was

Unter **Welches Konto beantwortet was** kann jede Funktion — Commit-Nachrichten,
Chat, Erklären, PR-Review, Konfliktlösung, Wiki, Themes — auf ein eigenes Konto
und Modell zeigen. Lass eine Zeile auf dem Standard, um dem Standardkonto zu
folgen. Ein günstiges Modell für Commit-Nachrichten und ein starkes für den Chat
ist die übliche Aufteilung.

### Upgrade-Hinweis

Beim Upgrade von einer Version vor den Konten erscheint das einmal. Anbieter und Schlüssel, die du hattest, werden zum ersten Konto; von Hand ist nichts neu einzurichten.

![Upgrade-Hinweis](../../screenshots/ai-accounts-notice.webp)

## Modelle

Modelllisten kommen vom Anbieter selbst und werden einen Tag zwischengespeichert;
**Modelle abrufen** aktualisiert eine sofort. Unter der Liste sagt Gitcito, woher
sie stammt — live, aus dem Cache (mit Zeitpunkt) oder aus der eingebauten
Ersatzliste, und warum.

Die Liste ist auf Modelle gefiltert, die eine Chat-Anfrage beantworten können;
Embedding-, Sprach- und Bildmodelle bleiben also draußen. Jedes Modellfeld nimmt
außerdem freien Text an, sodass ein Vorschaumodell, ein privates Deployment oder
ein frisch geholter Ollama-Tag immer nutzbar ist, auch wenn der Anbieter ihn
nicht aufführt.

Ein Anbieter, dem du noch keinen Schlüssel gegeben hast, oder der nicht
erreichbar ist, fällt auf eine kleine eingebaute Liste zurück statt auf ein
leeres Auswahlfeld.

Kein Anbieter veröffentlicht eine sortierte oder kuratierte Liste, die Aufbereitung stammt also von Gitcito: datierte Snapshots klappen in das Modell zusammen, von dem sie ein Snapshot sind (`gpt-4o` deckt `gpt-4o-2024-08-06` ab), und der Rest steht nach Aktualität statt alphabetisch. **Alle Modelle zeigen** am Ende der Liste holt alles zurück, was der Anbieter geliefert hat.

## Was es kann

| Funktion | Was du bekommst |
|---|---|
| **Commit-Nachricht** | Zusammenfassung (und optional ein Body) aus deinem gestagten Diff, im gewählten Stil |
| **Diese Datei erklären** | Erklärung in Alltagssprache in einem Seitenpanel — Normal, Knapp, ELI5… sogar Pirat |
| **Hover zum Erklären** | Halte <kbd>⇧</kbd> und zeige auf einen Bezeichner für eine einzeilige Erklärung, plus die Zeilen, auf die sie sich stützt |
| **Konfliktlösung** | Schlägt einen Merge in der editierbaren Ausgabe vor — wendet nie automatisch an |
| **PR-Review** | Fasst einen Diff zusammen und markiert Risiken, jedes verankert an einer echten `path:line` |
| **PR-Beschreibung** · **Branch-Namen** | Entworfen aus den Commits und dem Diff des Branches |
| **Themes** · **Graph-Paletten** | Aus einem Prompt generiert |
| **Smartes Staging** | Vorschläge, was in diesen Commit gehört |

## Verankert, nicht geraten

Das Review sieht den Diff als **beschriftete Hunks** und darf nur diese
Beschriftungen zitieren; Gitcito löst dann jede Beschriftung zu einer echten
Datei und Zeile auf. Ein Modell, das eine Fundstelle erfindet, wird
**abgelehnt und erneut gefragt** — Befunde zeigen also immer auf Code, den es
wirklich gibt.

Hover zum Erklären liest nur ein nummeriertes Fenster rund um das Token — in
einem Diff nur die Hunks, die auf dem Bildschirm sichtbar sind. Liegt eine
Definition anderswo, sagt es das, statt sie zu erfinden. Antworten werden pro
Dateiversion gecacht.

**Maskierte Secret-Dateien werden nie gesendet.** Ebenso wenig Dateien, die
unter die Regeln zur Secret-Maskierung fallen.

## Grenzen

- Die eingebauten Ersatzlisten veralten zwischen Releases. Genau dafür gibt es
  den Live-Abruf; der Ersatz deckt nur den Fall ab, dass ein Abruf nicht möglich
  ist.
- Die Filterung auf chatfähige Modelle geht über den Namen, ein ungewöhnlich
  benanntes Chat-Modell kann also herausfallen. Dann tippst du es einfach ein.
- Ein CLI-Konto kann den Tokenverbrauch nur melden, wenn die CLI das tut — die
  Nutzungs- und Kostenzahlen in den Einstellungen zählen solche Aufrufe also zu
  niedrig.
- CLI-Antworten sind langsamer als ein direkter API-Aufruf: das Programm startet
  pro Anfrage eine ganze Sitzung.
- Schlüssel werden pro Konto im Schlüsselbund deines Systems abgelegt. Ein Konto
  zu löschen löscht seinen Schlüssel.

**Siehe auch:** [Repo-Wiki](repo-wiki.md) · [Sicherheit & Secrets](security.md)
