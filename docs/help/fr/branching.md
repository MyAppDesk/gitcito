---
title: Branches, distants et barre latérale
category: Branches et chirurgie
order: 40
summary: Tout ce que fait la barre latérale gauche, et les branches épinglées.
keywords: branche branch branches créer create extraire checkout renommer rename supprimer delete distant remote épinglée pinned barre latérale sidebar présence
---

# Branches, distants et barre latérale

Une seule barre latérale, réordonnable et cherchable, contient les **branches,
les distants, les étiquettes, les remisages, les arbres de travail et les
sous-modules**. Chaque section peut être masquée ou déplacée (Réglages →
Disposition), et le champ de filtre s'applique à toutes.

![La barre latérale, avec les branches épinglées maintenues en haut](../../screenshots/pinned-branches.webp)

## Branches

Créer, extraire, renommer et supprimer — en local comme en distant. Les lignes de
branche affichent :

- **↑en avance / ↓en retard** par rapport à leur amont,
- des **badges de présence par distant** (quels distants possèdent cette
  branche),
- un **point de risque** après un passage du [radar de
  conflits](conflict-radar.md),
- un **marqueur ⟳** quand le distant a [réécrit l'histoire](range-diff.md).

Les branches dont le nom contient un `/` se replient automatiquement en dossiers
pliables.

![Des noms de branche séparés par des barres obliques, repliés en arborescence](../../screenshots/branch-grouping.webp)

## Branches épinglées

Marquez d'une étoile les branches sur lesquelles vous revenez sans cesse —
survolez la ligne et cliquez ★, ou clic droit → *Épingler la branche*. Elles
remontent dans un groupe **Épinglées** en haut de la section Locales, mémorisé
par dépôt, tout en restant à leur place habituelle en dessous.

## Extraire une branche distante

Double-cliquez une branche distante pour créer la branche locale qui la suit. Si
une branche locale de ce nom existe déjà et a **divergé**, Gitcito demande
comment réconcilier — rebase, fusion ou réinitialisation — et propose de
sauvegarder la branche d'abord.

![L'invite de branche divergente : rebaser, fusionner ou réinitialiser, avec une option de sauvegarde](../../screenshots/diverged-checkout.webp)

**Voir aussi :** [Fusion et rebase](merging.md) · [Arbres de travail](worktrees.md)
