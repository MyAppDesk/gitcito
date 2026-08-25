---
title: Hébergement et pull requests
category: Synchronisation et multi-dépôts
order: 56
summary: Créer des pull requests partout ; les relire et les fusionner sur GitHub et GitLab.
keywords: pull request PR merge request GitHub GitLab Bitbucket Azure DevOps revue review approuver approve fusionner merge tickets issues
---

# Hébergement et pull requests

## Créer

Créez une pull request (ou merge request) sans quitter l'application : listes
déroulantes de branches, titre et corps préremplis depuis les commits de la
branche, une bascule brouillon, et — sur GitHub — relecteurs, étiquettes et
assignés appliqués à la création.

![Création d'une pull request](../../screenshots/create-pr.webp)

Fonctionne sur **GitHub, GitLab, Bitbucket et Azure DevOps**. Les PR/MR ouvertes
des quatre sont listées dans la barre latérale.

Démarrez-en une depuis la comparaison de branches, depuis le graphe, depuis le
`+` du panneau PR, ou depuis un ticket (ce qui remplit `Closes #N`).

## Les piles dans la liste

Les pull requests posées les unes sur les autres se replient en une seule ligne
avec une icône de pile, la branche sur laquelle la chaîne atterrit et leur
nombre. Dépliez-la pour voir la chaîne dans l’ordre de lecture — de la feuille
vers la base — au lieu de quatre lignes à recomposer à partir de leurs bases.

Deux choses forment ce groupe : le numéro de pile de GitHub, quand les PR
appartiennent à une [pile native](stacks.md), et sinon les refs elles-mêmes —
une pull request dont la base est la tête d’une autre repose sur elle. Cette
seconde règle est ce qui fait que cela marche aussi sur GitLab, Bitbucket et
Azure DevOps, et pour des chaînes ouvertes avant tout cela.

## Relire — GitHub et GitLab

| | |
|---|---|
| **Conversation** | Commentaires et état de la revue |
| **Vérifications** | Les exécutions de CI (GitHub) ou les jobs de pipeline (GitLab) avec succès/échec/en attente et des liens vers les journaux |
| **Fichiers vus** | Une liste à cocher ✓ par fichier, avec progression |
| **Fils en ligne** | Commentaires de ligne groupés par `file:line`, et les réponses |
| **Actions** | Commenter, approuver, demander des changements, et merge / squash |

Si quelqu'un pousse en force en pleine revue, [ce qui a changé
depuis](range-diff.md) vous montre exactement ce qui a bougé.

Les différences GitLab, dites clairement : GitLab n'a pas d'appel unique
« envoyer la revue », donc **approuver** utilise son point d'accès
d'approbation et **demander des changements** retire votre approbation et
publie votre commentaire. Le **rebase-merge** n'est pas proposé — GitLab
choisit entre merge-commit et fast-forward selon les réglages du projet, le
menu de merge n'affiche donc que merge et squash. Les fils en ligne montrent le
fichier et la ligne, mais pas la section de diff environnante, que l'API de
GitLab ne renvoie pas. La revue et la fusion fonctionnent pour les projets sur
**gitlab.com** ; les instances auto-hébergées ne sont pas encore prises en
charge. Bitbucket et Azure DevOps s'ouvrent toujours dans le navigateur pour la
revue.

## Tickets, jalons, releases — GitHub

Parcourez les tickets et ouvrez un onglet de ticket complet : corps,
commentaires, étiquettes, assignés, jalon, champs Projects v2, fermeture et
réouverture, et **créer une branche pour ce ticket** (avec nommage par l'IA). Les
jalons affichent leur progression et leurs tickets. Les releases se parcourent
avec une page de changelog.

## Notifications — GitHub

Toute votre boîte de réception — demandes de revue, mentions, activité de CI —
tous dépôts confondus, avec des filtres non lues/toutes et le marquage comme lu.
La cloche de la barre d'outils porte un badge de non-lues, et des notifications
système optionnelles se déclenchent quand une revue est demandée ou quand la CI
se termine.

## Jetons

Des jetons par profil pour plusieurs comptes ou organisations, stockés dans le
trousseau de votre système. Gitcito peut aussi emprunter ce que votre
**assistant d'identifiants git** détient déjà : une organisation pour laquelle
vous vous êtes déjà authentifié ne demande souvent aucune configuration. Voir
[Sécurité et secrets](security.md).

**Voir aussi :** [Branches empilées](stacks.md) · [Fonctions IA](ai.md)
