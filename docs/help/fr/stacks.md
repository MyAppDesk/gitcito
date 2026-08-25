---
title: Branches empilées
category: Branches et chirurgie
order: 43
summary: Des chaînes de branches dépendantes — réempilement en cascade et pull requests chaînées en un clic.
keywords: pile stack empilées stacked branches graphite restack réempiler dépendantes chaîne chain parent PR par niveau submit soumettre autopilot pilote automatique retarget recibler base
---

# Branches empilées

Une pile est une chaîne de branches où chacune s'appuie sur celle du dessous :
`main → api → ui`. Relire trois petites pull requests vaut mieux que d'en relire
une énorme.

![Une pile de branches](../../screenshots/branch-stack.webp)

Gitcito le dessine comme un **itinéraire** : une branche de départ en haut, puis
une étape par niveau. La PR de chaque étape vise l’étape au-dessus, et la première
atterrit sur la branche de départ. Une étape affiche ses propres commits, s’il lui
faut un restack, et son numéro de PR une fois soumise.

## Modifier l’itinéraire

**Rien ne s’exécute avant que vous appuyiez sur Appliquer.** Choisir une branche,
déplacer une étape, la retirer de l’itinéraire : tout cela modifie une liste à
l’écran. L’opération réelle rebase des branches et les extrait, ce qu’un clic
exploratoire ne devrait pas faire. Quand l’itinéraire se lit bien, **Appliquer
l’itinéraire** l’exécute en une seule étape annulable ; **Abandonner** remet le
dessin sur ce que dit le dépôt.

L’itinéraire est dessiné dans l’ordre de fusion : la branche du haut fusionne
dans celle du dessous, jusqu’à celle sur laquelle la pile atterrit.

| Contrôle | Ce qu’il fait |
|----------|---------------|
| Le champ **Départ** | Où la pile atterrit. Changez-le : toute la chaîne est re-liée à la nouvelle branche et rejouée. |
| Le champ d’une **étape** | Change quelle branche occupe cette position. La branche qui sort est simplement détachée, jamais supprimée. |
| **↑ / ↓** | Déplace une étape d’un cran. |
| **✕** | Retire l’étape de l’itinéraire ; ses voisines se rejoignent. |
| **Ajouter une étape** | Choisissez une branche existante et elle rejoint le sommet, ou tapez un nom qui n’existe pas encore : elle est créée sur la pointe de la dernière étape, et vous y êtes placé. |
| Le bouton flèche | Bascule sur cette étape. |

Tous les champs sont en saisie prédictive : tapez pour filtrer, ↑/↓ et Entrée pour
choisir, et ce que vous tapez hors liste compte aussi — une référence distante
comme `origin/main` fait donc une branche de départ valable.

Sous le capot, ces modifications sont la *même* opération : l’itinéraire entier,
rendu d’un coup. C’est pourquoi un geste vaut une seule annulation
(<kbd>⌘Z</kbd>) plutôt qu’une traînée de liens à moitié appliqués.

## Ce que coûte une modification

Tout ce qui change l’ordre — un échange, un déplacement, un autre départ —
**rejoue** la chaîne : les commits propres à chaque étape sont rebasés sur leur
nouvelle base. Deux étapes qui touchent les mêmes lignes ne peuvent pas
s’échanger sans un humain, et dans ce cas **il ne se passe rien** : la
modification entière est annulée — pointes, liens de parent et rebase à moitié
fait — et Gitcito nomme les deux étapes qui s’opposent. Un menu déroulant
effleuré ne devrait pas vous laisser en plein rebase.

**Restack** est l’autre moitié du marché : c’est un rebase que vous avez demandé
nommément, il s’arrête donc au conflit et vous passe la vue de résolution — qui
est aussi le moyen d’obtenir le réordonnancement refusé : résolvez là, puis
déplacez l’étape.

L’annulation rejoue l’itinéraire précédent. Elle ne ressuscite pas les anciens
commits : les nouveaux sont le même travail avec d’autres parents.

## Tout pousser

**Tout pousser** pousse chaque niveau avec `--force-with-lease` et s’arrête là —
`gh stack push`, sans rien ouvrir. **Soumettre la pile en PR** fait la même
poussée puis le travail de PR ; utilisez **Tout pousser** quand vous voulez les
branches sur le distant sans encore demander de revue.

## Soumettre la pile en pull requests chaînées

**Soumettre la pile en PR** fait en un clic ce que les outils d'empilement
font payer :

1. Pousse chaque niveau avec `--force-with-lease` (les branches fraîches le
   tolèrent, les branches réempilées en ont besoin).
2. Ouvre une pull request pour chaque niveau qui n'en a pas — chacune **basée
   sur sa branche parente**, pas sur `main`, pour que chaque revue ne montre
   que ses propres commits. Le titre et la description viennent des commits du
   niveau lui-même.
3. Recible toute pull request existante dont la base a dérivé.
4. Écrit une **section de navigation de la pile** dans le corps de chaque pull
   request, pour qu'un relecteur, à n'importe quel niveau, voie toute la chaîne
   et la place qu'y occupe cette PR.

L'action est **idempotente** : appuyez après chaque réempilement, nouveau
niveau ou pull request fusionnée et elle converge — rien n'est dupliqué, seul
ce qui a dérivé est touché.

Quand la pull request du bas a été **fusionnée**, le même bouton nettoie
derrière elle : l'enfant du niveau fusionné est rattaché au tronc, le niveau
est détaché, sa branche locale supprimée (sans danger — le tronc la contient
de façon prouvable), la chaîne réempilée et chaque pull request restante
reciblée. Fusionnez de bas en haut, appuyez sur Soumettre, recommencez.

## Réempiler

Quand une branche du bas change — vous avez traité les remarques de revue sur
`api` — toutes les branches au-dessus reposent désormais sur la mauvaise base.
**Réempiler** rebase la chaîne entière en cascade avec `rebase --onto`, pour
qu'une réécriture du parent ne duplique pas des commits dans ses enfants. Après
un réempilement, appuyez de nouveau sur **Soumettre** : les niveaux réécrits
sont poussés en force et les pull requests se mettent à jour sur place.

## Limites

- La soumission est pour l'instant **réservée à GitHub** (la création
  fonctionne sur les quatre hébergeurs, mais le reciblage et la mise à jour
  des corps demandent l'API GitHub).
- Le nettoyage après la fusion du bas voit les merges et les merges par
  rebase par l'ascendance, et les merges par **squash** en demandant à GitHub
  si la pull request de la branche a atterri — avec un jeton GitHub, tous les
  styles de merge sont donc nettoyés. Sur les autres hébergeurs, ou sans
  jeton, un niveau fusionné en squash doit encore être détaché à la main.
  Faites d'abord un fetch, aussi — la vérification d'ascendance lit le tronc
  tel qu'il était lors de votre dernier fetch.
- La section de pile dans le corps d'une PR est entretenue entre des marqueurs
  cachés — votre propre description au-dessus est préservée.
- Réordonner et changer de tronc **réécrivent l’historique** de chaque niveau
  touché. Les branches sont les vôtres et les niveaux non poussés ne coûtent
  rien, mais un niveau déjà en revue recevra un force-push à la prochaine
  soumission.
- Un niveau ne bouge que d’une place à la fois. Deux échanges font deux rebases,
  et s’arrêter à mi-chemin reste un état lisible ; un glisser-déposer qui
  atterrit trois places plus loin, non.
- Une étape est **rebasée** : la branche sur laquelle la pile atterrit n’est donc
  jamais aussi une étape, pas plus qu’une branche **protégée** (`main` et
  `master`, sauf si vous changez la liste). Les deux sont refusées plutôt que de
  réécrire en silence une histoire partagée.
- Avant d’ouvrir quoi que ce soit, la soumission demande au distant quelles
  branches sont bien arrivées et nomme celles qui manquent. GitHub répond à une
  head absente par un « Validation Failed » sec, qui ne sert personne.
  La branche sur laquelle la pile atterrit est vérifiée aussi : si elle n’existe
  qu’en local, la soumission propose de la pousser et de continuer.

## Où vivent les liens

Les liens de parenté sont stockés dans la **configuration git** : ils voyagent
donc avec le dépôt et survivent à un reclonage. Rien ne vit dans un service
tiers.

**Voir aussi :** [Rebase interactif](rebase.md) · [Hébergement et pull requests](hosting.md)
