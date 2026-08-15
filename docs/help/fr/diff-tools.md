---
title: Outils de diff et de fusion externes
category: Branches et chirurgie
order: 43
summary: Confier un fichier à Kaleidoscope, Beyond Compare, Meld ou ce que vous utilisez déjà — Gitcito lit la propre liste d'outils de git.
keywords: difftool mergetool externe external diff fusion merge kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig sauvegarde backup
---

# Outils de diff et de fusion externes

La [visionneuse de diff](diffs.md) et le [résolveur à trois
panneaux](conflicts.md) de Gitcito suffisent la plupart des jours. Certains
jours, non : un fichier généré de 4 000 lignes, une fusion où il faut voir quatre
colonnes en même temps, ou tout simplement l'outil que vous utilisez depuis dix
ans et que vous lisez plus vite que n'importe quel autre.

**Réglages → Général → Outils de diff et de fusion externes.**

## C'est la liste de git, pas la nôtre

Gitcito ne tient aucune table à lui. Les listes déroulantes sont
`git difftool --tool-help` et `git mergetool --tool-help`, ce qui explique que :

- Les outils que git a déjà trouvés sur votre machine sont listés en premier ;
  ceux qu'il connaît mais ne trouve pas sont listés ensuite, marqués *non
  installé*.
- **Un outil personnalisé fonctionne sans support supplémentaire.** Si vous avez

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  alors `mine` apparaît dans la liste déroulante comme n'importe quel outil
  intégré.
- Vos choix sont écrits dans **`diff.tool` et `merge.tool` de votre configuration
  git globale** — les mêmes clés que lit votre terminal. Réglez-les ici et
  `git difftool` en ligne de commande se comporte de la même façon. Réglez-les
  là-bas et Gitcito les reprend.

Git connaît une trentaine d'outils d'origine, dont Kaleidoscope, Beyond Compare,
Meld, KDiff3, P4Merge, Araxis, DiffMerge, WinMerge, FileMerge, VS Code et la
famille vim.

## Où apparaissent les actions

| Surface | Action |
|---------|--------|
| Un fichier modifié dans le [compositeur de commit](committing.md) | **Diff dans \<outil\>** — copie de travail contre l'index |
| Le [résolveur de conflits](conflicts.md) | **Fusionner dans \<outil\>** — la fusion à trois points complète |

Les deux entrées n'apparaissent que si un outil est réellement configuré ; un
`git difftool` non configuré ne ferait qu'échouer, et un bouton inerte est pire
que pas de bouton du tout.

## Ce qui se passe pendant que l'outil est ouvert

Gitcito attend sa fermeture. C'est délibéré — `git mergetool` n'indexe le fichier
résolu qu'*après* la sortie de l'outil, si bien qu'il y a alors un vrai résultat à
rapporter — et c'est pourquoi le bouton affiche un indicateur d'activité plutôt
que de rendre la main immédiatement.

Le reste de l'application reste réactif : ces commandes s'exécutent en dehors du
verrou par dépôt qui sérialise les opérations git normales, si bien qu'un outil de
fusion laissé ouvert pendant le déjeuner ne gèle pas l'onglet derrière lui.

Quand une fusion externe réussit, git indexe le fichier lui-même et Gitcito ferme
le résolveur puis rafraîchit. Si vous fermez l'outil sans enregistrer, git le dit
et rien ne change.

## Le fichier `.orig`

`git mergetool` laisse par défaut une sauvegarde `<file>.orig` à côté du fichier
résolu — c'est le comportement de git, pas celui de Gitcito. La bascule dans les
réglages écrit `mergetool.keepBackup` ; désactivez-la et un fichier résolu ne
laisse plus rien derrière lui.

## Limites

- **Uniquement les diffs de la copie de travail.** L'entrée du compositeur
  compare ce que vous avez maintenant à l'index. Comparer deux commits
  historiques dans un outil externe n'est pas câblé — utilisez la [visionneuse de
  diff](diffs.md) intégrée ou la [comparaison](merging.md) pour cela.
- **Un fichier à la fois.** Il n'existe pas de balayage « diffe chaque fichier
  modifié ».
- **Gitcito n'installe jamais rien.** Un outil marqué *non installé* reste
  sélectionnable, parce que git pourra le trouver après que vous l'aurez installé
  — mais il échouera tant que ce n'est pas fait.
