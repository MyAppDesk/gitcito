---
title: Arbres de travail et sous-modules
category: Synchronisation et multi-dépôts
order: 54
summary: Plusieurs extractions d'un même dépôt ; et des dépôts à l'intérieur de dépôts.
keywords: arbre de travail worktree worktrees sous-module submodule submodules extraction liée linked checkout init sync synchroniser
---

# Arbres de travail et sous-modules

## Arbres de travail

Un arbre de travail est une seconde extraction du même dépôt, dans son propre
dossier — vous pouvez donc regarder `main` pendant que `feature/x` reste
exactement comme vous l'avez laissée, sans rien remiser.

- Créez et supprimez des arbres de travail depuis la barre latérale, et ouvrez-en
  un **dans sa propre fenêtre**.
- Clic droit sur n'importe quelle branche locale → **Ouvrir dans un arbre de
  travail** pour en monter un dans un dossier voisin et l'ouvrir comme onglet.

![Les sections arbres de travail et sous-modules de la barre latérale, toutes deux remplies](../../screenshots/worktrees.webp)

## Sous-modules

Ajoutez, mettez à jour (init et extraction), synchronisez les URL et supprimez
des sous-modules, avec un état en direct pour chacun :

| État | Signifie |
|---|---|
| **Synchronisé** | Extrait au commit que le parent enregistre |
| **Modifié** | Extrait ailleurs, ou sale |
| **Non initialisé** | Enregistré, mais jamais extrait |

![Des sous-modules portant leur état, une ligne chacun](../../screenshots/submodule-states.webp)

**Voir aussi :** [LFS et sparse-checkout](lfs-sparse.md) · [Récupérer, tirer et pousser](syncing.md)
