---
title: Branches empilées
category: Branches et chirurgie
order: 43
summary: Des chaînes de branches dépendantes, avec un réempilement en cascade.
keywords: pile stack empilées stacked branches graphite restack réempiler dépendantes chaîne chain parent PR par niveau
---

# Branches empilées

Une pile est une chaîne de branches où chacune s'appuie sur celle du dessous :
`main → api → ui`. Relire trois petites pull requests vaut mieux que d'en relire
une énorme.

![Une pile de branches](../../screenshots/branch-stack.webp)

Gitcito affiche la pile de bas en haut avec le nombre de commits à chaque niveau,
et vous permet d'**ouvrir une pull request par niveau**, chacune visant son parent
plutôt que `main`.

## Réempiler

Quand une branche du bas change — vous avez traité les remarques de revue sur
`api` — toutes les branches au-dessus reposent désormais sur la mauvaise base.
**Réempiler** rebase la chaîne entière en cascade avec `rebase --onto`, pour
qu'une réécriture du parent ne duplique pas des commits dans ses enfants.

## Où vivent les liens

Les liens de parenté sont stockés dans la **configuration git** : ils voyagent
donc avec le dépôt et survivent à un reclonage. Rien ne vit dans un service
tiers.

**Voir aussi :** [Rebase interactif](rebase.md) · [Hébergement et pull requests](hosting.md)
