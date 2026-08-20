---
title: Notes de commit
category: Lire l'historique
order: 26
summary: Attacher du texte à un commit déjà poussé — sans modifier le commit.
keywords: notes git notes annoter annotate commentaire comment commit refs/notes revue review ticket amend réécriture rewrite push notes fetch notes
---

# Notes de commit

Un message de commit s'écrit une fois puis se fige : le changer réécrit le
commit, lui donne un nouveau hash, et casse tous ceux qui possèdent déjà
l'ancien. C'est acceptable une heure après le commit et impossible une semaine
plus tard.

`git notes` est la porte de sortie. Une note est stockée **à côté** du commit,
sous `refs/notes/commits`, et en attacher une laisse le commit identique octet
pour octet. Cela fonctionne donc sur de l'histoire déjà publiée — c'est-à-dire
précisément au moment où vous avez le plus envie d'ajouter quelque chose.

Usages typiques : la revue qui l'a approuvé, le ticket qu'il a clos, pourquoi il
a été annulé, dans quelle version il est parti.

## En écrire une

Sélectionnez un commit. Sous le message se trouve une section **Note** :
*Ajouter une note*, tapez, **Enregistrer la note**. Le multiligne est accepté.

![Rédaction d'une note sous le message d'un commit poussé, puis enregistrement](../../screenshots/clip-commit-note.webp)

Enregistrer une note est une action Gitcito ordinaire — elle affiche une
notification, et **Annuler** remet le texte précédent, y compris en restaurant
une note que vous aviez retirée.

Effacer le texte puis enregistrer supprime la note ; la note vide n'existe pas.

## En trouver une

Les notes sont invisibles dans un log normal, ce qui est la principale raison
pour laquelle personne ne les découvre jamais. Gitcito marque un commit qui en
porte une avec une petite icône de note dans la colonne des messages du graphe :
l'annotation est donc trouvable sans savoir qu'elle est là.

En ligne de commande, `git log --notes` les imprime sous chaque message.

## Les partager

**C'est la partie qui surprend tout le monde : un `git push` normal ne pousse pas
les notes, et un `git fetch` normal ne les récupère pas.** Elles vivent en dehors
de `refs/heads` et de `refs/tags`, et les refspecs par défaut les ignorent
entièrement. Les notes écrites sur votre portable restent sur votre portable
jusqu'à ce que quelqu'un les déplace explicitement.

Outils → **Note** → *Pousser les notes* / *Récupérer les notes*, par distant.
Elles exécutent :

```sh
git push <remote> refs/notes/commits
git fetch <remote> +refs/notes/commits:refs/notes/commits
```

Seule la référence des notes de commit voyage — les références locales à la
machine propres à Gitcito (comme les verdicts de la [CI locale](local-ci.md))
ne sont délibérément pas publiées.

Certains hébergeurs exigent en plus que les notes soient activées ou autorisées
de leur côté ; un refus à cet endroit relève de la politique de l'hébergeur, pas
d'une limite de Gitcito.

Pas de distant partagé, ou pas d'accès en écriture ? Le
[Partage sécurisé](secure-share.md) peut emballer les notes d'un dépôt dans un
fichier chiffré qu'un coéquipier importe directement, avec un aperçu de ce qui
atterrirait et un choix d'écrasement explicite pour les notes divergentes.

## Limites

- **Une seule référence de notes.** Gitcito lit et écrit la référence par défaut
  `refs/notes/commits`. Les espaces de noms personnalisés
  (`git notes --ref=review`) ne sont pas exposés — un dépôt qui les utilise ne
  verra pas ces notes ici.
- **Aucune fusion de notes divergentes.** Si deux personnes annotent le même
  commit et poussent toutes les deux, git refuse le second push. Résoudre cela
  demande `git notes merge` dans le [terminal](terminal.md).
- **Les notes ne sont sauvegardées ni par une sauvegarde de purge** ni par les
  [instantanés](recovery.md). Ce sont des références ordinaires, qui survivent
  aux opérations normales, mais un dépôt recloné de zéro démarre sans elles.

Voir aussi : [Commits](committing.md) · [Le graphe des commits](graph.md)
