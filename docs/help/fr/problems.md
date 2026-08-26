---
title: Problèmes
category: Outils d’espace de travail
order: 92
summary: Ce que disent les analyseurs de votre projet, et ce que votre diff a causé.
keywords: problèmes analyseur diagnostics erreurs avertissements lint tsc typescript eslint dart analyze clippy cargo go vet ruff panneau fichiers modifiés
---

# Problèmes

Chaque projet embarque déjà un outil qui vous dit ce qui ne va pas — `tsc`,
`dart analyze`, ESLint, Clippy, `go vet`, Ruff. Ce qu’aucun ne vous dit, c’est si
c’est **votre** diff qui a introduit les quarante avertissements qu’il vient
d’afficher. Gitcito sait quels fichiers sont modifiés : la même liste répond à
cette question avec un seul interrupteur.

![Le panneau Problèmes et le compteur de la barre d’état](../../screenshots/problems.webp)

La barre d’état porte le compte — erreurs, avertissements, informations : les
trois chiffres que VS Code a appris à tout le monde. Un clic (ou **Problèmes**
dans la palette de commandes) ouvre le panneau en bas, groupé par fichier. Un
clic sur une ligne ouvre le fichier à cet endroit. Avant le premier balayage, il affiche des tirets plutôt que des zéros : personne n’a encore regardé, et trois zéros prétendraient le contraire.

## Ce qui est exécuté

| Si le dépôt contient | Gitcito exécute |
|----------------------|-----------------|
| `pubspec.yaml` | `dart analyze --format=machine` |
| `tsconfig.json` | `tsc --noEmit` |
| une configuration ESLint | `eslint -f json` |
| `Cargo.toml` | `cargo clippy --message-format=short` |
| `go.mod` | `go vet ./...` |
| `pyproject.toml` ou `ruff.toml` | `ruff check --output-format=json` |

**Flutter passe par la ligne Dart :** une application Flutter est un projet Dart,
et `flutter analyze` appelle le même analyseur que `dart analyze`.

**Le projet n’a pas à être à la racine.** Ces marqueurs sont aussi cherchés
quelques niveaux plus bas : une application Flutter dans `mobile/` ou un paquet
dans `apps/web` est trouvé, et chaque analyseur s’exécute dans le répertoire de
son propre projet. Un projet imbriqué du même type est ignoré quand un ancêtre le
couvre déjà — c’est exactement ce que dit un `tsconfig.json` racine — et un
balayage s’arrête à douze projets, parce qu’un monorepo ne doit pas lancer
cinquante compilateurs.

Un binaire dans `node_modules/.bin` l’emporte sur celui du PATH, exactement comme
le résolvent les scripts du projet. Tout tourne en parallèle, et la sortie de
chaque outil est ramenée à une seule forme, dédupliquée et triée : deux
analyseurs signalant la même ligne donnent une seule entrée.

**Rien ne se lance tout seul.** `tsc --noEmit` sur un gros dépôt, ce sont des
dizaines de secondes, et ces commandes sont la chaîne d’outils du dépôt, pas
celle de Gitcito. Elles démarrent quand vous ouvrez le panneau ou appuyez sur
actualiser, jamais d’elles-mêmes. C’est aussi pourquoi la liste est un
instantané : modifiez un fichier et elle est périmée jusqu’à la relance.

**Réglages → Général → Analyseurs de code** décide de son empressement :
balayer à l’ouverture du panneau (par défaut), uniquement sur actualiser, ou
désactivé — ce qui masque entièrement la moitié analyseurs, son compteur dans la
barre d’état et sa commande.

**La sortie générée est écartée.** Un outil pointé sur la racine du projet
analyse tout ce qu’il trouve, et cela inclut `.next/build/chunks`, un `dist`
bundlé, une copie vendorisée — des centaines de plaintes sur du code écrit par
une machine, qui enterrent la poignée qui parle du vôtre. Gitcito demande à git
quels fichiers sont ignorés et les écarte, sans jamais écarter un fichier
*suivi* : committer la sortie générée est un choix, et `git check-ignore` le
respecte. `node_modules` part de toute façon.

## Seulement ce que vous avez changé

L’interrupteur de l’en-tête écarte tout problème situé dans un fichier que vous
n’avez pas touché. C’est la vue qui mérite de rester ouverte : une liste plate de
tous les avertissements d’une base de code devient du papier peint en une
semaine, alors que « est-ce ce diff qui les a ajoutés » est une question à
trancher avant de commiter.

Les pastilles de sévérité filtrent aussi. Éteintes, elles signifient *tout
montrer* ; en allumer une restreint à cette sévérité.

## Les limites

- **Pas de serveur de langage.** C’est un balayage, pas un démon : pas de
  soulignements pendant la frappe, pas de résultats avant de les demander.
- **Un outil absent est nommé, pas caché.** Le pied de page dit ce qui n’a pas pu
  s’exécuter, parce qu’une liste vide sans explication est pire qu’une liste
  courte avec une raison.
- **Seule la sortie lisible par machine est comprise.** Chaque analyseur est lu
  depuis son format machine documenté ; un outil configuré pour afficher autre
  chose est invisible ici.
- **Cinq mille problèmes, c’est le plafond.** Au-delà, le panneau le dit et
  s’arrête — un dépôt dans cet état a un problème plus grave qu’une barre de
  défilement.

**Voir aussi :** [CI locale](local-ci.md) · [Terminal intégré](terminal.md)
