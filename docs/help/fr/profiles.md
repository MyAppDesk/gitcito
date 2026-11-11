---
title: Profils
category: Personnalisation
order: 101
summary: Des identités et des jetons distincts pour le travail et pour tout le reste.
keywords: profil profils profile profiles identité identity git user email jetons tokens comptes accounts changer switch
---

# Profils

Un profil regroupe une **identité Git** (nom et e-mail) avec ses **jetons
d'intégration**. Changez de profil et les deux changent ensemble — les commits
sont attribués correctement et les appels d'API utilisent le bon compte.

Utile quand la même machine sert aux dépôts professionnels et personnels, ou
quand vous avez deux comptes GitHub.

![Un profil : l'identité git d'un côté, ses jetons d'intégration de l'autre](../../screenshots/settings-profiles.webp)

## Chaque profil, ses propres comptes

En plus d'un jeton, un profil peut **lier** une connexion déjà présente sur la
machine — du credential helper de git ou de GitHub CLI — dans Réglages →
Intégrations. Un lien appartient à un seul profil : un nouveau profil commence
déconnecté, et un compte qu'un autre profil détient déjà est refusé, si bien que
deux profils peuvent tenir deux comptes GitHub (ou Azure DevOps) côte à côte.
Voir [Hébergement](hosting.md).

## Rattachement par dépôt

Un dépôt peut être **rattaché à un profil**, pour qu'une récupération en arrière-
plan s'authentifie toujours avec le bon compte — même pendant que vous regardez
un dépôt qui appartient à l'autre.

Les jetons vivent dans le [trousseau de votre système](security.md), jamais dans
le fichier de réglages.

**Voir aussi :** [Sécurité et secrets](security.md) · [Hébergement](hosting.md)
