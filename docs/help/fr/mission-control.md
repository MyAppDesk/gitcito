---
title: Centre de contrôle
category: Synchronisation et multi-dépôts
order: 51
summary: Tous les dépôts de l'espace de travail sur un seul écran, les plus urgents en tête.
keywords: centre de contrôle mission control tableau de bord dashboard tous les dépôts all repos vue d'ensemble overview état status sale dirty non poussé unpushed en retard behind espace de travail workspace
---

# Centre de contrôle

Vingt dépôts, et la question est toujours la même : lequel a besoin de moi ?

Le centre de contrôle y répond. Tous les dépôts de l'**espace de travail actif**
sur un seul écran, ordonnés selon ce qui réclame réellement votre attention :

1. **Bloqué** — un rebase ou une fusion laissés à moitié, des conflits, un dépôt
   totalement illisible.
2. **À synchroniser** — des commits à tirer, puis des commits à pousser.
3. **En cours** — travail non validé, fichiers non suivis.
4. **Propre** — les tranquilles, tout en bas, là où ils doivent être.

![Tous les dépôts sur un seul écran, les plus urgents en tête](../../screenshots/mission-control.webp)

## Ce que dit une ligne

La branche et son amont · ↑en avance / ↓en retard · les compteurs de fichiers non
validés et non suivis · les remisages · les pull requests ouvertes (quand le
dépôt est déjà chargé) · un **graphique de commits sur 14 jours** · le temps
écoulé depuis le dernier commit.

Dépliez une ligne (le chevron, ou <kbd>espace</kbd>) pour voir exactement quels
commits attendent d'être poussés et quels fichiers sont sales.

## Travailler la liste

- Les pastilles d'état en haut sont des **filtres** — cliquez « 3 bloqués » pour
  ne voir que ceux-là.
- Triez par **urgence**, par **nom** ou par **activité**.
- **Cochez plusieurs dépôts** pour les récupérer, ou tirez seulement ceux qui
  sont en retard (le bouton les compte pour vous).
- Il se rafraîchit tout seul toutes les 30 secondes tant qu'il est ouvert.

| Touche | Action |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> ou <kbd>j</kbd> <kbd>k</kbd> | Parcourir la liste |
| <kbd>Enter</kbd> | Ouvrir ce dépôt |
| <kbd>f</kbd> / <kbd>p</kbd> | Le récupérer / le tirer |
| <kbd>espace</kbd> | Le déplier |
| <kbd>/</kbd> | Sauter au filtre |

## C'est une vue, pas un onglet

La jauge à côté du nom de l'espace de travail l'ouvre et la ferme ; cliquer sur
n'importe quel onglet vous ramène à votre travail. Elle n'ajoute jamais d'onglet
à elle, et elle appartient à l'espace de travail où vous êtes — changez d'espace
de travail et vous obtenez le tableau de bord de celui-ci.

Sa lecture est **purement locale** : un `git status` par dépôt, pas de réseau,
pas de jetons. Ouvrir le tableau de bord n'authentifie jamais nulle part. Une
récupération est toujours quelque chose que vous avez demandé.

**Voir aussi :** [Espaces de travail et onglets](workspaces.md) · [Espaces de travail, onglets et groupes](workspaces.md)
