---
title: Git flow
category: Branches et chirurgie
order: 46
summary: Démarrer et terminer fonctionnalités, releases et correctifs urgents sans mémoriser quelle branche se fusionne où.
keywords: gitflow git flow feature fonctionnalité release hotfix correctif urgent develop main master préfixe prefix versiontag modèle de branches branching model start finish démarrer terminer étiquette tag
---

# Git flow

Le [modèle de branches git-flow](https://nvie.com/posts/a-successful-git-branching-model/)
tient en cinq règles et beaucoup de comptabilité. Les règles sont faciles ; c'est
la comptabilité que l'on rate à 18 h un jour de release — fusionner un correctif
urgent dans `main` en oubliant `develop`, ou étiqueter la mauvaise branche.

`⌘K` → **Git flow** fait la comptabilité.

![La boîte de dialogue git flow sur une branche de release : démarrer une branche en haut, la terminer en bas](../../screenshots/gitflow.webp)

## La disposition

| Branche | Contient |
|--------|-------|
| **Branche de production** (`main`) | Ce qui est en production. Chaque release y est étiquetée. |
| **Branche d'intégration** (`develop`) | Là où le travail terminé s'accumule entre deux releases. |
| `feature/*` | Une unité de travail, issue de develop. |
| `release/*` | Une version en cours de stabilisation, issue de develop. |
| `hotfix/*` | Un correctif urgent, issu de **main** — la production ne peut pas attendre develop. |

Gitcito lit et écrit les mêmes clés de configuration git `gitflow.*` que la CLI
`git flow` (`gitflow.branch.master`, `gitflow.prefix.feature`, …). Un dépôt sur
lequel quelqu'un a déjà lancé `git flow init` est reconnu immédiatement, et un
dépôt configuré ici fonctionne ensuite avec la CLI. Gitcito n'exécute que des
commandes git ordinaires — la CLI n'a pas besoin d'être installée.

**Configurer** écrit ces clés et, si la branche d'intégration n'existe pas
encore, la crée depuis la branche de production. Rien d'autre n'est touché. Vous
pouvez changer n'importe quel nom ou préfixe plus tard depuis **Modifier la
disposition**.

## Démarrer

Choisissez un type, tapez un nom, appuyez sur **Démarrer**. La boîte de dialogue
montre la branche qu'elle s'apprête à créer et la branche depuis laquelle elle
sera créée, avant que vous ne vous engagiez :

```
feature/search   from develop
hotfix/1.0.1     from main
```

Le nom est ce que vous tapez ; le préfixe vient de la disposition.

## Terminer

**Terminer** est la partie qui mérite d'être automatisée, parce qu'elle
représente plusieurs étapes qui doivent toutes avoir lieu :

| Type | Ce que fait Gitcito |
|------|-------------------|
| Fonctionnalité | Fusionne dans develop avec `--no-ff`, supprime la branche, vous laisse sur develop |
| Release | Fusionne dans main, l'étiquette, fusionne dans develop, supprime la branche, vous laisse sur develop |
| Correctif urgent | Fusionne dans main, l'étiquette, fusionne dans develop, supprime la branche, vous laisse sur **main** |

`--no-ff` est délibéré : c'est le commit de fusion qui rend la branche visible
dans le [graphe](graph.md) par la suite. Sans lui, une fonctionnalité courte
s'évanouit dans une ligne droite et le modèle perd ce pour quoi il existait.

L'étiquette est `<préfixe d'étiquette de version><nom>` — `release/1.1.0` devient
`v1.1.0` avec le préfixe par défaut. Décochez **Étiqueter la release** pour la
sauter, et écrivez un message d'étiquette si vous voulez plus que le contenu par
défaut.

### Ce qu'il refuse de faire

- **Une copie de travail sale l'arrête.** Faites un commit ou un
  [remisage](stashes.md) d'abord ; terminer fusionne deux branches et déplace
  HEAD deux fois, et faire cela autour de travail non validé est la meilleure
  façon de le perdre.
- **Une fusion en conflit annule tout.** Si la fusion dans main réussit mais que
  celle dans develop entre en conflit, vous resteriez sinon avec une release à
  moitié terminée. Gitcito remet chaque branche là où elle était et signale le
  conflit. Fusionnez cette branche manuellement, résolvez-la dans le [résolveur
  de conflits](conflicts.md), et le reste du flux est à vous de le terminer à la
  main.
- **Il ne pousse jamais.** Terminer est une opération locale. Poussez main,
  develop et la nouvelle étiquette quand vous êtes prêt — voir
  [synchronisation](syncing.md).

### Annulation

Un seul **Annuler** remet tout en place : les deux branches retournent à leurs
commits précédents, l'étiquette est supprimée, et la branche terminée est
recréée à son ancienne pointe. C'est toute la raison pour laquelle « terminer »
peut s'essayer sans crainte.

## Quand ne pas l'utiliser

Git flow convient aux logiciels avec des releases versionnées et une branche de
production maintenue. Si vous déployez depuis `main` plusieurs fois par jour, les
branches de release et de correctif urgent sont une cérémonie dont vous ne vous
servirez pas — les [branches empilées](stacks.md) ou de simples branches
éphémères issues de `main` conviennent mieux. La moitié « fonctionnalité » du
modèle, elle, fonctionne très bien toute seule.
