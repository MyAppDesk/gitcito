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

### Prendre soin des arbres de travail

Un arbre de travail créé le mois dernier s’oublie vite, et les questions arrivent au moment du ménage : y a-t-il du travail dedans ? Le dossier existe-t-il encore ? Chaque ligne y répond avant que vous ayez à les poser.

| Sur la ligne | Signifie |
|---|---|
| **●3** | Trois fichiers avec des modifications non validées dans cet arbre de travail |
| **↑2 ↓1** | Sa branche a deux commits d’avance et un de retard sur son upstream |
| 🔒 | Verrouillé — survolez-le pour voir la raison donnée lors du verrouillage |
| **absent**, nom barré | Le dossier n’existe plus ; git n’en garde que l’enregistrement |

Les compteurs sont lus à l’ouverture de la section, quand le commit de cet arbre de travail change et quand la fenêtre reprend le focus — pas à chaque rafraîchissement, car chacun est un `git status` dans un autre dossier.

Clic droit sur une ligne pour :

| Action | Ce qu’elle fait |
|---|---|
| **Verrouiller l’arbre de travail** | Empêche git (et tout autre client) de le nettoyer, le déplacer ou le supprimer. Donnez une raison — *sur le disque externe* — et elle s’affiche sur le cadenas. Pour les arbres de travail sur un support pas toujours branché. |
| **Déverrouiller l’arbre de travail** | L’inverse. Annuler le reverrouille avec la même raison. |
| **Déplacer l’arbre de travail…** | Déplace le dossier et met à jour les liens de git dans les deux sens. Indisponible s’il est verrouillé ou ouvert dans un onglet : les onglets et leur disposition sont mémorisés par chemin, l’onglet ne pointerait plus sur rien. Fermez-le d’abord. Annuler le remet en place. |
| **Supprimer l’arbre de travail** | Demande d’abord à git ce qui serait perdu. Un arbre propre reçoit la confirmation habituelle, et annuler le recrée sur la même branche dans le même dossier. Un arbre avec des modifications non validées reçoit une autre confirmation, *Abandonner et supprimer*, qui indique le nombre de fichiers, sans annulation possible. |
| **Reconnecter le dossier déplacé…** | Seulement sur une ligne *absente* : indiquez où est parti le dossier (déplacé dans le gestionnaire de fichiers) et git le relie avec `git worktree repair`. |
| **Oublier les arbres de travail absents** | C’est aussi le bouton gomme dans l’en-tête de la section, affiché quand une ligne est absente. Lance `git worktree prune`. |

Ce que ces actions **ne** font **pas** :

- **Supprimer un arbre de travail efface aussi ses fichiers ignorés** — `.env`, `node_modules`, sorties de build. Git ne les compte pas comme des modifications ; même la confirmation « propre » le signale, et l’annulation ne les restaure pas.
- **Oublier ne supprime que l’enregistrement de git.** Il n’y a aucun fichier à effacer — le dossier a disparu — et les arbres verrouillés sont ignorés, car un arbre verrouillé sur un disque débranché ressemble exactement à un arbre supprimé.
- Un verrou est une convention entre clients git, pas une protection de fichiers : rien n’empêche un outil extérieur à git d’effacer le dossier.
- L’arbre de travail principal — le dépôt lui-même — ne peut être ni verrouillé, ni déplacé, ni supprimé.
- Supprimer un arbre de travail ne supprime jamais sa branche. Supprimez-la depuis la liste des branches si vous en avez fini.

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
