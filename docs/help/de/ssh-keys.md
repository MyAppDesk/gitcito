---
title: SSH-Schlüssel
category: Sync & viele Repos
order: 57
summary: Warum dein Token für ein git@-Remote nichts ausrichtet, und wie du siehst, welcher Schlüssel versagt.
keywords: ssh schlüssel key keys agent ssh-add ssh-keygen ed25519 publickey permission denied fingerabdruck fingerprint passphrase hochladen upload github known_hosts
---

# SSH-Schlüssel

**Einstellungen → Sicherheit → SSH-Schlüssel.**

## Warum das hier neben den Tokens steht

Gitcito authentifiziert zwei verschiedene Dinge, und man hält sie
verständlicherweise für dasselbe:

| | Authentifiziert durch |
|---|---|
| Die **API des Hosts** — Repos, PRs, Issues, CI-Checks | Dein [Token](hosting.md) |
| Git-Transport über `https://` | Dein Token, in die URL eingebaut |
| Git-Transport über **`git@…`** | **Deinen SSH-Schlüssel, über das System-SSH** |

Ein Remote wie `git@github.com:me/api.git` rührt das Token nie an. Git reicht
die Verbindung an `ssh` weiter, und `ssh` hat noch nie von einem Personal Access
Token gehört. Das ist kein Randfall — genau das passiert, wenn eine Kollegin das
Repo aufgesetzt hat, wenn eine `.gitmodules` `git@`-URLs benutzt, wenn deine
Firma HTTPS-Auth abschaltet oder wenn der Host ein selbst betriebenes GitLab
ist.

Wenn dabei etwas schiefgeht, sagt ssh `Permission denied (publickey)` und sonst
nichts. Technisch korrekt, als Ratschlag nutzlos.

![Jeder Schlüssel in ~/.ssh mit Typ, Fingerabdruck und ob der Agent ihn hält](../../screenshots/ssh-keys.webp)

## Was dir der Abschnitt sagt

Zu jedem in `~/.ssh` gefundenen Schlüssel siehst du Typ, Größe, Fingerabdruck
und Kommentar — dazu die eine Tatsache, die die meisten plötzlichen Fehlschläge
erklärt:

**im Agent** / **nicht im Agent.** Ein Schlüssel, den der Agent nicht hält, kann
gar nichts authentifizieren, und der Agent vergisst seinen Inhalt beim Neustart,
sofern dem Betriebssystem nichts anderes gesagt wurde. „Gestern ging es doch
noch" ist meistens genau das.

## Was du hier tun kannst

| Aktion | Was sie ausführt |
|--------|--------------|
| **Öffentlichen Schlüssel kopieren** | Legt die `.pub`-Zeile in die Zwischenablage, fertig zum Einfügen bei jedem Host |
| **Zum Agent hinzufügen** | `ssh-add` (auf macOS mit `--apple-use-keychain`, damit es einen Neustart übersteht) |
| **Zu GitHub hochladen** | `POST /user/keys` mit dem Token dieses Profils |
| **Schlüssel erzeugen** | `ssh-keygen -t ed25519`, kommentiert mit deiner git-E-Mail |
| **Verbindung testen** | `ssh -T git@<host>`, übersetzt in einen ganzen Satz |

**Verbindung testen** gibt es, weil ssh selbst irreführend antwortet: GitHub
authentifiziert dich erfolgreich und beendet sich *danach* mit einem Fehlercode,
weil es keine Shell anbietet. Gitcito liest die Meldung statt des Exit-Codes und
zeigt die Rohausgabe darunter, damit du seine Deutung überprüfen kannst.

## Die Grenzen, unverblümt

- **Hochladen geht nur bei GitHub.** GitLab, Bitbucket und Azure DevOps bekommen
  *Öffentlichen Schlüssel kopieren* und einen Link direkt zu ihrer
  Schlüsseleinstellungsseite. Schlüssel bei den anderen dreien zu registrieren
  ist nicht implementiert, und der Knopf tut auch nicht so.
- **Erzeugen überschreibt nie.** Ein Name, den es in `~/.ssh` schon gibt, wird
  abgelehnt. Einen privaten Schlüssel stillschweigend zu überschreiben nimmt dir
  den Zugang zu allem, was ihm vertraut, und kein Bestätigungsdialog macht das
  wieder gut.
- **Passphrasen speichert Gitcito nicht.** Du tippst eine ein, wenn du einen
  Schlüssel erzeugst oder ihn dem Agent hinzufügst; sie wird an
  `ssh-keygen`/`ssh-add` gereicht und fallen gelassen. Sie über Neustarts hinweg
  aufzubewahren ist die Aufgabe des Schlüsselbunds des Betriebssystems, über
  `ssh-add`.
- **Kein Bearbeiten von `~/.ssh/config`**, keine Host-Aliase, keine Schlüsselwahl
  pro Repo. Das gehört in deine ssh-Konfiguration, und Gitcito lässt diese Datei
  in Ruhe.

## Was deine Maschine nie verlässt

**Gitcito liest, zeigt und sendet niemals einen privaten Schlüssel.** Der
Abschnitt listet öffentliche Hälften und Fingerabdrücke. Das Einzige, was
überhaupt je irgendwohin geschickt wird, ist der öffentliche Schlüssel, bei dem
du ausdrücklich auf **Hochladen** drückst — und der geht zu GitHub, unter deinem
eigenen Token, nach einer Bestätigung, die den Fingerabdruck nennt.

Siehe auch: [Sicherheit & Geheimnisse](security.md) · [Hosting & Pull Requests](hosting.md)
