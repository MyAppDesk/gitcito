---
title: Diff sémantique
category: Lire les changements
order: 21
summary: Ce qui a changé, symbole par symbole — renommages, changements de signature, déplacements.
keywords: diff sémantique semantic ast tree-sitter renommage rename signature déplacé moved symboles symbols ce qui a changé
---

# Diff sémantique

Un simple renommage apparaît dans un diff de lignes comme un fichier entier
supprimé et un fichier entier ajouté. C'est techniquement vrai et totalement
inutile.

Au-dessus de chaque diff de fichier, Gitcito affiche une bande **Ce qui a
changé** : les deux versions du fichier sont analysées avec **tree-sitter** — de
vrais arbres syntaxiques, pas des expressions régulières — et leurs déclarations
sont mises en correspondance.

![La bande « ce qui a changé » : renommages et changements de signature, symbole par symbole](../../screenshots/semantic-diff.webp)

| Verdict | Exemple |
|---|---|
| **Renommé** | `startServer` → `bootServer` |
| **Signature** | `open(path)` → `open(path, mode)` |
| **Ajouté** / **Supprimé** | une nouvelle fonction ; une fonction effacée |
| **Déplacé** | même code, 40 lignes plus bas |
| **Modifié** | même nom et même signature, corps différent |

Les renommages et les changements de signature sont triés en premier — c'est ce
qu'un relecteur ne doit pas manquer. Cliquez une ligne pour sauter à ce symbole
dans le diff.

## Ce qu'il sait analyser

TypeScript, TSX, JavaScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP,
Swift, Kotlin, Scala, Lua, Bash et Zig.

Un fichier dont le langage n'a pas de grammaire garde simplement son diff de
lignes habituel — la bande n'apparaît pas du tout. Idem pour les fichiers de plus
de 400 Ko.

## Limites assumées

- Un renommage dont le corps a aussi changé est signalé comme un renommage **et**
  le dit.
- Deux fonctions d'une ligne qui se ressemblent par hasard ne sont *pas*
  appariées : en dessous d'un seuil de taille, la correspondance doit être
  quasi exacte, si bien que vous obtenez un franc supprimé + ajouté plutôt qu'un
  renommage fictif.
- Les symboles qui ne dérivent que de quelques lignes parce que quelque chose
  au-dessus d'eux a grossi ne sont pas signalés comme « déplacés » — cela
  enterrerait les vrais déplacements.

**Voir aussi :** [Visionneuse de diff](diffs.md) · [Ce qui a changé depuis](range-diff.md)
