---
title: Clonage
category: Pour commencer
order: 2
summary: Cloner depuis une URL ou directement depuis votre hébergeur — et réduire ce qui descend quand le dépôt est énorme.
keywords: clone cloner clonage shallow superficiel depth profondeur partial partiel filter blob none single branch une seule branche submodules sous-modules recursive ls-remote sélecteur de branche unshallow monorepo
---

# Clonage

**Nouveau dépôt → Cloner**, ou `⌘K` → *Cloner*. Collez une URL, ou connectez-vous
à GitHub, GitLab, Bitbucket ou Azure DevOps et choisissez parmi vos propres
dépôts — le jeton du [profil](profiles.md) sélectionné sert au clonage puis est
abandonné, jamais écrit dans `.git/config`.

Choisissez un dossier parent et un nom ; la ligne sous les champs indique
exactement où le dépôt va atterrir. Un dossier qui existe déjà est refusé plutôt
que fusionné.

## Avancé — restreindre le clone

Tout ce qui se trouve sous **Avancé** est désactivé par défaut : n'y touchez pas
et vous obtenez un clone ordinaire et complet. Ces options justifient leur
présence sur les dépôts où « complet » veut dire vingt minutes et plusieurs
gigaoctets.

![La boîte de dialogue de clonage avec Avancé ouvert : partiel, superficiel, une seule branche, sous-modules et un sélecteur de branche](../../screenshots/clone-advanced.webp)

| Option | Ce que fait git | Ce que ça coûte |
|--------|---------------|---------------|
| **Clone partiel** | `--filter=blob:none` | Historique complet, sans le contenu des fichiers. Les blobs arrivent à la demande : ouvrir un vieux fichier exige donc le réseau. |
| **Clone superficiel** | `--depth=N` | Seuls les N commits les plus récents existent. Blame, log, bisect et range-diff s'arrêtent à la coupure. |
| **Une seule branche** | `--single-branch` | Les autres branches restent sur le distant jusqu'à ce que vous les récupériez. |
| **Cloner les sous-modules** | `--recurse-submodules` | Chaque sous-module est extrait lui aussi — plus de temps maintenant, pas de répertoire manquant plus tard. |
| **Branche à extraire** | `--branch <name>` | Démarre sur cette branche plutôt que sur la branche par défaut du distant. |

**Partiel avant superficiel.** Un clone partiel conserve tous les commits :
l'historique reste consultable, et seul le contenu des fichiers est récupéré
paresseusement. Un clone superficiel, lui, jette réellement de l'historique :
`git log` s'arrête à la coupure et le blame ne peut pas voir au-delà. Si vous
clonez un monorepo pour y travailler, c'est généralement le partiel que vous
voulez.

Le superficiel se défait : `git fetch --unshallow` dans le
[terminal](terminal.md) recomplète l'historique.

### Choisir la branche

Tapez un nom de branche, ou appuyez sur **Lister les branches** pour demander au
distant ce qu'il possède (`git ls-remote --heads`) et choisir dans une liste
déroulante. C'est un seul aller-retour réseau, effectué uniquement quand vous
appuyez sur le bouton — rien n'est interrogé pendant que vous tapez.

Si le listage échoue — URL privée sans jeton, faute de frappe, pas de réseau —
le champ reste une simple zone de texte et le clonage lui-même signale la vraie
erreur.

### Deux remarques sur les options

- **`--depth` implique `--single-branch`.** Avec un clone superficiel, laisser
  *Une seule branche* décoché est précisément ce qui redemande les autres
  branches (`--no-single-branch`) : d'où le changement de l'indication en
  dessous.
- **Cloner un dossier local** ignore normalement `--depth` complètement, parce
  que git crée des liens durs vers la base d'objets au lieu de récupérer quoi que
  ce soit. Gitcito clone via une URL `file://` quand vous demandez une copie
  superficielle d'un dépôt local : la profondeur demandée est donc bien celle que
  vous obtenez.

## Progression

La barre rapporte ce que git rapporte : décompte, compression, réception,
résolution, extraction. Une étape incapable d'annoncer un total affiche une
barre indéterminée plutôt qu'un faux pourcentage.

Le nouveau dépôt s'ouvre dans un onglet, épinglé au profil avec lequel vous avez
cloné.
