---
title: Menu contextuel du dépôt
category: Pour commencer
order: 4
summary: Clic droit sur n'importe quelle pastille ou n'importe quel onglet de dépôt pour l'alias, les worktrees, GitHub, le terminal et le retrait.
keywords: menu contextuel context menu clic droit right-click alias worktree github terminal afficher reveal éditeur editor retirer remove onglet de dépôt repository tab
---

# Menu contextuel du dépôt

Faites un clic droit sur un dépôt — un onglet isolé, une pastille dans un
groupe, une pastille dans un dossier imbriqué, une ligne de la liste
d'accueil/du lanceur, ou une ligne de la liste déroulante des dépôts de la
barre d'outils — et vous obtenez le même menu propre au dépôt. La pastille du
groupe elle-même continue d'ouvrir le menu du groupe ; le clic doit atterrir
sur le dépôt.

![Le menu contextuel du dépôt sur une pastille dans un groupe](../../screenshots/repo-context-menu.webp)

La liste déroulante des dépôts de la barre d'outils recense tous les dépôts
ouverts, comme la liste déroulante des branches recense les branches. Un clic
gauche sur une ligne bascule vers ce dépôt. Un clic droit sur une ligne (ou sur
la pastille du dépôt courant elle-même) donne l'alias, les worktrees, GitHub,
le terminal, l'affichage, l'éditeur et le retrait. **Ouvrir un dépôt…** en bas
ouvre le lanceur.

![Clic droit sur une ligne de la liste déroulante des dépôts de la barre d'outils](../../screenshots/repo-dropdown-context-menu.webp)

## Ce que fait chaque action

| Action | Effet |
|---|---|
| **Créer un alias…** / **Modifier l’alias…** | Un nom d'affichage, rien de plus. Gitcito ne renomme ni ne déplace jamais le dossier sur le disque. Le même alias suit le dépôt à travers les onglets, les groupes et les espaces de travail. |
| **Supprimer l’alias** | Affiché quand un alias existe. Restaure le nom du dossier. |
| **Afficher les worktrees** | Met ce dépôt au premier plan et ouvre la section des worktrees de la barre latérale. |
| **Nouveau worktree…** | La même invite de création de worktree que depuis une branche. Désactivé quand le chemin est introuvable ou qu'une fusion, un rebase, un cherry-pick ou un revert est en cours. |
| **Copier le nom du dépôt** | Copie le nom canonique du dossier, pas l'alias. |
| **Copier le chemin du dépôt** | Copie le chemin absolu. |
| **Voir sur GitHub** | Origin s'il pointe vers github.com, sinon le premier distant GitHub analysable. Désactivé quand aucun ne peut être déduit. |
| **Ouvrir dans le terminal** | Ouvre le terminal de Gitcito avec ce dépôt comme répertoire de travail. |
| **Afficher dans le Finder / l’Explorateur de fichiers** | Met le dossier du dépôt en évidence dans le gestionnaire de fichiers de la plateforme. |
| **Ouvrir dans l’éditeur externe** | L'éditeur configuré dans les réglages. Visible mais désactivé tant qu'aucun n'est défini. |
| **Retirer…** | Ferme l'onglet ou enlève la pastille du groupe. Utilise le même avertissement de travail non validé que le bouton **×**. Cela ne supprime jamais de fichiers du disque. |

Un chemin manquant ou invalide laisse la copie, l'alias et le retrait
disponibles, et grise tout ce qui ouvrirait ou inspecterait le répertoire.

**Voir aussi :** [Espaces de travail, onglets et groupes](workspaces.md) · [Arbres de travail et sous-modules](worktrees.md) · [Éditeur externe](editor.md) · [Terminal intégré](terminal.md)
