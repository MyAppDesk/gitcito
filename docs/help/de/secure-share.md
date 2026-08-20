---
title: Sicheres Teilen
category: Sicherheit
order: 72
summary: Geheimnisse, Notizen oder einen ganzen Workspace als eine verschlüsselte Datei zwischen Maschinen — oder Teammitgliedern — umziehen.
keywords: sicheres teilen secure share export import paket bundle verschlüsselt encrypted workspace übertragen maschine team notizen struktur kein backend
---

# Sicheres Teilen

Eine neue Maschine — oder ein neues Teammitglied — einzurichten heißt
normalerweise, alles noch einmal von Hand einzutippen. Sicheres Teilen packt es
stattdessen in eine einzige verschlüsselte `.gitcito`-Datei: Gitcitos
Team-Funktionen haben **kein Backend**, die Datei *ist* also der Transport.
Verschicke sie, wie du ohnehin Dateien verschickst; das Passwort reist
getrennt.

![Export der Einstellungen eines Repositorys als verschlüsseltes Paket](../../screenshots/secure-share.webp)

![Derselbe Export für einen ganzen Workspace](../../screenshots/secure-workspace.webp)

## Was hineinkommen kann

| Abschnitt | Inhalt |
|---|---|
| **Tresor** | Die Geheimnisse des globalen Tresors (repo-spezifische Tresor-Einträge bleiben, wo sie sind) |
| **Repository-Dateien** | Unversionierte Konfigurations- und Geheimnisdateien, beim Import unter denselben relativen Pfaden wiederhergestellt |
| **Workspace-Struktur** | Das Tab-Layout selbst — Gruppen, Farben, Reihenfolge — mit Repositorys, die über die Remote-URL referenziert werden, nie über deine lokalen Pfade |
| **Commit-Notizen** | Das `refs/notes/commits` eines Repositorys, beim Import angewendet, ohne Schreibzugriff auf irgendein Remote zu brauchen |

Geheimnisse landen ausschließlich dann im Paket, wenn du **das Häkchen setzt**.
Ein Paket ohne dieses Häkchen enthält überhaupt keine Zugangsdaten.
App-Einstellungen reisen nicht in einem Paket — sie haben ihren eigenen
Klartext-JSON-Export in den Einstellungen.

## Importieren

Der Import-Bildschirm zeigt **vorher** Abschnitt für Abschnitt, was drin ist,
bevor irgendetwas angewendet wird. Repositorys werden dem zugeordnet, was du
schon hast — zuerst über die Remote-URL, dann über den Ordner —, damit der
Import nicht die halbe Welt noch einmal klont.

Ein Abschnitt **Workspace-Struktur** baut den Workspace mit den Repositorys
wieder auf, die du schon hast; die, die dir fehlen, werden mit ihrem Remote
aufgelistet, damit du sie zuerst klonen und dann erneut importieren kannst —
Gitcito klont hier nie von sich aus. Ein Abschnitt **Commit-Notizen** zeigt
vorab, was landen würde — neu, identisch, abweichend oder an Commits hängend,
die du nicht hast — und abweichende Notizen werden nur ersetzt, wenn du
**Überschreiben** ankreuzt; ein Merge auseinanderlaufender Notizen findet nicht
statt.

**Siehe auch:** [Tresor](vault.md) · [Sicherheit & Geheimnisse](security.md) ·
[Commit-Notizen](notes.md) · [Workspaces, Tabs & Gruppen](workspaces.md)
