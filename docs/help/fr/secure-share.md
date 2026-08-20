---
title: Partage sécurisé
category: Sécurité
order: 72
summary: Déplacer des secrets, des notes ou un espace de travail entier entre machines — ou coéquipiers — en un seul fichier chiffré.
keywords: partage sécurisé secure share export exporter import importer bundle chiffré encrypted espace de travail workspace transfert machine équipe notes structure sans backend
---

# Partage sécurisé

Mettre en route une nouvelle machine — ou un nouveau coéquipier — veut
d'habitude dire tout ressaisir. Le partage sécurisé emballe tout dans un seul
fichier `.gitcito` chiffré à la place : les fonctions d'équipe de Gitcito n'ont
**aucun backend**, le fichier *est* donc le transport. Envoyez-le comme vous
envoyez déjà vos fichiers ; le mot de passe voyage séparément.

![Export des réglages d'un dépôt sous forme de bundle chiffré](../../screenshots/secure-share.webp)

![Le même export pour un espace de travail entier](../../screenshots/secure-workspace.webp)

## Ce qui peut y entrer

| Section | Contenu |
|---|---|
| **Coffre** | Les secrets du coffre global (les entrées de coffre par dépôt restent où elles sont) |
| **Fichiers du dépôt** | Fichiers de configuration et de secrets non suivis, rematérialisés aux mêmes chemins relatifs à l'import |
| **Structure de l'espace de travail** | La disposition des onglets elle-même — groupes, couleurs, ordre — avec les dépôts référencés par URL de distant, jamais par vos chemins locaux |
| **Notes de commit** | Le `refs/notes/commits` d'un dépôt, appliqué à l'import sans besoin d'accès en écriture à un quelconque distant |

Les secrets ne sont inclus que si vous **cochez la case**. Un bundle sans cette
case ne contient aucun identifiant. Les réglages de l'application ne voyagent
pas dans un bundle — ils ont leur propre export en JSON brut dans les Réglages.

## Importer

L'écran d'import montre ce qu'il y a dedans **avant** d'appliquer quoi que ce
soit, section par section, et les dépôts sont appariés à ce que vous possédez
déjà — d'abord par URL de distant, puis par dossier — de sorte qu'importer ne
reclone pas le monde entier.

Une section **structure de l'espace de travail** recrée l'espace de travail avec
les dépôts que vous possédez déjà ; ceux qui vous manquent sont listés avec leur
distant pour que vous puissiez les cloner d'abord puis réimporter — Gitcito ne
clone jamais à votre place ici. Une section **notes de commit** prévisualise ce
qui atterrirait — nouvelles, identiques, différentes, ou accrochées à des
commits que vous n'avez pas — et les notes différentes ne sont remplacées que si
vous cochez **écraser** ; il n'y a pas de fusion de notes divergentes.

**Voir aussi :** [Coffre](vault.md) · [Sécurité et secrets](security.md) ·
[Notes de commit](notes.md) ·
[Espaces de travail, onglets et groupes](workspaces.md)
