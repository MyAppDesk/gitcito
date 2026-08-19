---
title: Radar d'équipe
category: Branches et chirurgie
order: 45
summary: Qui a bougé quoi en amont — et si cela atterrit sur votre travail non validé.
keywords: radar d'équipe teammate radar activité distante remote activity amont upstream chevauchement overlap fichiers modifiés dirty files collision qui a touché who touched conflit conflict fetch
---

# Radar d'équipe

Vous êtes en train d'éditer `api.ts`. Quelqu'un d'autre aussi, sur une branche
que vous n'avez jamais regardée. La façon habituelle de l'apprendre est un
conflit de fusion la semaine prochaine ; celle du radar est une liste,
aujourd'hui.

Tout est calculé à partir de votre **dernier fetch** — les refs de suivi
distant, un `merge-tree` en mémoire, rien d'autre. Pas de serveur, pas d'agent
sur les machines de vos coéquipiers, pas de réseau au-delà du fetch que vous
faisiez de toute façon.

![Radar d'équipe](../../screenshots/teammate-radar.webp)

## Ce qu'une ligne vous dit

Pour chaque branche distante qui a des commits que votre `HEAD` n'a pas :

| Colonne | Signification |
|--------|---------|
| Qui et quand | Le dernier committeur sur cette branche, et il y a combien de temps |
| Commits / fichiers | Combien arrive, et combien de fichiers cela touche |
| **Chevauchement** | Lesquels de ces fichiers sont **modifiés dans votre copie de travail en ce moment même** — la pastille rouge |
| Risque | Si fusionner cette branche dans `HEAD` entrerait en conflit (le même moteur que le [radar de conflits](conflict-radar.md)) |

Les lignes sont triées selon leur degré de collision avec vous : le
chevauchement d'abord, puis les conflits prédits, puis la fraîcheur. Dépliez
une ligne pour les listes exactes de fichiers ; **Comparer** ouvre la
comparaison de branches complète.

## Quand il se manifeste

Après chaque fetch — manuel ou automatique — le radar balaye en silence. Il
n'affiche une notification que lorsque des commits en amont touchent des
fichiers que vous avez modifiés **et** que cet ensemble a réellement changé
depuis le dernier balayage. Pas de fichiers modifiés, pas de bruit : une copie
de travail propre ne peut entrer en collision avec rien.

## Limites

- Il voit ce que le dernier fetch a vu. Un coéquipier qui n'a pas poussé est
  invisible — ceci lit des refs, pas les pensées.
- Le chevauchement se mesure au niveau du chemin, pas de la ligne : toucher le
  même fichier est une alerte, pas la preuve d'un conflit. La colonne
  **Risque** est la réponse au niveau de la ligne, mais seulement entre états
  déjà validés.
- Les branches inactives depuis plus de ~45 jours sont ignorées, et seules les
  30 les plus récemment bougées sont balayées.

**Voir aussi :** [Radar de conflits](conflict-radar.md) · [Récupérer, tirer et pousser](syncing.md) · [Ce qui a changé depuis](range-diff.md)
