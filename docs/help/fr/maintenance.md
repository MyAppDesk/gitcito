---
title: Maintenance du dépôt
category: Dépôt et historique
order: 15
summary: Ce que le dépôt coûte sur le disque, quelle part en est récupérable, et ce que chaque tâche git ferait réellement.
keywords: maintenance gc garbage collect ramasse-miettes repack prune élaguer fsck count-objects objets libres loose packed empaquetés espace disque taille size optimiser optimise commit-graph git maintenance planification pendants dangling
---

# Maintenance du dépôt

Git ne vous dit jamais ce que coûte un dépôt. Il continue de fonctionner quel que
soit l'état de sa base d'objets, si bien que le premier signe d'ennui est
généralement un clone qui rampe ou un portable sans espace disque — bien après le
point où une seule commande aurait tout réglé.

Ce panneau est le relevé manquant : où l'espace est parti, quelle part en est
récupérable, et ce que chaque tâche fait avant que vous ne la lanciez.

`⌘K` → **Maintenance du dépôt**.

![L'usage disque réparti en empaqueté, libre et inatteignable, avec les tâches de maintenance en dessous](../../screenshots/maintenance.webp)

## Lire les chiffres

Tout provient de `git count-objects -v` et d'un véritable parcours
d'atteignabilité — rien n'est estimé.

| Ligne | Ce que c'est | Pourquoi ça grossit |
|-----|-----------|--------------|
| **Empaqueté** | Des objets à l'intérieur de packfiles, compressés et delta-encodés | C'est l'état sain |
| **Libre** | Un fichier par objet, à peine compressé | Chaque commit, chaque fetch en écrit |
| **Inatteignable** | Des objets vers lesquels plus rien ne pointe | Commits jetés, messages amendés, rebases abandonnés |

Le compteur à côté de **Libre** — *« n objets, m déjà empaquetés »* — est celui
qu'il faut surveiller. Ces `m` sont stockés deux fois : une fois libres, une fois
à l'intérieur d'un pack. C'est de la pure duplication, et `git gc` est ce qui
l'écrase.

**Inatteignable ne veut pas encore dire déchet.** Ces objets sont exactement ce
qui permet à `git reflog` de ramener un commit que vous avez réinitialisé. Git
les garde deux semaines volontairement.

## Les tâches

| Bouton | Exécute | Coût |
|--------|------|------|
| **Optimiser** | `git gc` | De quelques secondes à une minute. La bonne réponse presque toujours |
| **Réempaqueter de zéro** | `git gc --aggressive` | Des minutes sur un gros dépôt. Recalcule chaque delta |
| **Reconstruire le graphe de commits** | `git commit-graph write --reachable` | Rapide. Rend les parcours de log et de graphe nettement plus vifs |
| **Vérifier l'intégrité** | `git fsck --dangling` | Lent sur un gros dépôt, ne change rien |
| **Supprimer les inatteignables maintenant** | `git gc --prune=now` | Détruit le filet de sécurité du reflog |

**Optimiser** est celle vers laquelle se tourner. Elle empaquette les objets
libres, jette ce qui est inatteignable depuis plus de deux semaines, et laisse
l'histoire récente récupérable.

**Réempaqueter de zéro** est survendu. Cela jette chaque delta existant et
recalcule à partir de rien, ce qui prend des minutes et n'économise
habituellement que quelques pour cent par rapport à un gc ordinaire. Cela vaut la
peine une fois après avoir importé un historique énorme ; pas de façon
routinière.

**Supprimer les inatteignables maintenant** demande d'abord confirmation, et la
confirmation indique combien d'objets et combien d'espace. Après cela, un commit
que vous avez réinitialisé il y a une heure est irrécupérable — l'entrée de
reflog peut encore être listée, mais l'objet derrière elle a disparu.

## Vérifier l'intégrité

`git fsck` vérifie que chaque objet référencé par un autre objet est réellement
présent et cohérent en interne.

- **Les objets pendants sont normaux.** Ce sont les inatteignables, listés par
  nom. Un dépôt qui en compte des centaines après un rebase est en bonne santé.
- **Les objets manquants sont des dégâts** — une écriture tronquée, un disque
  défaillant, un transfert interrompu. S'il en apparaît, ne réempaquetez pas :
  réempaqueter une base endommagée peut transformer un problème récupérable en
  problème définitif. Clonez une copie saine depuis votre distant et transférez
  vos branches non poussées avec un [bundle](export.md).

## Maintenance en arrière-plan

La case à cocher enregistre le dépôt auprès de **`git maintenance`**, qui
empaquette et préfetche selon une planification exécutée par votre système
d'exploitation (launchd, systemd ou le Planificateur de tâches).

Rien ici n'est spécifique à Gitcito : la même planification sert votre terminal,
et `git maintenance unregister` la défait depuis n'importe où. Décocher la case
fait exactement cela, et laisse la planification en place pour les autres dépôts
qui y sont enregistrés.

## Limites qu'il vaut mieux connaître

- **Le compte des inatteignables exige un parcours d'atteignabilité complet** :
  ouvrir le panneau sur un très gros dépôt prend donc un moment. C'est le chiffre
  honnête, pas une estimation.
- **Les tailles sont ce que le disque rend**, pas la longueur du contenu. Un
  objet libre de 400 octets occupe quand même un bloc de 4 Ko, ce qui explique
  qu'un millier d'entre eux coûte des mégaoctets — et pourquoi les empaqueter
  vaut la peine.
- **Un arbre de travail ou un sous-module a son propre `.git`** : la taille
  affichée est donc celle de ce dépôt seul.
- **La maintenance ne peut pas réduire l'historique.** Si un blob de 400 Mo est
  dans un commit, il est atteignable, et gc le gardera pour toujours — cela
  relève de [retirer un fichier de l'historique](history-purge.md), une opération
  différente et bien plus perturbatrice.
- **Gitcito ne lance jamais gc dans votre dos.** Le `gc --auto` propre à git,
  lui, peut toujours le faire, comme il l'a toujours fait ; si l'un échoue il
  laisse une note dans `.git/gc.log`, que ce panneau fait remonter.

Voir aussi : [Retirer un fichier de l'historique](history-purge.md) ·
[Bundles et archives](export.md) · [Récupération](recovery.md)
