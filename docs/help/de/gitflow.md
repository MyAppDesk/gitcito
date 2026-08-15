---
title: Git flow
category: Branches & Eingriffe
order: 46
summary: Features, Releases und Hotfixes starten und abschließen, ohne dir zu merken, welcher Branch wohin gemergt wird.
keywords: gitflow git flow feature release hotfix develop main master präfix prefix versiontag branching modell verzweigungsmodell start finish abschließen tag
---

# Git flow

Das [git-flow-Verzweigungsmodell](https://nvie.com/posts/a-successful-git-branching-model/)
besteht aus fünf Regeln und einer Menge Buchhaltung. Die Regeln sind einfach;
die Buchhaltung ist das, was Leute um 18 Uhr an einem Release-Tag falsch machen
— einen Hotfix in `main` mergen und `develop` vergessen, oder den falschen
Branch taggen.

`⌘K` → **Git flow** erledigt die Buchhaltung.

![Der Git-flow-Dialog auf einem Release-Branch: oben einen Branch starten, unten ihn abschließen](../../screenshots/gitflow.webp)

## Der Aufbau

| Branch | Enthält |
|--------|-------|
| **Release-Branch** (`main`) | Was in Produktion ist. Jedes Release wird hier getaggt. |
| **Integrations-Branch** (`develop`) | Wo sich fertige Arbeit zwischen zwei Releases sammelt. |
| `feature/*` | Eine Arbeitseinheit, abgezweigt von develop. |
| `release/*` | Eine Version, die stabilisiert wird, abgezweigt von develop. |
| `hotfix/*` | Ein dringender Fix, abgezweigt von **main** — Produktion kann nicht auf develop warten. |

Gitcito liest und schreibt dieselben `gitflow.*`-Git-Config-Keys, die auch die
`git flow`-CLI verwendet (`gitflow.branch.master`, `gitflow.prefix.feature`, …).
Ein Repository, auf dem jemand bereits `git flow init` ausgeführt hat, wird
sofort erkannt, und ein hier eingerichtetes Repository funktioniert danach mit
der CLI. Gitcito führt durchgehend einfache Git-Kommandos aus — die CLI muss
nicht installiert sein.

**Einrichten** schreibt diese Keys und erstellt den Integrations-Branch aus dem
Release-Branch, falls er noch nicht existiert. Sonst wird nichts angefasst. Jeden
Namen und jedes Präfix kannst du später unter **Aufbau bearbeiten** ändern.

## Starten

Wähle eine Art, tippe einen Namen, drücke **Starten**. Der Dialog zeigt dir den
Branch, den er anlegen wird, und den Branch, von dem aus er entsteht, bevor du
dich festlegst:

```
feature/search   from develop
hotfix/1.0.1     from main
```

Der Name ist das, was du tippst; das Präfix kommt aus dem Aufbau.

## Abschließen

**Abschließen** ist der Teil, der sich zu automatisieren lohnt, weil es mehrere
Schritte sind, die alle passieren müssen:

| Art | Was Gitcito tut |
|------|-------------------|
| Feature | Mergt mit `--no-ff` in develop, löscht den Branch, lässt dich auf develop |
| Release | Mergt in main, taggt es, mergt in develop, löscht den Branch, lässt dich auf develop |
| Hotfix | Mergt in main, taggt es, mergt in develop, löscht den Branch, lässt dich auf **main** |

`--no-ff` ist Absicht: Der Merge-Commit ist das, was den Branch im
[Graph](graph.md) danach sichtbar macht. Ohne ihn verschwindet ein kurzes
Feature in einer geraden Linie und das Modell verliert genau das, wofür es da
war.

Der Tag lautet `<Versions-Tag-Präfix><Name>` — aus `release/1.1.0` wird mit dem
Standardpräfix `v1.1.0`. Hake **Release taggen** ab, um das zu überspringen, und
schreibe eine Tag-Nachricht, wenn du mehr willst als den Standard.

### Was es verweigert

- **Ein schmutziges Arbeitsverzeichnis stoppt es.** Committe oder
  [stashe](stashes.md) zuerst; Abschließen mergt zwei Branches und bewegt HEAD
  zweimal, und das rund um uncommittete Arbeit zu tun ist genau der Weg, auf dem
  Leute sie verlieren.
- **Ein konfliktbehafteter Merge rollt die ganze Sache zurück.** Wenn der Merge
  in main gelingt, der Merge in develop aber Konflikte hat, bliebe dir sonst ein
  halbfertiges Release. Gitcito stellt jeden Branch dort wieder her, wo er war,
  und meldet den Konflikt. Merge diesen Branch manuell, löse ihn im
  [Konfliktlöser](conflicts.md) auf, und den Flow schließt du von Hand ab.
- **Es pusht nie.** Abschließen ist lokal. Pushe main, develop und den neuen Tag,
  wenn du so weit bist — siehe [Synchronisieren](syncing.md).

### Rückgängig

Ein **Rückgängig** stellt alles wieder her: Beide Branches kehren zu ihren
vorherigen Commits zurück, der Tag wird gelöscht, und der abgeschlossene Branch
wird an seiner alten Spitze neu angelegt. Genau das ist der Grund, warum
Abschließen gefahrlos ausprobiert werden kann.

## Wann du es nicht verwenden solltest

Git flow passt zu Software mit versionierten Releases und einem unterstützten
Produktions-Branch. Wenn du mehrmals täglich aus `main` deployst, sind die
Release- und Hotfix-Branches Zeremonie, die du nicht nutzen wirst —
[gestapelte Branches](stacks.md) oder schlichte kurzlebige Branches von `main`
passen dafür besser. Die Feature-Hälfte des Modells funktioniert für sich allein
trotzdem gut.
