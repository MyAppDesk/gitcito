---
title: Supprimer les fichiers non suivis
category: Travailler sur les changements
order: 35
summary: Une simulation de git clean — tous les chemins non suivis, avec leur taille, les fichiers ignorés à part et la corbeille comme destination par défaut.
keywords: clean git clean nettoyer non suivi untracked supprimer remove delete déchets junk sortie de build ignoré ignored gitignore dry run simulation corbeille trash node_modules dist ranger
---

# Supprimer les fichiers non suivis

Une copie de travail accumule des fichiers dont git n'a jamais pris de copie :
une note de brouillon, un `debug-output.txt`, un `dist/` issu d'un build raté, un
`node_modules` d'une branche que vous avez quittée le mois dernier. Git a une
commande pour cela — `git clean` — et c'est la seule opération git qui n'a **rien
derrière elle**. Le contenu n'a jamais été dans un commit : il n'y a donc pas
d'entrée de reflog, pas de remisage, pas d'annulation, et aucune incantation
`git` qui le ramène.

C'est pour cela que c'est l'opération que l'on lance dans un terminal et que l'on
regrette. La version de Gitcito montre la liste entière avant que quoi que ce
soit ne se produise.

`⌘K` → **Supprimer les fichiers non suivis**.

![Chemins non suivis et ignorés listés séparément, chacun avec sa taille, avant toute suppression](../../screenshots/clean.webp)

## Ce que dit la liste

Chaque entrée est un chemin que `git clean` pourrait atteindre, mesuré sur le
disque, réparti en deux groupes :

| Groupe | Ce que c'est | Sélectionné par défaut |
|-------|-----------|---------------------|
| **Non suivi** | Jamais validé, non filtré par `.gitignore` | Oui |
| **Ignoré** | Filtré par `.gitignore` — sortie de build, caches, `.env` | **Non** |

La séparation est tout l'enjeu. Les chemins ignorés sont généralement sans
valeur et, de temps en temps, l'unique copie de quelque chose qui compte : un
`.env` local, un dump de base de données, une fixture téléchargée. Rien de ce qui
correspond à `.gitignore` n'est jamais sélectionné à votre place.

Un **répertoire entièrement non suivi occupe une seule ligne**, pas une ligne par
fichier — `tmp/`, `dist/`, `node_modules/` — parce que c'est la granularité à
laquelle git les supprime, et parce qu'un listing de 40 000 fichiers est un
listing que personne ne lit. Sa taille est la somme de ce qu'il contient.

Un dossier marqué **dépôt à part entière** possède son propre `.git` : un clone
que vous avez déposé à l'intérieur de celui-ci, ou un essai jamais raccroché. Git
refuse de les supprimer (il exige `-ff`, une option que Gitcito ne propose pas) —
la corbeille, elle, les accepte.

## Corbeille ou suppression

**Mettre à la corbeille** est actif par défaut, et ne passe pas du tout par git :
les chemins vont dans la corbeille de votre système, d'où vous pouvez les
remettre. C'est la seule voie qui supprime un dépôt imbriqué, et la seule qui
survive à une case cochée par erreur.

La désactiver déclenche un véritable `git clean -f -d -x` sur exactement les
chemins sélectionnés, et vous demande de confirmer avec le nombre et la taille
totale sous les yeux. Rien ne se récupère de cela.

## Limites qu'il vaut mieux connaître

- **Uniquement les fichiers non suivis.** Un fichier suivi et modifié n'est pas
  ici — cela relève de l'[abandon](staging.md), qui le restaure depuis l'index ou
  depuis HEAD.
- **La liste est plafonnée** aux 400 premiers chemins. Si un dépôt en a
  davantage, supprimez ce qui est listé et appuyez sur **Réanalyser** pour le
  reste.
- **Les tailles de répertoire sont approximatives** sur les très grandes
  arborescences : l'analyse s'arrête après 20 000 fichiers, si bien qu'un
  `node_modules` géant peut paraître plus petit qu'il ne l'est. Il ne paraît
  jamais plus gros.
- **L'analyse est un instantané.** Si un build écrit des fichiers pendant que la
  boîte de dialogue est ouverte, appuyez sur **Réanalyser** avant de supprimer
  quoi que ce soit.
- Les chemins sont confrontés à la propre liste des fichiers supprimables de git
  avant que rien ne soit touché : rien de suivi ne peut donc être supprimé par
  cette boîte de dialogue, même en le nommant.

Voir aussi : [Indexation et abandon](staging.md) · [Ignorer des fichiers](hooks.md) ·
[Retirer un fichier de l'historique](history-purge.md)
