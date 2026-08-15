---
title: Radar de conflits
category: Branches et chirurgie
order: 44
summary: Voir quelles branches vont entrer en conflit avant d'en fusionner aucune.
keywords: radar de conflits conflict radar fusion merge aperçu preview collision risque risk branches merge-tree
---

# Radar de conflits

Découvrir qu'une branche entre en conflit en la fusionnant est une façon coûteuse
de poser une question. Le radar y répond d'abord.

Gitcito fusionne chaque branche dans une base de votre choix **à l'intérieur de
la base d'objets** (`git merge-tree --write-tree`). Aucune extraction, aucun
changement d'index, aucun changement de la copie de travail, rien à nettoyer
ensuite. Votre travail non validé peut rester exactement où il est pendant que le
balayage tourne.

![Le radar, un verdict par branche](../../screenshots/conflict-radar.webp)

![Balayage branche par branche, puis ouverture des fichiers disputés](../../screenshots/clip-conflict-radar.webp)

## S'en servir

Ouvrez-le depuis le menu Outils, par <kbd>⌘K</kbd> → *Radar de conflits*, ou par
clic droit sur une branche pour tout balayer contre **cette** branche.

Il balaye dès son ouverture, en prenant votre branche courante comme base.

| Verdict | Signification |
|---|---|
| **Va entrer en conflit** | La fusionner demandera des mains. Les chemins exacts sont listés. |
| **Fusionne proprement** | Elle s'appliquerait sans bagarre. |
| **Déjà incluse** | La base la contient déjà — rien à fusionner. |
| **Échec** | Git a refusé : histoires sans lien, référence manquante. La raison est affichée. |

Les branches sont triées de la pire à la meilleure, et la pire des pires — celle
qui touche le plus de fichiers — remonte en tête.

## Fichiers disputés

En dessous, **Fichiers disputés** classe les chemins selon le nombre de branches
qui les réécrivent. Deux branches qui se disputent un fichier, c'est une
conversation à avoir maintenant ; cinq, c'est un problème de conception.

## Après un balayage

Les lignes de branche dans la barre latérale portent un point coloré : rouge, ça
va entrer en conflit ; vert, c'est propre ; ambre, git a refusé la branche. Les
branches déjà contenues dans la base n'obtiennent pas de point — une rangée de
points gris sur tout ce qui est déjà fusionné n'est que du bruit.

> Balayer ne change rien. `git status` reste propre et HEAD ne bouge pas.

**Voir aussi :** [Ce qui a changé depuis](range-diff.md) · [Fusion et rebase](merging.md)
