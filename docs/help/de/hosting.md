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

## Stapel in der Liste

Pull Requests, die aufeinander sitzen, klappen zu einer Zeile zusammen: mit
Stapelsymbol, dem Branch, auf dem die Kette landet, und wie viele es sind.
Aufklappen zeigt die Kette in Leserichtung — Blatt zuerst, hinunter zur Basis —
mit einem kleinen Pfeil unter jeder Zeile, der nennt, wohin sie gemergt wird. Die
Richtung steht damit auf dem Bildschirm, statt aus vier Basen erschlossen zu
werden.

Zwei Dinge bilden so eine Gruppe: GitHubs eigene Stapelnummer, wenn die Pull
Requests zu einem [nativen Stapel](stacks.md) gehören, und sonst die Refs selbst
— ein Pull Request, dessen Basis der Head eines anderen ist, sitzt auf ihm. Die
zweite Regel ist der Grund, warum das auch auf GitLab, Bitbucket und Azure
DevOps funktioniert, und für Ketten von früher.

![Ein Stapel in der Pull-Request-Liste](../../screenshots/pr-stack-list.webp)

Jede Zeile trägt den Zustand der **Checks** ihres Heads — für die Zahlen darüber
fahren — und auf GitHub auch die bereits geschlossenen oder gemergten Ebenen, die
eine Liste offener Pull Requests verstecken würde. Eine Ebene über einer
**geschlossenen** gilt als blockiert: ihre eigenen Checks mögen grün sein, aber
der Branch, auf den sie zielt, wird nie landen. Die Aktionen der Zeile erscheinen
beim Überfahren, damit der Titel die Breite behält.

Die Checks zu lesen kostet eine Anfrage pro Pull Request, und nur beim
Aktualisieren der Liste.

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

Jedes Profil **verknüpft sein eigenes Konto**. Unter Einstellungen →
Integrationen sucht **Mit git anmelden** nach einer Anmeldung, die schon auf dem
Rechner liegt — im Credential Helper von git, dann im aktiven Konto der **GitHub
CLI**, dann im Anmeldefenster des Helpers — und verknüpft dieses Konto mit dem
Profil. Nichts wird stillschweigend geteilt: Ein neues Profil startet getrennt,
und ein Konto, das ein anderes Profil schon verknüpft hat, wird abgelehnt. Für
ein zweites GitHub-Konto fügst du es zu gh hinzu (`gh auth login`), machst es
aktiv (`gh auth switch`) und meldest dich im anderen Profil an — oder fügst das
Token dieses Kontos ein. Git fragt nie in einem Terminal nach Benutzername und
Passwort.

Die Seite zeigt, ob die Verbindung das Token des Profils, seine Verknüpfung mit
dem Helper von git oder mit der GitHub CLI ist, und **Trennen** hebt sie nur für
dieses Profil auf: Ein Token wird gelöscht (beim Anbieter bleibt es gültig, bis
du es dort widerrufst), eine Verknüpfung entfernt (die Anmeldung bleibt in gh
oder im Helper).

Die API des Anbieters — Pull Requests, Issues, CI — und Fetch, Pull und Push von
git selbst über https nutzen beide das Token oder das verknüpfte Konto des
Profils. Die Zugangsdaten erreichen git nur für diesen einen Befehl, beschränkt
auf den Host des Remotes, und werden nie in `.git/config` geschrieben. Ein
Profil ohne beides überlässt git seinem eigenen Credential Helper. Azure DevOps,
GitLab und Bitbucket verknüpfen über den Credential Helper von git — der Git
Credential Manager hält mehrere Konten pro Anbieter — oder nutzen ein Token pro
Profil. Eine Verknüpfung nennt ein Konto pro Anbieter; Organisationen, die
verschiedene Konten brauchen, bekommen je ein Profil.

**Siehe auch:** [Gestapelte Branches](stacks.md) · [KI-Funktionen](ai.md)
