---
title: Terminal intégré
category: Outils de l'espace de travail
order: 90
summary: Un vrai PTY ancré sous le dépôt, avec des onglets par dépôt.
keywords: terminal shell pty xterm console onglets tabs ancré docked
---

# Terminal intégré

Un vrai PTY (xterm + node-pty), pas un lanceur de commandes. Votre shell, votre
invite, vos alias.

![Le terminal intégré](../../screenshots/terminal.webp)

- **Plusieurs onglets par dépôt**, chacun démarrant dans le dossier de ce dépôt.
- Ancrez-le **sous** le graphe ou en **colonne de droite** ; le panneau se
  souvient de sa taille.
- La visibilité du terminal est propre à chaque dépôt : passer sur un onglet qui
  n'en a jamais ouvert le laisse fermé.
- Les onglets se nomment d'après ce qui tourne dedans.
- Replier la liste des terminaux la réduit à un **rail** : une icône par terminal
  (les terminaux divisés affichent une mini-carte des panneaux), clic pour
  changer, clic droit pour le menu habituel renommer/diviser/tuer.

![Deux panneaux divisés côte à côte dans un même groupe de terminaux](../../screenshots/terminal-split.webp)

Tout ce que vous lancez ici est invisible pour le verrouillage propre à Gitcito :
un long `git rebase` tapé à la main et un clic dans l'interface peuvent donc
encore entrer en collision — l'application se rafraîchit depuis le disque quand
le terminal change quelque chose.

**Voir aussi :** [Exécuter et déboguer](launch.md) · [Hooks](hooks.md)
