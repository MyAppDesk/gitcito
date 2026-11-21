---
title: Umgebungsprüfung
category: Erste Schritte
order: 6
summary: Worauf Gitcito außerhalb der eigenen Installation angewiesen ist — git, LFS, das native Terminal, git's Credential Helper, die GitHub CLI und Datei-Überwachung — an einer Stelle geprüft.
keywords: umgebung environment doktor diagnose prüfung git version lfs node-pty terminal basis-shell credential helper store gh github cli scopes workflow inotify max_user_watches
---

# Umgebungsprüfung

Manche Fehler haben gar nichts mit dem Repository zu tun. Sie kommen von der
Maschine: ein git, das zu alt für die Profil-Anmeldung ist, ein Terminal, das
still in den Basismodus gefallen ist, eine GitHub-CLI-Anmeldung, die keine
Workflow-Dateien pushen darf. Jeder davon zeigt sich später als vager Fehler,
mitten in etwas anderem. **Einstellungen → Umgebung** (auch *Settings:
Environment* in der Befehlspalette) prüft sie vorab.

Der [Repository-Doktor](repo-settings.md) beantwortet eine andere Frage: ob
*dieses Repository* hier bauen kann, nach dem, was seine `.gitcito.json`
verlangt. Die Umgebungsprüfung betrifft die App selbst und ist für jedes
Repository gleich.

![Umgebungsprüfungen in den Einstellungen](../../screenshots/settings-environment.webp)

## Was geprüft wird

| Zeile | Grün heißt | Gelb oder rot heißt |
|-------|------------|---------------------|
| **Git** | git 2.31 oder neuer liegt im `PATH` | Älter als 2.31: Das Konto eines [Profils](profiles.md) kann sich für Fetch und Push nicht anmelden. Fehlt: Nichts funktioniert, bis git installiert ist |
| **Git LFS** | `git lfs` ist installiert | Nicht installiert. Nur Repositories, die Dateien in LFS halten, brauchen es |
| **Terminal** | Das native Terminal wurde geladen | Das [Terminal](terminal.md) läuft im Basismodus: keine Farben, keine Größenänderung, keine Vollbildprogramme |
| **Credential Helper** | git hat einen Helper für HTTPS-Passwörter — global oder für bestimmte Hosts (was `gh auth setup-git` einrichtet) | Kein Helper, also fragt git außerhalb von Gitcito jedes Mal. Oder `store`, das sie im Klartext ablegt. Siehe [Credential Helper](credentials.md) |
| **GitHub CLI** | `gh` ist mit dem Scope `workflow` angemeldet | Ohne ihn angemeldet: GitHub lehnt jeden Push ab, der `.github/workflows` ändert |
| **Datei-Überwachung** (Linux) | Das inotify-Limit ist mindestens 65.536 | Ein niedrigeres Limit ist mit ein paar großen offenen Repositories erschöpft, und neue Ordner aktualisieren den Status nicht mehr |

Eine Zeile, die nicht zutrifft, entfällt: die GitHub CLI, wenn sie nicht
installiert oder nicht angemeldet ist, die Datei-Überwachung unter macOS und
Windows.

## Beheben, was sie findet

Wo es eine Lösung gibt, zeigt die Zeile sie als Befehl mit Kopier-Knopf. Zum
Beispiel fügt `gh auth refresh -h github.com -s workflow` den fehlenden Scope
hinzu, und eine `sysctl`-Zeile hebt das inotify-Limit an. **Die Seite führt
selbst nie etwas aus.** Manche Lösungen brauchen `sudo` oder ändern globale
Konfiguration, und die solltest du lesen, bevor du sie ausführst. Danach
**Erneut prüfen** drücken.

## Grenzen

- Geprüft wird, was die App aus ihrem eigenen Prozess sieht. Ein Shell-Profil,
  das `PATH` nur in deinem Terminal ändert, kann die beiden auseinanderbringen.
- Die GitHub-CLI-Zeile spiegelt die eigene Anmeldung von `gh`, nicht die unter
  **Einstellungen → Integrationen** verbundenen Konten. Das sind getrennte
  Anmeldungen. Ein fehlender `workflow`-Scope dort zeigt sich stattdessen als
  abgelehnter Push.
- Sie meldet, was installiert ist. Sie installiert oder aktualisiert nichts.
