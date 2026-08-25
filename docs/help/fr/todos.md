---
title: Tâches
category: Outils de l'espace de travail
order: 97
summary: Une liste privée par dépôt, visible depuis les onglets et la barre d'état.
keywords: todo tâche tâches liste checklist case note notes rappel pense-bête priorité
---

# Tâches

La moitié des notes qu'on écrit tient sur une ligne et vit une après-midi :
*renommer cette variable avant la PR*, *le chemin de la fixture est faux*,
*demander la limite de réessais*. Un gestionnaire de tickets est trop lourd pour
ça, un fichier de brouillon finit committé par accident, et un post-it
disparaît dès qu'on change de dépôt.

Les tâches sont cette liste, attachée au dépôt où vous vous trouvez.

![La liste des tâches avec une tâche ouverte, ses notes et sa priorité](../../screenshots/todos.webp)

## Où elles vivent

Nulle part dans votre dépôt. Une tâche est rangée avec les réglages de Gitcito,
indexée par le chemin du dépôt, ce qui a trois conséquences utiles à connaître :

- **Rien n'est committé.** Aucun fichier n'apparaît dans `git status` : une
  tâche ne peut donc jamais se glisser dans un commit ou un diff.
- **Personne d'autre ne la voit.** C'est une note pour vous, pas un backlog
  partagé. Si une tâche appartient à l'équipe, sa place est un ticket.
- **Elle suit le dossier, pas la branche.** Ouvrez le même clone dans deux
  onglets : une seule liste. Clonez le projet ailleurs sur le disque : une
  deuxième liste, séparée.

La branche sur laquelle vous étiez au moment de l'écrire est conservée comme
*contexte* et affichée dans le détail. C'est un rappel de l'endroit où vous
étiez, pas un filtre : les tâches ne disparaissent pas quand vous changez de
branche.

## En écrire une

Ouvrez la liste — le bouton ↗ dans l'en-tête de la section **Tâches**, la pastille
de la barre d'état, ou **Tâches** dans la palette de commandes —, écrivez la
ligne et appuyez sur <kbd>Entrée</kbd>. La section de la barre latérale reste une
liste qu'on lit et qu'on coche ; l'écriture se fait à un seul endroit.

Le tri est fait pour vous : d'abord ce qui est ouvert — priorité haute au-dessus
de la normale, elle-même au-dessus de la basse — et, à priorité égale, le plus
ancien d'abord, parce que ce qui est ignoré depuis le plus longtemps est ce qui
mérite d'être vu. Les tâches terminées descendent, la dernière cochée en tête,
pour qu'annuler une erreur de clic reste immédiat.

## Les voir sans les chercher

![L'anneau sur l'onglet, la section de la barre latérale et la pastille de la barre d'état, dans une même fenêtre](../../screenshots/todos-markers.webp)

| Repère | Où | Ce que ça veut dire |
|---|---|---|
| Anneau creux | À côté du nom de l'onglet, près du point gris des modifications non committées | Ce dépôt a des tâches en cours |
| Pastille <kbd>☑ 3</kbd> | Barre d'état, à gauche de la branche | Combien sont en cours ; jaune si l'une est en priorité haute |
| Compteur | L'en-tête de section dans la barre latérale | Le même nombre, à côté de la liste |

Les trois disparaissent à zéro. Un « 0 tâche » permanent est du mobilier, et le
mobilier est exactement ce qu'on cesse de voir.

## Le détail

Cliquez sur une tâche — dans la barre latérale, sur la pastille de la barre
d'état, ou via **Tâches** dans la palette de commandes — pour ouvrir la liste
complète et son panneau de détail.

| Champ | À quoi il sert |
|---|---|
| **Titre** | La ligne. Modifiable sur place ; pas de bouton d'enregistrement. |
| **Notes** | Tout ce que le titre ne pouvait pas contenir : pourquoi c'est important, quels fichiers, ce que « terminé » veut dire. |
| **Priorité** | Basse, normale ou haute. Commande le tri et la couleur de la pastille. |
| **Créée / Terminée** | Quand vous l'avez écrite, et quand vous l'avez cochée. |
| **Notée sur** | La branche qui était active à ce moment-là. |

La même vue porte le champ de filtre, l'interrupteur **Afficher les tâches
terminées** et **Effacer les terminées**, qui supprime définitivement les tâches
cochées, après confirmation.

## Ce qu'elles ne font délibérément pas

- **Ni échéances, ni rappels, ni notifications.** Une liste de tâches qui
  harcèle est un agenda ; celle-ci attend que vous la regardiez.
- **Ni synchronisation, ni partage.** Elle ne quitte pas votre machine et ne
  fait pas partie de l'export d'un espace de travail.
- **Aucun lien vers des tickets ou des commits.** Si une note mérite autant de
  structure, elle a dépassé cette liste : ouvrez un [ticket](hosting.md).
- **La suppression est définitive.** Aucune entrée d'annulation pour une tâche
  supprimée : git ne l'avait jamais enregistrée.

**Voir aussi :** [Réglages par dépôt](repo-settings.md) ·
[Centre de contrôle](mission-control.md)
