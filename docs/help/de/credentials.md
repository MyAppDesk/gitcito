---
title: Credential Helper
category: Sicherheit
order: 73
summary: Gits eigener Passwortspeicher — der dritte — und warum https dich immer wieder fragt.
keywords: credential helper passwort https fragt wieder osxkeychain wincred manager libsecret store cache git-credentials klartext plaintext vergessen widerrufen revoked token 401
---

# Credential Helper

Gitcito verwaltet drei verschiedene Arten von Geheimnissen, und man nimmt
verständlicherweise an, es sei ein und dasselbe:

| | Verwaltet von |
|---|---|
| API-Tokens der Hoster — PRs, Issues, CI-Checks | Gitcito, in deinem [OS-Schlüsselbund](security.md) |
| `git@…`-Transport | Deinem [SSH-Schlüssel](ssh-keys.md), über den ssh-Agent des Systems |
| **`https://`-Transport** | **Gits eigenem Credential Helper** |

Der dritte gilt niemandem als Feature, bis er schiefgeht — und dann produziert
er die zwei häufigsten Beschwerden in git: *Warum fragt es mich schon wieder?*
und *Warum schickt es immer noch das Token, das ich widerrufen habe?*

`⌘K` → **Credential Helper**.

![Der konfigurierte Helper, Regeln pro Host und die Warnung zur Klartextdatei](../../screenshots/credentials.webp)

## Was du hier siehst

Jeden konfigurierten `credential.helper`, in dem Scope, aus dem er stammt —
`system`, `global`, dann dieses Repository. **Helper stapeln sich**: git fragt
jeden der Reihe nach, und einer auf Repository-Ebene ersetzt keinen globalen.

Jeder wird gegen deine Maschine geprüft:

| Kennzeichen | Bedeutet |
|------|-------|
| **bereit** | Das Helper-Programm existiert und wird laufen |
| **nicht installiert** | Konfiguriert, aber das Programm fehlt — jede Abfrage fällt darauf zurück, dass du es erneut tippst |
| **Passwörter in einer Klartextdatei** | Der `store`-Helper (siehe unten) |

**Regeln für bestimmte Hosts** listet die `credential.<url>.*`-Abschnitte auf.
Diese schlagen die einfache Einstellung für die URLs, auf die sie passen, und
sind meist die Antwort auf „Warum verhält sich ausgerechnet dieser Host anders?“.

## Einen auswählen

| Helper | Wohin das Passwort geht |
|--------|------------------------|
| `osxkeychain` | macOS Keychain — verschlüsselt, pro Benutzer |
| `manager` | Git Credential Manager (Windows, plattformübergreifend) |
| `wincred` | Windows Credential Manager |
| `libsecret` | Der Linux-Secret-Service (GNOME Keyring, KWallet) |
| `cache` | Arbeitsspeicher, für 15 Minuten. Nichts auf der Platte |
| `store` | **Eine Klartextdatei in deinem Home-Verzeichnis. Unverschlüsselt** |

Gitcito bietet an, was auf dieser Maschine tatsächlich installiert ist,
markiert den, der zu deinem Betriebssystem passt, und graut den Rest aus.

**Der Scope zählt.** *Für jedes Repository* schreibt in deine globale
Konfiguration, und das willst du fast immer; *nur für dieses Repository* ist für
das eine seltsame Repo gedacht, das sich gegen etwas anderes authentifiziert.

## Der `store`-Helper und `~/.git-credentials`

`store` schreibt Zeilen der Form `https://user:password@host` nach
`~/.git-credentials`, im Klartext, ohne jede Verschlüsselung. Alles, was unter
deinem Benutzer läuft, kann sie lesen: ein Skript, das postinstall einer
Abhängigkeit, irgendetwas.

Existiert diese Datei, sagt diese Seite das und zählt die Einträge. Sie zeigt
sie nie an — die Zahl ist der ganze Punkt, und die Inhalte zum Anzeigen
auszulesen wäre derselbe Fehler noch einmal.

Wenn du eine findest und das nicht wolltest: Wähle hier einen echten Helper,
lösche dann die Datei und authentifiziere dich einmal neu.

## Eine gespeicherte Anmeldung vergessen

Wird ein Token widerrufen oder rotiert, reicht der Helper weiterhin das alte
heraus, und jeder Push scheitert an einem 401, der nichts benennt. **Vergessen**
bittet den konfigurierten Helper, seinen Eintrag für diesen Host zu löschen —
`git credential reject`, gits eigener dokumentierter Weg.

Dabei wird unterwegs nichts gelesen: Gitcito ruft niemals `git credential fill`
auf, den Befehl, der ein gültiges Passwort auf die Standardausgabe schreiben
würde.

Der nächste Push fragt dich einmal, und der Helper speichert die neue Antwort.

## Grenzen, die man kennen sollte

- **Das ist gits Speicher, nicht Gitcitos.** Ihn zu ändern ändert auch, was dein
  Terminal tut — was genau der Sinn ist, aber man sollte es wissen, bevor man
  ihn ändert.
- **Helper auf Systemebene werden angezeigt, sind aber nicht editierbar.** Sie
  stehen in einer Konfiguration, die nur ein Administrator schreiben kann.
- **Gitcito kann nicht auflisten, was ein Helper vorhält.** Keine
  Credential-API gibt das preis, ohne die Geheimnisse selbst herauszugeben —
  also meldet der Dialog die Konfiguration und löscht auf Anforderung, und sonst
  nichts.
- **Ein Token, das du Gitcito gegeben hast, ist davon getrennt.** Eines zu
  widerrufen rührt das andere nicht an; siehe [Sicherheit](security.md) für die
  Schlüsselbund-Seite.

Siehe auch: [Sicherheit](security.md) · [SSH-Schlüssel](ssh-keys.md) ·
[Synchronisieren](syncing.md)
