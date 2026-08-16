---
title: Discussion du dépôt
category: IA
order: 82
summary: Posez des questions sur ce dépôt, avec les fichiers et les commits que vous épinglez comme contexte.
keywords: discussion chat question assistant contexte épingler joindre glisser déposer commit fichier preuve ancré ia panneau
---

# Discussion du dépôt

Certaines questions sont plus rapides à poser qu’à chercher. *Où se fait
réellement le rafraîchissement du jeton ? Qu’a changé ce commit, en une phrase ?
Pourquoi ce fichier existe-t-il ?* La discussion du dépôt répond sur le dépôt
ouvert et montre les lignes sur lesquelles elle s’est appuyée.

Elle partage la colonne de droite avec **Détails** : les onglets du haut passent
de l’un à l’autre, sans que le graphe perde sa sélection.

## Ce qu’elle lit

Chaque réponse se construit en deux passes. La première choisit un petit
ensemble de chemins et de recherches littérales dans la liste des fichiers
suivis du dépôt. La seconde répond en n’utilisant que les extraits rapportés, et
ne peut citer qu’eux : un fichier ou une ligne inventés sont une erreur de
validation, pas une réponse plausible.

| Inclus | Exclu |
|---|---|
| Les fichiers suivis, tels qu’ils sont dans votre copie de travail | Les fichiers non suivis |
| Les diffs indexés et non indexés des fichiers suivis | Tout ce qui correspond à une règle d’exclusion, même suivi |
| Branche, avance/retard et liste des chemins modifiés | [Fichiers ressemblant à des secrets](security.md), binaires, chemins générés |

Lire la copie de travail permet de parler de modifications non validées. Cela
signifie aussi qu’elles quittent votre machine : le fournisseur configuré dans
[Fonctions d’IA](ai.md) les reçoit.

## Épingler du contexte

Le modèle décide de ce qu’il lit. Épingler, c’est passer outre : ce qui est
épinglé est lu **en premier** et prend la plus grande part du budget de contexte.

Quatre façons d’épingler, toutes vers la même rangée de pastilles au-dessus du
champ de saisie :

| Faites ceci | Vous obtenez |
|---|---|
| Cliquez une pastille suggérée | Le fichier ouvert dans la visionneuse, ou le commit sélectionné dans le graphe |
| Glissez une ligne de l’onglet **Fichiers** | Ce fichier |
| Glissez une ligne du **graphe des commits** | Ce commit — son message et son diff par blocs |
| **+** → *Choisir un fichier…*, ou glissez depuis le Finder/l’Explorateur | N’importe quel fichier du disque, y compris hors du dépôt |

Les pastilles restent épinglées pour les questions suivantes ; le `×` en retire
une, et effacer la conversation les retire toutes. Huit au maximum.

Un commit épinglé apporte son message et jusqu’à douze blocs de diff. Les blocs
touchant un chemin exclu sont retirés de ce diff, pas le commit entier.

## Réglages

**Réglages → IA → Discussion du dépôt** :

| Réglage | Effet |
|---|---|
| **Poser des questions sur le dépôt** | Désactivé, l’onglet, le bouton et la cible du raccourci disparaissent. Le reste de l’IA continue |
| **Modèle de la discussion** | Un modèle réservé à la discussion. Vide : celui du profil — poser une question coûte moins qu’une relecture, un modèle plus petit suffit souvent |
| **Contenu validé uniquement** | Répond depuis le dernier commit plutôt que la copie de travail : les modifications non validées ne quittent jamais la machine |

Avec l’IA entièrement désactivée, la discussion disparaît avec elle : plus de
panneau proposant une réponse que rien ne peut produire.

Le modèle de la discussion se change aussi depuis l’en-tête du panneau, à côté
du nom du fournisseur : même réglage, sans ouvrir les Réglages.

## Ce qu’elle refuse

- **Les fichiers qui ressemblent à des secrets ne sont jamais lus**, épinglés ou
  non : la pastille revient marquée comme ignorée, avec la raison. Épingler ne
  contourne pas le [masquage des secrets](security.md).
- **Les binaires et les fichiers de plus de 512 Ko** venus de l’extérieur du
  dépôt sont ignorés de la même façon. À l’intérieur, les règles habituelles
  s’appliquent.
- **Elle n’écrit jamais.** Ni index, ni commit, ni changement de branche : aucun
  outil, seulement du texte. Une réponse qui prétend avoir agi décrit, elle ne
  rapporte pas.
- **Les conversations ne vivent qu’en mémoire.** Chaque dépôt garde son fil ;
  quitter Gitcito les efface.

## L’ouvrir

| Touches | Effet |
|---|---|
| Le bouton bulle dans la barre d’outils | Affiche ou masque l’onglet Discussion |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Affiche ou masque tout le panneau droit |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Entrée</kbd> | Envoie le message |

Voir [Clavier et raccourcis](keyboard.md) pour le reste, y compris comment
réassigner les bascules de panneau.

**Voir aussi :** [Fonctions d’IA](ai.md) · [Sécurité et secrets](security.md) ·
[Wiki du dépôt](repo-wiki.md)
