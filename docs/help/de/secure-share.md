---
title: Sicheres Teilen
category: Sicherheit
order: 72
summary: Einstellungen, Tresor-Einträge oder einen ganzen Workspace zwischen Maschinen umziehen.
keywords: sicheres teilen secure share export import paket bundle verschlüsselt einstellungen workspace übertragen maschine
---

# Sicheres Teilen

Eine neue Maschine einzurichten heißt normalerweise, alles noch einmal von Hand
einzutippen. Sicheres Teilen packt es stattdessen in ein einziges
verschlüsseltes Paket.

![Export der Einstellungen eines Repositorys als verschlüsseltes Paket](../../screenshots/secure-share.webp)

![Derselbe Export für einen ganzen Workspace](../../screenshots/secure-workspace.webp)

## Was hineinkommen kann

| Abschnitt | Inhalt |
|---|---|
| **Einstellungen** | Themes, Layout, Kürzel, Vorlieben |
| **Tresor** | Globale und repo-spezifische Geheimnisse |
| **Repositorys** | Die Repositorys eines Workspace, beim Import über Remote oder Ordner zugeordnet |

Geheimnisse landen ausschließlich dann im Paket, wenn du **das Häkchen setzt**.
Ein Paket ohne dieses Häkchen enthält überhaupt keine Zugangsdaten.

## Importieren

Der Import-Bildschirm zeigt **vorher** Abschnitt für Abschnitt, was drin ist,
bevor irgendetwas angewendet wird. Repositorys werden dem zugeordnet, was du
schon hast — zuerst über die Remote-URL, dann über den Ordner —, damit der
Import nicht die halbe Welt noch einmal klont.

**Siehe auch:** [Tresor](vault.md) · [Sicherheit & Geheimnisse](security.md)
