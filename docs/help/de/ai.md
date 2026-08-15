---
title: KI-Funktionen
category: KI
order: 80
summary: Optional, anbieterunabhängig und in deinem echten Code verankert.
keywords: ki ai openai anthropic ollama lokales llm commit-nachricht erklären review wiki verankert
---

# KI-Funktionen

Jede KI-Funktion ist **optional** und aus, bis du einen Anbieter einrichtest.
Es wird nichts irgendwohin geschickt, bevor du nicht konkret etwas anforderst.

![KI-Einstellungen](../../screenshots/settings-ai.webp)

## Anbieter

Voreinstellungen für **OpenAI, Anthropic, OpenRouter, Groq, Mistral und Ollama**
(komplett lokal) oder jeden OpenAI-kompatiblen Endpunkt. Modelle werden live
abgerufen, und du kannst eigene Anweisungen hinterlegen.

> Nur OpenAI ist wirklich erprobt. Die anderen nutzen ein OpenAI-kompatibles
> Aufrufformat und sollten funktionieren — verifiziert sind sie aber nicht.

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

**Siehe auch:** [Repo-Wiki](repo-wiki.md) · [Sicherheit & Secrets](security.md)
