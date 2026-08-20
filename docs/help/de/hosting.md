---
title: Hosting & Pull Requests
category: Sync & viele Repos
order: 56
summary: PRs überall erstellen; auf GitHub und GitLab reviewen und mergen.
keywords: pull request PR merge request GitHub GitLab Bitbucket Azure DevOps review prüfen freigeben approve mergen issues benachrichtigungen token
---

# Hosting & Pull Requests

## Erstellen

Erstelle einen Pull (oder Merge) Request, ohne die App zu verlassen:
Branch-Auswahllisten, Titel und Beschreibung vorausgefüllt aus den Commits des
Branches, ein Draft-Schalter und — auf GitHub — Reviewer, Labels und
Verantwortliche, die beim Anlegen gleich mitgesetzt werden.

![Einen Pull Request erstellen](../../screenshots/create-pr.webp)

Funktioniert mit **GitHub, GitLab, Bitbucket und Azure DevOps**. Offene PRs/MRs
für alle vier werden in der Seitenleiste aufgelistet.

Starte einen aus dem Branch-Vergleich, aus dem Graph, über das `+` im PR-Panel
oder aus einem Issue heraus (was `Closes #N` einträgt).

## Reviewen — GitHub und GitLab

| | |
|---|---|
| **Konversation** | Kommentare und Review-Status |
| **Checks** | CI-Check-Runs (GitHub) oder Pipeline-Jobs (GitLab) mit bestanden/fehlgeschlagen/ausstehend und Links zu den Logs |
| **Gesehene Dateien** | Eine ✓-Checkliste pro Datei mit Fortschritt |
| **Inline-Threads** | Zeilenkommentare, gruppiert nach `file:line`, und die Antworten |
| **Aktionen** | Kommentieren, freigeben, Änderungen anfordern und mergen / squashen |

Wenn jemand mitten im Review force-pusht, zeigt dir
[was sich seitdem geändert hat](range-diff.md) genau, was sich bewegt hat.

Die GitLab-Unterschiede, klar benannt: GitLab hat keinen einzelnen
"Review absenden"-Aufruf, deshalb nutzt **Freigeben** dessen Approval-Endpunkt,
und **Änderungen anfordern** entfernt deine Freigabe und veröffentlicht deinen
Kommentar. **Rebase-Merge** wird nicht angeboten — GitLab entscheidet anhand
der Projekteinstellungen zwischen Merge-Commit und Fast-Forward, das Merge-Menü
zeigt deshalb nur Mergen und Squashen. Inline-Threads zeigen Datei und Zeile,
aber nicht den umgebenden Diff-Hunk, den GitLabs API nicht zurückgibt.
Review/Merge funktioniert für Projekte auf **gitlab.com**; selbst gehostete
Instanzen werden noch nicht unterstützt. Bitbucket und Azure DevOps öffnen sich
zum Reviewen weiterhin im Browser.

## Issues, Meilensteine, Releases — GitHub

Durchsuche Issues und öffne einen vollständigen Issue-Tab: Beschreibung,
Kommentare, Labels, Verantwortliche, Meilenstein, Projects-v2-Felder,
Schließen/Wiederöffnen und **einen Branch für dieses Issue anlegen** (mit
KI-Namensvorschlag). Meilensteine zeigen ihren Fortschritt und ihre Issues.
Releases lassen sich mit einer Changelog-Seite durchblättern.

## Benachrichtigungen — GitHub

Dein gesamter Posteingang — Review-Anfragen, Erwähnungen, CI-Aktivität — über
alle Repositorys hinweg, mit Filtern für ungelesen/alle und Als-gelesen-Markieren.
Die Glocke in der Werkzeugleiste trägt ein Ungelesen-Abzeichen, und optionale
Desktop-Benachrichtigungen erscheinen, wenn ein Review angefragt wird oder CI
fertig ist.

## Tokens

Tokens pro Profil für mehrere Accounts oder Organisationen, gespeichert im
Schlüsselbund deines Betriebssystems. Gitcito kann sich außerdem ausleihen, was
dein **git credential helper** ohnehin schon hält — eine Organisation, für die du
dich bereits authentifiziert hast, braucht deshalb oft gar keine Einrichtung.
Siehe [Sicherheit & Secrets](security.md).

**Siehe auch:** [Gestapelte Branches](stacks.md) · [KI-Funktionen](ai.md)
