---
title: Einstellungen pro Repository
category: Workspace-Werkzeuge
order: 94
summary: Geschützte Branches, Info, Auswertung, Historie und das Operationsprotokoll.
keywords: repo einstellungen settings geschützte branches protected auswertung analytics operationsprotokoll log historie info zahnrad
---

# Einstellungen pro Repository

Das Zahnrad neben den Werkzeugen in der Symbolleiste öffnet Einstellungen, die
zu **diesem** Repository gehören, nicht zur App.

![Einstellungen pro Repository](../../screenshots/repo-settings.webp)

| Tab | Was drinsteckt |
|---|---|
| **Allgemein** | Geschützte Branches (eine Mehrfachauswahl von Branches, in der git-Konfiguration gespeichert), Signieren |
| **Config** | Die [Regeln, die dieses Repository mitbringt](repo-config.md), in `.gitcito.json` — und der Doctor, der sie prüft |
| **Info** | Freie Notizen und Felder zu diesem Repository, lokal gespeichert |
| **Tresor** | Die Einträge im [Tresor](vault.md) dieses Repositorys |
| **Einblicke** | Das [Historie-Dashboard](insights.md) |
| **Auswertung** | Was du in diesem Repository getan hast, lokal gezählt |
| **Historie** · **Protokolle** | Das Operationsprotokoll: jeder git-Befehl, den Gitcito ausgeführt hat, samt seiner Ausgabe |

Das Operationsprotokoll ist das ehrliche: Wenn sich etwas seltsam verhält, zeigt
es den exakten Befehl und den exakten Fehler — damit ein Fehlerbericht Fakten
transportieren kann statt Adjektive.

**Siehe auch:** [Sicherheit & Geheimnisse](security.md) · [Einblicke](insights.md)
