---
title: Espaces de travail, onglets et groupes
category: Pour commencer
order: 3
summary: Beaucoup de dépôts sans se noyer : onglets, groupes, dossiers et espaces de travail.
keywords: espace de travail workspace onglets tabs groupes groups dossiers folders plusieurs dépôts multiple repos organiser switch basculer disposition layout
---

# Espaces de travail, onglets et groupes

Trois niveaux, du plus lâche au plus serré.

## Onglets

Un dépôt, un onglet. Utilisez <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> pour ouvrir le
sélecteur de nouvel onglet et <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> pour fermer
l'onglet actif. Vous pouvez aussi glisser pour réordonner, cliquer avec le bouton
du milieu pour fermer, ou appuyer sur <kbd>⌘⇧T</kbd> pour rouvrir le dernier
onglet fermé. Fermez le dernier onglet et <kbd>⌘W</kbd> ferme la fenêtre à la
place. Un point sur l'onglet signale du travail non validé ; un autre signale des
conflits.

Si un avertissement de fermeture apparaît, <kbd>Escape</kbd> annule toujours.
<kbd>Enter</kbd> ne confirme que si l'onglet est propre — en présence de
modifications non validées ou de conflits, l'avertissement vous oblige
délibérément à viser le bouton, pour qu'une frappe parasite après <kbd>⌘W</kbd> ne
puisse pas fermer du travail que vous teniez encore.

## Groupes

Rassemblez des dépôts liés dans un **onglet de groupe** nommé et coloré. À
l'intérieur d'un groupe, vous obtenez une seconde rangée avec une pastille par
dépôt, et le groupe lui-même peut faire **Tout récupérer** ou **Tout tirer** d'un
seul geste.

![Un onglet de groupe contenant plusieurs dépôts](../../screenshots/repo-groups.webp)

Les groupes peuvent contenir des **dossiers, imbriqués à n'importe quelle
profondeur** : clic droit sur le groupe → *Nouveau dossier…*, puis glissez les
dépôts sur une pastille de dossier. Chaque dossier prend une couleur, se replie
en une pastille comptée, agrège les points d'état de tout ce qu'il contient, et
peut récupérer ou tirer son sous-arbre entier.

![Des dossiers dans la barre d'onglets du groupe, chacun une pastille comptée — Internal imbriqué dans Services](../../screenshots/nested-folders.webp)

> Les dossiers ne font qu'organiser. En supprimer un remonte ses dépôts au parent
> — cela ne ferme jamais un dépôt.

## Espaces de travail

Un espace de travail est une **barre d'onglets entière, sauvegardée**. En changer
échange tous les onglets d'un coup : `Work` et `Personal` cessent de se marcher
dessus.

Le nom de l'espace de travail se trouve en haut à gauche, à côté de la marque
Gitcito. Cliquez dessus pour changer, créer, renommer, réordonner ou supprimer.
Juste à côté se trouve la jauge qui ouvre le [centre de
contrôle](mission-control.md) de l'espace de travail où vous êtes.

**Voir aussi :** [Centre de contrôle](mission-control.md) · [La ligne de commande](cli.md)
