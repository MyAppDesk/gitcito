---
title: Accessibilité
category: Personnalisation
order: 78
summary: Lecteur d'écran et clavier — ce qui est couvert, et ce qui ne l'est pas encore.
keywords: accessibilité accessibility a11y lecteur d'écran VoiceOver NVDA navigation clavier focus aria contraste animations réduites
---

# Accessibilité

Gitcito vise à être utilisable sans souris et lisible par un lecteur d'écran.
Cette page dit ce que cela signifie concrètement — et où sont les limites.

## Clavier

- **Les onglets, les lignes de la barre latérale, les listes de fichiers et
  les menus de la barre d'outils** sont focusables et s'activent avec Enter ou
  Space. Les boutons scindés (pull/push/stash) exposent leur flèche de menu
  déroulant comme un contrôle focusable à part entière.
- **Le graphe des commits** est un seul arrêt de focus : donnez-lui le focus
  et utilisez Haut/Bas (ou j/k) pour parcourir l'historique. Le commit
  sélectionné est annoncé avec son sujet, son auteur et sa position. Shift+F10
  (ou la touche menu) ouvre le menu contextuel du commit sélectionné.
- **Les menus contextuels** s'ouvrent avec le focus : les flèches déplacent,
  Enter active, ArrowRight/ArrowLeft entrent et sortent des sous-menus,
  Escape ferme.
- **Les boîtes de dialogue** piègent Tab à l'intérieur, rendent le focus là où
  vous étiez à leur fermeture, et se ferment avec Escape.
- La **palette de commandes** (Cmd/Ctrl+K) est une combobox : les résultats
  sont annoncés pendant la frappe et pendant le parcours aux flèches.

## Lecteurs d'écran

- Chaque boîte de dialogue est annoncée avec son titre. Les toasts — le canal
  de retour de l'application — sont des régions live : les succès s'annoncent
  poliment, les erreurs interrompent.
- La progression (clonage, téléchargement de mise à jour) est exposée comme
  une barre de progression avec un pourcentage, et les états occupés
  (« Récupération… ») s'annoncent d'eux-mêmes.
- L'état des fichiers est prononcé (« Ajouté », « Modifié », « En conflit »),
  pas seulement affiché comme un glyphe coloré.
- La fenêtre est structurée par des landmarks (banner, main, barre latérale,
  barre d'état), la navigation par landmarks fonctionne donc.

## Les limites, dites franchement

- **Le terminal** est xterm.js et hérite de son histoire côté lecteur
  d'écran, qui est faible. Traitez-le comme une surface pour utilisateurs
  voyants ; chaque opération git qu'il offre existe aussi comme action de
  l'interface.
- **Cosmos (l'historique en 3D), les couloirs du graphe des commits et les
  diffs d'images** sont visuels par nature. Les données derrière — la liste
  des commits, les listes de fichiers — sont accessibles ; l'image elle-même
  ne l'est pas.
- **Le glisser-déposer** (réordonner les étapes d'un rebase interactif,
  glisser des branches pour fusionner) est réservé au pointeur là où c'est
  indiqué ; chaque action de glissement a un équivalent en menu ou en bouton.
- L'audit derrière cette page a été fait avec VoiceOver sous macOS. NVDA/JAWS
  sous Windows devraient se comporter de la même façon mais n'ont pas été
  éprouvés sur le terrain — les retours sont bienvenus en
  [issues](https://github.com/MyAppDesk/gitcito/issues).

## Réglages associés

**La réduction des animations** est respectée depuis le réglage du système —
les animations se réduisent à des transitions instantanées. Le contraste peut
être ajusté thème par thème dans [Réglages → Apparence](themes.md).
