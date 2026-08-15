---
title: Hooks et .gitignore
category: Outils de l'espace de travail
order: 92
summary: Gérer les hooks git, et ignorer des fichiers sans éditer à la main.
keywords: hooks crochets pre-commit husky core.hooksPath gitignore ignorer ignore ne plus suivre untrack
---

# Hooks et .gitignore

## Hooks

Listez tous les hooks du dépôt, voyez lesquels sont réels et lesquels sont encore
des `.sample`, et activez-les, désactivez-les, modifiez-les ou créez-en.

![Le gestionnaire de hooks](../../screenshots/hooks.webp)

Gitcito détecte un **`core.hooksPath`** personnalisé (husky et consorts) et une
configuration de **framework pre-commit**, et vous prévient quand les hooks
vivent ailleurs que dans `.git/hooks` — sans quoi vous éditeriez un fichier que
git n'exécute jamais.

> Les hooks s'exécutent pour les commits de Gitcito exactement comme pour
> `git commit`. Un hook qui échoue bloque le commit, et sa sortie revient dans
> l'erreur.

## .gitignore intelligent

Clic droit sur un fichier → **Ignorer**, puis choisissez :

| Choix | Écrit |
|---|---|
| Ce fichier | `path/to/file.log` |
| Tous les `*.ext` | `*.log` |
| Le dossier entier | `path/to/folder/` |

![Le sélecteur de .gitignore](../../screenshots/gitignore-chooser.webp)

La règle va dans le `.gitignore` du **dossier le plus proche**, ou à la racine du
dépôt, avec un aperçu en direct de la ligne avant que vous ne vous engagiez. Les
fichiers déjà suivis obtiennent un **Ignorer et ne plus suivre** dans la même
boîte de dialogue.

**Voir aussi :** [Sécurité et secrets](security.md) · [Indexation](staging.md)
