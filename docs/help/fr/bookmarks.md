---
title: Signets
category: Outils d’espace de travail
order: 94
summary: Des endroits du code dont on se souvient, et qui survivent aux modifications du fichier.
keywords: signet signets marquer ligne note endroit code navigation barre latérale déplacé perdu extrait
---

# Signets

Un endroit où vous voulez revenir : la ligne où vit le bug, la fonction que vous
êtes en train de renommer, la chose à supprimer une fois le refactor arrivé.
Clic droit sur une ligne dans la visionneuse, puis **Marquer cette ligne** : elle
apparaît dans la barre latérale, et un clic vous y ramène.

![Signets dans la barre latérale](../../screenshots/bookmarks.webp)

Les signets sont privés à cette machine et à ce dépôt. Rien n’est écrit dans le
dépôt : ni committé, ni poussé, ni visible par qui que ce soit d’autre — comme
les [todos](todos.md).

## La ligne bouge. C’est tout le problème.

`cart.ts:42` pourrit dès que quelqu’un insère une ligne au-dessus, et un signet
qui ouvre silencieusement la mauvaise ligne est pire que pas de signet. Le
**texte** de la ligne est donc stocké à côté de son numéro, et l’ouverture
relocalise :

1. la ligne mémorisée, si elle porte encore ce texte ;
2. sinon la ligne la plus proche avec le même texte — la plus proche, pour qu’une
   ligne répétée dans tout le fichier tombe sur la copie la plus proche de son
   ancienne place ;
3. sinon la ligne la plus proche qui correspond en ignorant les espaces, ce qui
   survit à une réindentation ;
4. sinon il dit que **la ligne a disparu** et ouvre là où elle était, au lieu de
   deviner.

Quand elle bouge, le signet se soigne : le nouveau numéro est enregistré, et
l’ouverture suivante part de là. Une **note** s’ajoute depuis le menu contextuel
— sans elle, le texte de la ligne fait office d’étiquette.

## Les limites

- **Un signet pointe sur la copie de travail**, pas sur un commit. Il suit vos
  modifications ; il ne remonte pas l’historique.
- **Un fichier réécrit perd ses signets.** Si ni le texte exact ni sa forme sans
  espaces ne se trouvent à quelques centaines de lignes à la ronde, il ne reste
  rien d’honnête à désigner.
- **Renommer un fichier casse ses signets.** Le chemin est la clé ; git repère un
  renommage dans un diff, mais un signet ne fait pas partie d’un diff.
- **Une ligne vide n’a aucun texte à retrouver** : son signet ne tient qu’au
  numéro.

**Voir aussi :** [Todos](todos.md) · [Problèmes](problems.md)
