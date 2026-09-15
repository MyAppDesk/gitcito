---
title: Le graphe des commits
category: Dépôt et historique
order: 10
summary: Lire l'histoire : couloirs, références, colonnes, filtres et sélection multiple.
keywords: graphe graph historique history commits couloirs lanes branches fusions merges colonnes columns filtre filter linéaire linear first-parent amender amend annuler undo réinitialisation reset github stash stashes remise ordre placement spur
---

# Le graphe des commits

Branches, fusions et fusions pieuvre dessinées correctement, en clair comme en
sombre. Le rendu est fenêtré : un dépôt de cent mille commits défile comme un
dépôt d'une centaine.

| | |
|---|---|
| ![Graphe des commits, thème clair](../../screenshots/graph-light.webp) | ![Graphe des commits, thème sombre](../../screenshots/graph-dark.webp) |

## Se déplacer

- <kbd>↑</kbd> <kbd>↓</kbd> (ou <kbd>j</kbd> <kbd>k</kbd>) déplacent la
  sélection.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-clic fait basculer un commit dans une **sélection
  multiple** ; <kbd>⇧</kbd>-clic prend une plage. Avec plusieurs commits
  sélectionnés, un clic droit permet de les cherry-picker sur la branche
  courante, d'écraser une suite contiguë, d'exporter un patch combiné unique, ou
  de copier leurs SHA.
- Les commits arrivés lors de votre **dernier fetch ou pull** sont signalés comme
  nouveaux. Ceux qui ne font pas encore partie de la branche active restent
  légèrement translucides jusqu'à ce qu'un pull les intègre.
- Clic droit sur un commit pour **Amender**, **Annuler**, **Réinitialiser au
  commit…** et **Voir sur GitHub**, en plus du checkout, du cherry-pick, du
  revert, de la branche, de l'étiquette et de la copie. Les actions risquées
  restent visibles et se désactivent.

## Lui faire montrer ce que vous voulez

- La **focalisation du graphe** décide de la quantité d'historique dessinée —
  Réglages → Thèmes → **Graphe**, ou le menu engrenage de l'en-tête du graphe.
  *Tout* dessine l'ensemble ; *Historique linéaire* (premier parent) ne laisse
  que le tronc ; *Masquer les branches fusionnées* garde le tronc plus les
  branches encore non fusionnées ; *Mode solo* garde votre branche, vos branches
  favorites et la branche par défaut.

  Elle ne filtre que ce que le journal a déjà chargé. *Masquer les branches
  fusionnées* s'appuie sur la réponse de git à « déjà contenue dans la branche
  courante » : changer de branche change donc ce qui est masqué — et ce mode
  garde tout commit encore pointé par une étiquette ou une référence qu'il ne
  reconnaît pas, c'est-à-dire précisément ce que laisse une branche supprimée.
  *Historique linéaire* et *Mode solo* sont plus brutaux : une étiquette ou une
  remise posée sur un commit qu'ils masquent disparaît avec lui.

- **Filtrer par chemin** : clic droit sur un fichier ou un dossier → *Filtrer le
  graphe par ce chemin*, et seuls les commits qui l'ont touché restent allumés.

![Graphe réduit à un seul chemin par un filtre](../../screenshots/graph-path-filter.webp)

- **Colonnes** : afficher, masquer, redimensionner et réordonner les colonnes
  branche, message, auteur, date, SHA, signature et déploiement.
- **Style** : Réglages → Thèmes → **Graphe** — palette de couloirs (8 intégrées,
  personnalisée, ou générée par l'IA), style des angles, densité des lignes et
  épaisseur des traits, avec un aperçu en direct sous forme de mini-graphe.

![Les réglages de style du graphe avec aperçu en direct](../../screenshots/settings-graph.webp)

## Où s'assoient les remises

Une remise est dessinée comme une ligne à elle, accrochée au commit dont elle
vient par un éperon en pointillés pour ne jamais déplacer le tronc. Elle est
placée dans la ligne **juste au-dessus de ce commit parent**, pas dans le
créneau que son propre horodatage lui vaudrait.

Son marqueur est une boîte d'archive dans un cadre pointillé — le même
symbole d'archive que la liste des remises, la palette de commandes et
l'en-tête des détails, pour que le graphe nomme une remise comme le reste de
l'app. Le cadre pointillé est ce qui la sépare d'un commit : assise une ligne
au-dessus de son parent, c'est la forme qui doit dire « ceci ne fait pas
partie de la branche ».

Une remise est presque toujours plus récente que le commit sur lequel elle
repose, donc un tri par date la ferait remonter parmi des commits sans
rapport et étirerait son fil à travers la moitié du graphe. Le parent est la
seule ligne à laquelle une remise se rattache vraiment, c'est donc celle
qu'elle garde à côté.

La limite : une remise dont le commit parent n'est pas dans la fenêtre
chargée — élagué, ou au-delà de la fin du journal — n'a rien à quoi
s'ancrer, et retombe sur l'ordre chronologique jusqu'à ce que le parent se
charge. Les modes *Historique linéaire* et *Mode solo* jettent une remise
dont ils jettent le parent, comme indiqué plus haut.

## Détails d'un commit

Sélectionner un commit affiche ses fichiers modifiés (en arbre ou à plat),
l'auteur, le SHA, les co-auteurs et sa signature. L'en-tête au-dessus de la liste de fichiers découpe le décompte par type, aux mêmes couleurs que les glyphes des lignes. Survolez-le pour le total. Les références `#123` et les
`@mentions` sont automatiquement liées à votre hébergeur.

La liste de fichiers se sélectionne en groupe avec les gestes habituels (clic
<kbd>⌘</kbd>/<kbd>Ctrl</kbd>, clic <kbd>⇧</kbd>,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>). Clic droit sur la sélection →
*Restaurer {n} fichiers dans l'arbre de travail* reprend ces fichiers
exactement tels que ce commit les avait : après une seule confirmation, les
copies de travail sont écrasées, sans toucher ni HEAD ni l'index.

![Parcours des détails d'un commit](../../screenshots/clip-commit-details.webp)

**Voir aussi :** [Blame et historique de fichier](blame.md) · [Recherche](search.md) · [Machine à remonter le temps](time-machine.md)
