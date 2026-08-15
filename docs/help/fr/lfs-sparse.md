---
title: LFS, sparse-checkout et patchs
category: Synchronisation et multi-dépôts
order: 55
summary: Gros fichiers, extractions partielles, et déplacer des changements sous forme de fichiers.
keywords: lfs large file storage gros fichiers sparse checkout extraction partielle cone clone partiel partial clone patch patchs am apply
---

# LFS, sparse-checkout et patchs

## Git LFS

![Le gestionnaire LFS](../../screenshots/lfs.webp)

Détecte si `git-lfs` est installé, si ce dépôt l'utilise, et quels motifs sont
suivis. La liste de fichiers montre ce qui est **téléchargé** par opposition à ce
qui n'est encore qu'un **pointeur**, et vous pouvez tirer ou élaguer depuis là.

## Sparse-checkout

![Sparse-checkout en mode cone](../../screenshots/sparse-checkout.webp)

Mode cone : cochez les dossiers de premier niveau dans lesquels vous travaillez
réellement, et le reste quitte votre copie de travail tout en restant dans
l'historique. Utile sur un monorepo dont vous ne possédez que deux paquets.

Un **clone partiel** (`--filter=blob:none`) est proposé au clonage, pour que vous
ne téléchargiez pas des blobs que vous n'ouvrirez jamais.

## Patchs

- **Exporter** un commit (ou une sélection multiple) sous forme de `.patch`.
- **Appliquer** un patch à la copie de travail (`git apply`) ou en tant que
  commit (`git am`).

Les deux depuis le menu Outils.

**Voir aussi :** [Arbres de travail et sous-modules](worktrees.md)
