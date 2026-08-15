---
title: Prévisualiser une pull request
category: Synchronisation et multi-dépôts
order: 57
summary: Exécuter la pull request de quelqu'un d'autre sur votre machine sans rien valider — sur n'importe quel hébergeur, y compris les PR venant de forks.
keywords: prévisualiser preview pull request merge request PR MR fork extraire localement check out tester essayer refs/pull refs/merge-requests pull-requests branche distante remote branch
---

# Prévisualiser une pull request

Relire un diff dans un navigateur vous dit si le code se lit bien. Cela ne vous
dit pas si l'application démarre encore. Pour le savoir, il faut exécuter la
branche — et c'est là que les gens se retrouvent coincés, parce qu'une pull
request issue d'un fork vit dans un dépôt que vous n'avez jamais cloné, souvent
un dépôt où vous ne pouvez pas pousser.

La prévisualisation locale règle cela grâce à un fait que presque personne n'a
besoin d'apprendre : les forges publient la tête de chaque pull request comme une
référence git ordinaire **sur le dépôt cible**. Le fork n'a pas besoin d'être
atteignable, vous n'avez pas besoin de jeton d'API, et aucun second distant n'est
ajouté. Un seul fetch, et le code est sur votre disque.

![Prévisualiser localement : choisir le distant, la pull request, et comment l'appliquer](../../screenshots/pr-preview.webp)

| Hébergeur | Où vit la tête de la PR |
|------|-------------------------|
| GitHub, GitHub Enterprise, Gitea, Forgejo, Gogs | `refs/pull/<n>/head` |
| GitLab (cloud et auto-hébergé) | `refs/merge-requests/<n>/head` |
| Bitbucket Cloud, Bitbucket Server | `refs/pull-requests/<n>/from` |
| Azure DevOps | `refs/pull/<n>/merge` |

Gitcito sonde les quatre en un seul `ls-remote` : une forge inconnue ou
auto-hébergée fonctionne donc du moment qu'elle suit l'une de ces conventions.

## L'ouvrir

- La liste des pull requests dans la barre latérale — le bouton flèche sur
  n'importe quelle entrée. Cela fonctionne pour tous les hébergeurs, contrairement
  à la vue de détail, qui est réservée à GitHub.
- La palette de commandes : **Prévisualiser la pull request localement**.
- À l'intérieur de la vue de détail d'une pull request, à côté du bouton
  « ouvrir dans le navigateur ».

## Ce que vous lui donnez

**Distant** — le dépôt *contre* lequel la pull request a été ouverte, normalement
`origin`. Pas le fork.

**Pull request** — le numéro, ou une URL de navigateur collée. `7`, `#7` et
`https://github.com/owner/repo/pull/7` fonctionnent tous ; les formes d'URL de
GitLab, Bitbucket et Azure DevOps aussi. Appuyez sur **Trouver** et Gitcito
indique la référence qu'il a résolue et le commit vers lequel elle pointe, avant
que quoi que ce soit ne soit récupéré.

**Branche distante** — le second onglet, pour les cas où il n'y a pas de
référence de PR à trouver : un hébergeur qui n'en publie pas, ou une branche que
vous voulez simplement essayer. Donnez le nom de la branche tel qu'il existe sur
le distant.

## Les deux façons de l'appliquer

Aucune des deux n'écrit de commit. C'est délibéré — une prévisualisation dont on
ne peut pas repartir n'est pas une prévisualisation.

| Mode | Ce qui se passe | Comment l'annuler |
|------|--------------|-----------------|
| **Une branche locale** | La référence est récupérée sur sa propre branche (`pr/7` par défaut) et extraite. Vos autres branches ne sont pas touchées. | L'annulation vous ramène à la branche où vous étiez et supprime la branche de prévisualisation. |
| **Une fusion que vous n'avez pas validée** | La référence est fusionnée dans la branche courante avec `--no-commit --no-ff`, laissant l'arborescence combinée indexée pour que vous puissiez la compiler et la tester. | L'annulation abandonne la fusion. |

Prévisualiser deux fois la même pull request réutilise la même branche, en la
déplaçant sur la nouvelle tête — pratique quand l'auteur pousse un correctif
pendant que vous testez. Quand cette branche existe déjà, Gitcito le dit et
demande confirmation avant de la réinitialiser, parce que tout commit qui ne
vivrait que là serait perdu.

## Ce qu'elle ne fera pas

- **Elle ne peut pas inventer une référence que l'hébergeur ne publie pas.**
  Certaines configurations auto-hébergées désactivent les références de PR ;
  certaines forges n'en ont jamais eu. Vous obtenez un franc « aucune référence
  pour #n » et l'onglet branche distante comme voie de passage.
- **Elle ne récupère pas les étiquettes.** Une prévisualisation ne doit pas
  traîner l'espace de noms d'étiquettes de quelqu'un d'autre dans votre dépôt.
- **Le mode fusion exige une copie de travail propre.** Git refuse de fusionner
  par-dessus du travail non validé ; [remisez](stashes.md) d'abord.
- **Une prévisualisation n'est pas une revue.** Elle met le code sur votre
  machine — elle n'approuve, ne commente ni ne fusionne rien. Cela relève de
  [l'hébergement et des pull requests](hosting.md).
- **Les forks privés restent privés.** La référence de PR est servie par le dépôt
  cible : l'accès suit donc vos identifiants pour *ce* distant — voir
  [sécurité](security.md).

## Faire le ménage

Une branche de prévisualisation est une branche ordinaire : supprimez-la depuis
la barre latérale quand vous avez fini, ou appuyez sur annuler juste après la
prévisualisation. Une fusion de prévisualisation laissée non validée peut être
abandonnée par annulation, ou résolue et validée si vous avez finalement décidé
que vous la vouliez — à ce moment-là, elle cesse d'être une prévisualisation et
devient [une fusion](merging.md).
