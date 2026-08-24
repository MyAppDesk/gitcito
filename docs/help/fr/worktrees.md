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

- Créez et supprimez des arbres de travail depuis la barre latérale. Un
  **double-clic** en ouvre un dans son propre onglet ; le clic droit propose
  *Ouvrir l'arbre de travail*, *Afficher dans le dossier* et la suppression.
- Clic droit sur n'importe quelle branche locale → **Ouvrir dans un arbre de
  travail** pour en monter un dans un dossier voisin et l'ouvrir comme onglet.
- Une branche ne vit que dans un seul arbre de travail à la fois : extraire une
  branche qu'un autre arbre détient ne peut pas marcher — git refuse par
  *already used by worktree at …*. Gitcito vous y emmène plutôt : le menu de la
  branche indique *Aller à `x` dans son arbre de travail*, et un double-clic sur
  la ligne ouvre l'onglet de cet arbre au lieu d'échouer.

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
