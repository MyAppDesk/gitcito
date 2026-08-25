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

Gitcito dessine la pile de haut en bas, jusqu’au tronc sur lequel elle atterrit.
Chaque niveau affiche ses propres commits, **ce que sa PR visera** — le niveau du
dessous, et le tronc pour celui du bas — et, une fois soumise, son numéro de PR
sous forme de pastille cliquable.

## En construire une

| Faites ceci | Et |
|-------------|-----|
| **Ajouter un niveau** | Crée une branche au-dessus de la feuille et s’y place. C’est `gh stack add`, avec un sélecteur au lieu d’un argument obligatoire. |
| **Ajouter au-dessus** sur un niveau | Pareil, mais au *milieu* de la pile : ce qui reposait sur ce niveau est redirigé vers la nouvelle branche, la chaîne garde son ordre et gagne un étage. Rien n’est rejoué — la nouvelle branche naît sur la pointe de son parent. |
| **Ajouter une branche existante** | Une branche que vous avez déjà rejoint la pile au-dessus de la feuille. Pratique quand vous avez commencé normalement et compris seulement après que c’était une pile. |

Tous les champs de branche sont en **saisie prédictive** : tapez pour filtrer,
↑/↓ et Entrée pour choisir, et ce que vous tapez hors liste compte aussi — une
référence distante comme `origin/main` fait donc une base valable.

## Réordonner

Les flèches **↑ / ↓** d’un niveau l’échangent avec son voisin. Ce n’est pas une
modification de métadonnées : la chaîne est re-liée puis rejouée, si bien que les
commits propres à chaque niveau atterrissent sur leur nouvelle base. Le
déplacement est annulable (<kbd>⌘Z</kbd>) — l’annulation rejoue l’ordre
précédent, elle ne ressuscite pas les anciens commits.

Comme un réordonnancement est une série de rebases, il peut **entrer en
conflit**, exactement comme un restack. Gitcito s’arrête au premier conflit et
vous passe la vue de résolution ; les niveaux du dessous sont déjà déplacés.

## Viser ailleurs

**Définir le parent** sur un niveau ouvre le même sélecteur : choisissez une
autre branche et le lien de ce niveau se déplace. La ligne **base**, en bas, fait
de même pour le tronc — changez-le et toute la pile est re-liée au nouveau tronc
puis rejouée.

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

## Où vivent les liens

Les liens de parenté sont stockés dans la **configuration git** : ils voyagent
donc avec le dépôt et survivent à un reclonage. Rien ne vit dans un service
tiers.

**Voir aussi :** [Rebase interactif](rebase.md) · [Hébergement et pull requests](hosting.md)
