---
title: Missionskontrolle
category: Sync & viele Repos
order: 51
summary: Jedes Repository des Workspace auf einem Bildschirm — das Schlimmste zuerst.
keywords: missionskontrolle mission control dashboard übersicht alle repos overview status dirty ungepusht unpushed behind zurück workspace
---

# Missionskontrolle

Zwanzig Repositorys, und die Frage ist immer dieselbe: Welches braucht mich?

Die Missionskontrolle beantwortet sie. Jedes Repository des **aktiven
Workspace** auf einem Bildschirm, sortiert danach, was dich tatsächlich braucht:

1. **Blockiert** — ein halb stehengebliebenes Rebase oder Merge, Konflikte, ein
   Repo, das sich überhaupt nicht lesen lässt.
2. **Zu synchronisieren** — Commits zum Pullen, dann Commits zum Pushen.
3. **In Arbeit** — nicht committete Arbeit, ungetrackte Dateien.
4. **Sauber** — die stillen, ganz unten, wo sie hingehören.

![Jedes Repository auf einem Bildschirm, das Schlimmste zuerst](../../screenshots/mission-control.webp)

## Was dir eine Zeile sagt

Branch und sein Upstream · ↑voraus / ↓zurück · Anzahl nicht committeter und
ungetrackter Dateien · Stashes · offene PRs (wenn das Repo schon geladen ist) ·
eine **Sparkline der Commits über 14 Tage** · wie lange der letzte Commit her
ist.

Klapp eine Zeile auf (das Chevron oder <kbd>Leertaste</kbd>), um genau zu
sehen, welche Commits auf ihren Push warten und welche Dateien schmutzig sind.

## Die Liste abarbeiten

- Die Status-Pillen oben sind **Filter** — klick auf „3 blockiert", um nur diese
  zu sehen.
- Sortieren nach **Dringlichkeit**, **Name** oder **Aktivität**.
- **Häkchen bei mehreren Repos** setzen, um sie zu fetchen — oder nur die zu
  pullen, die zurückhängen (der Knopf zählt sie für dich).
- Solange sie offen ist, aktualisiert sie sich alle 30 Sekunden selbst.

| Taste | Aktion |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> oder <kbd>j</kbd> <kbd>k</kbd> | Durch die Liste laufen |
| <kbd>Enter</kbd> | Dieses Repository öffnen |
| <kbd>f</kbd> / <kbd>p</kbd> | Fetch / Pull darauf |
| <kbd>Leertaste</kbd> | Aufklappen |
| <kbd>/</kbd> | Zum Filter springen |

## Es ist eine Ansicht, kein Tab

Die Anzeige neben dem Workspace-Namen schaltet sie um; ein Klick auf einen
beliebigen Tab bringt dich zurück an die Arbeit. Sie legt nie einen eigenen Tab
an, und sie gehört zu dem Workspace, in dem du gerade bist — wechsle den
Workspace, und du bekommst das Dashboard dieses Workspace.

Sie zu lesen ist **rein lokal**: ein `git status` pro Repository, kein Netzwerk,
keine Tokens. Das Dashboard zu öffnen authentifiziert dich nirgendwo. Ein Fetch
ist immer etwas, worum du gebeten hast.

**Siehe auch:** [Workspaces & Tabs](workspaces.md) · [Workspaces, Tabs & Gruppen](workspaces.md)
