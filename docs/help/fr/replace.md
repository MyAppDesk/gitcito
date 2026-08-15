---
title: Remplacement et greffe
category: Dépôt et historique
order: 17
summary: Raccourcir l'historique d'un clone sans le réécrire — git replace, les greffes, et comment remettre l'historique.
keywords: remplacement replace git replace greffe graft refs/replace superficiel shallow tronquer truncate historique archive parents réécriture rewrite filter-branch alternative clone plus petit useReplaceRefs no-replace-objects
---

# Remplacement et greffe

`git replace` dit à git : *partout où tu allais lire l'objet A, lis B à la
place*. Rien n'est réécrit. Aucun sha ne change. Chaque commit reste exactement
là où il était — git regarde simplement ailleurs au passage.

Cela ressemble à une curiosité jusqu'au jour où vous voulez un clone plus petit.
C'est alors l'alternative honnête à une réécriture d'historique : **greffez un
commit sur aucun parent** et tout ce qui précède disparaît du journal, du graphe
et de tout clone effectué à partir de là — tout en restant stocké, toujours
récupérable, et à une seule référence supprimée de son retour.

`⌘K` → **Remplacement et greffe**.

![Les remplacements existants, et le formulaire de greffe en dessous](../../screenshots/replace.webp)

## Greffer

| Donnez-lui | Et vous obtenez |
|---------|-------------|
| Un commit, **aucun parent** | Ce commit devient le début de l'histoire |
| Un commit, **un ou plusieurs parents** | Il s'accroche là plutôt qu'à sa vraie place |

La seconde forme est la plus intéressante. Gardez l'historique complet dans un
dépôt d'archive, tronquez celui de travail, et une greffe pointant vers la pointe
de l'archive rattache les deux — la même astuce que GitHub emploie pour servir un
clone superficiel qui peut malgré tout être approfondi.

**Greffer sur aucun parent demande confirmation d'abord**, parce que
« l'historique est parti » et « l'historique est caché » se ressemblent
parfaitement vus du journal, et ne sont pas du tout la même chose. Les objets
survivent jusqu'à ce qu'un `gc` les élague ; voir [la
maintenance](maintenance.md).

## Vivre avec

**Les remplacements sont des références**, sous `refs/replace/`. Cela a trois
conséquences qu'il vaut la peine de connaître :

- Ils sont **locaux tant qu'ils ne sont pas poussés** :
  `git push origin "refs/replace/*"` les partage, et quiconque clone sans eux
  voit l'historique intact.
- **L'annulation fonctionne** — supprimer la référence restaure l'ascendance
  réelle immédiatement, et Gitcito enregistre la greffe comme une action
  annulable, comme n'importe quelle autre.
- `core.useReplaceRefs=false` fait ignorer tous les remplacements d'un coup par
  git. La bascule d'ici écrit exactement cela, et la boîte de dialogue le signale
  quand elle est désactivée, parce qu'un dépôt qui ignore silencieusement ses
  propres remplacements est un endroit déroutant.

En ligne de commande, `git --no-replace-objects log` montre l'histoire réelle
sans changer le moindre réglage.

## Quand recourir à ceci plutôt qu'à une réécriture

| Objectif | Outil |
|------|------|
| Le clone est trop gros, l'historique va bien | **Greffe** — rien de réécrit, réversible |
| Un secret ou un blob énorme doit *disparaître* | [Retirer un fichier de l'historique](history-purge.md) — une vraie réécriture |
| Vous voulez juste moins à télécharger, une fois | `git clone --depth` — superficiel, aucune référence à gérer |

Une greffe ne retire rien. Si la raison pour laquelle vous voulez sortir les
vieux commits est qu'ils contiennent quelque chose qui n'aurait jamais dû être
validé, ce n'est pas la bonne page : les objets sont toujours là, toujours
récupérables par sha, et toujours dans chaque clone existant.

## Limites qu'il vaut mieux connaître

- **Ce que vous voyez cesse de correspondre à ce qui est stocké.** C'est la
  fonctionnalité, et le danger. Quiconque débogue un clone avec des
  remplacements doit savoir qu'ils existent.
- **Les remplacements ne voyagent pas par défaut** : le `git log` d'un collègue
  et le vôtre peuvent donc légitimement diverger.
- **Un remplacement peut cacher un commit aux outils, pas à git.**
  `git cat-file` et l'[explorateur d'objets](objects.md) ouvrent toujours
  l'original par son sha.
- **Gitcito ne propose pas `git replace --edit`** (réécrire à la main le contenu
  d'un objet). C'est le travail d'un éditeur de texte sur un objet brut, et un
  tire-au-pied avec une interface autour.

Voir aussi : [Explorateur d'objets](objects.md) ·
[Retirer un fichier de l'historique](history-purge.md) ·
[Maintenance du dépôt](maintenance.md)
