---
title: Le graphe des commits
category: Dépôt et historique
order: 10
summary: Lire l'histoire : couloirs, références, colonnes, filtres et sélection multiple.
keywords: graphe graph historique history commits couloirs lanes branches fusions merges colonnes columns filtre filter linéaire linear first-parent amender amend annuler undo réinitialisation reset github
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
  nouveaux.
- Clic droit sur un commit pour **Amender**, **Annuler**, **Réinitialiser au
  commit…** et **Voir sur GitHub**, en plus du checkout, du cherry-pick, du
  revert, de la branche, de l'étiquette et de la copie. Les actions risquées
  restent visibles et se désactivent.

## Lui faire montrer ce que vous voulez

- La **vue linéaire** (premier parent) masque tout ce qui a été fusionné et ne
  laisse que le tronc.
- **Filtrer par chemin** : clic droit sur un fichier ou un dossier → *Filtrer le
  graphe par ce chemin*, et seuls les commits qui l'ont touché restent allumés.

![Graphe réduit à un seul chemin par un filtre](../../screenshots/graph-path-filter.webp)

- **Colonnes** : afficher, masquer, redimensionner et réordonner les colonnes
  branche, message, auteur, date, SHA, signature et déploiement.
- **Style** : Réglages → Thèmes → **Graphe** — palette de couloirs (8 intégrées,
  personnalisée, ou générée par l'IA), style des angles, densité des lignes et
  épaisseur des traits, avec un aperçu en direct sous forme de mini-graphe.

![Les réglages de style du graphe avec aperçu en direct](../../screenshots/settings-graph.webp)

## Détails d'un commit

Sélectionner un commit affiche ses fichiers modifiés (en arbre ou à plat),
l'auteur, le SHA, les co-auteurs et sa signature. Les références `#123` et les
`@mentions` sont automatiquement liées à votre hébergeur.

La liste de fichiers se sélectionne en groupe avec les gestes habituels (clic
<kbd>⌘</kbd>/<kbd>Ctrl</kbd>, clic <kbd>⇧</kbd>,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>). Clic droit sur la sélection →
*Restaurer {n} fichiers dans l'arbre de travail* reprend ces fichiers
exactement tels que ce commit les avait : après une seule confirmation, les
copies de travail sont écrasées, sans toucher ni HEAD ni l'index.

![Parcours des détails d'un commit](../../screenshots/clip-commit-details.webp)

**Voir aussi :** [Blame et historique de fichier](blame.md) · [Recherche](search.md) · [Machine à remonter le temps](time-machine.md)
