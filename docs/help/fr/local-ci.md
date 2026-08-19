---
title: CI locale
category: Synchronisation et multi-dépôts
order: 58
summary: Exécuter les GitHub Actions du dépôt en local avec act — avant de pousser quoi que ce soit.
keywords: ci locale local ci act actions workflow runner docker pipeline tester test avant push before push nektos verdict badge notes per-commit par commit
---

# CI locale

La boucle push–attente–croix rouge–correction–push gaspille dix minutes par
aller-retour. Avec [act](https://nektosact.com), les mêmes workflows tournent
dans des conteneurs Docker sur votre machine, et Gitcito les pilote :
choisissez un workflow, appuyez sur Exécuter, regardez le même log que la CI
imprimerait — avant que quoi que ce soit ne quitte votre machine.

![CI locale](../../screenshots/local-ci.webp)

## Une intégration, pas un runtime embarqué

Gitcito ne fournit délibérément **ni** act **ni** Docker — une application qui
traîne un runtime de conteneurs avec elle est le contraire d'un client git.
C'est une intégration facultative : activez-la dans
**Réglages → Intégrations** (ou dans la boîte de dialogue elle-même), et
Gitcito détecte ce qui est installé et vous guide pour le reste —
`brew install act`, un démon Docker en marche, terminé. Rien ne s'exécute tant
que les trois conditions ne sont pas réunies : activée, act installé, Docker
joignable.

## Ce que ça fait

- Liste tous les workflows sous `.github/workflows`, par leur `name:`.
- **Exécuter** lance le workflow avec act contre votre **arbre de travail** —
  vos changements non commités inclus, et c'est exactement le but : tester
  avant de commiter, pas après avoir poussé.
- La sortie est diffusée en direct dans la boîte de dialogue ; **Arrêter** tue
  l'exécution. Un code de sortie 0 affiche **Réussi**, tout le reste **Échec**
  avec le code.

## Verdicts par commit sur le graphe

![Verdicts Local-CI sur le graphe](../../screenshots/local-ci-verdicts.webp)

Une exécution terminée épingle son résultat au commit qu'elle a testé : une
petite fiole marque la ligne en **vert ou rouge** dans le graphe, pour voir
d'un coup d'œil quels commits ont déjà survécu à la CI en local. Le verdict
est stocké comme une note git sous `refs/notes/gitcito-ci` — local à votre
machine, jamais poussé par défaut.

Règle d'honnêteté : le verdict n'est épinglé que si votre arbre de travail
était **propre**. Une exécution sur des changements non commités a testé
quelque chose qu'aucun commit ne contient : elle affiche donc son résultat
dans la boîte de dialogue mais ne marque rien.

## Limites

- act est une très bonne imitation des runners de GitHub, pas une imitation
  parfaite : les actions qui ont besoin de services hébergés par GitHub, de
  secrets ou d'images de runner exotiques peuvent se comporter différemment. Un
  vert local est un indice solide, pas une garantie.
- Une exécution à la fois par dépôt ; en démarrer une autre annule la première.
- Exécutions au niveau du workflow uniquement — choisir des jobs individuels,
  des matrices ou des événements relève d'act ; lancez-le dans le
  [Terminal intégré](terminal.md) quand il vous faut des options.
- La première exécution télécharge les images de runner — attendez-vous à ce
  qu'elle soit lente une fois.

**Voir aussi :** [Hébergement et pull requests](hosting.md) · [Terminal intégré](terminal.md)
