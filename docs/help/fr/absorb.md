---
title: Absorption
category: Travailler sur les changements
order: 33
summary: Renvoyer chaque correction indexée dans le commit qui a introduit la ligne.
keywords: absorb absorption fixup autosquash amend indexé staged sections hunks blame corrections de revue review fixes
---

# Absorption

Vous avez corrigé trois remarques de revue dans trois fichiers. L'honnêteté
voudrait trois commits `fixup!` visant les bons parents. Ce que les gens font
réellement, c'est un seul commit intitulé « corrections de revue ».

L'absorption fait le travail honnête à votre place.

![L'absorption dirigeant chaque section indexée vers le commit qui l'a introduite](../../screenshots/absorb.webp)

## Comment ça marche

1. Indexez les corrections.
2. Outils → **Absorber les changements indexés…** (ou <kbd>⌘K</kbd>).
3. Gitcito blâme les lignes que touche chaque section indexée, trouve lequel de
   **vos commits non poussés** les a introduites, et vous montre le plan avant
   de faire quoi que ce soit.

Le plan liste chaque commit cible avec les sections qui lui sont destinées, plus
un groupe **N'appartient encore à rien** — un fichier tout neuf n'a pas
d'historique dans lequel être absorbé, il reste donc indexé pour que vous le
validiez normalement.

| Bouton | Ce qui se passe |
|---|---|
| **Créer les fixups** | Un commit `fixup!` par cible. Rien n'est rebasé. |
| **Créer les fixups et rebaser** | Idem, puis un rebase autosquash les replie dedans. |

## Les règles qu'elle respecte

- **Seuls les commits non poussés sont candidats.** Ce qui est déjà publié ne
  nous appartient pas et ne se réécrit pas. Si tout est poussé, l'absorption le
  dit et ne fait rien.
- **La copie de travail n'est jamais touchée.** Seuls l'index et les commits que
  l'absorption crée elle-même le sont.
- **Un échec ne laisse aucun désordre.** Si une étape échoue, HEAD et l'index
  sont remis exactement dans l'état où ils étaient.
- Elle refuse de s'exécuter pendant une fusion ou un rebase — cet index-là
  appartient à git.

**Voir aussi :** [Rebase interactif](rebase.md) · [Indexation](staging.md)
