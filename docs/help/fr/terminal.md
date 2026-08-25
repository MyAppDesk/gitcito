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
- **Glissez un terminal sur un autre** dans la liste pour les fusionner en un
  groupe scindé. Chaque terminal garde son nom comme volet ; le groupe fusionné
  reçoit un nouveau nom numéroté.

![Deux panneaux divisés côte à côte dans un même groupe de terminaux](../../screenshots/terminal-split.webp)

## Votre PATH

Le shell démarre comme **shell de login**, exactement comme dans Terminal.app ou
iTerm : `~/.zprofile`, `~/.zlogin` et `~/.bash_profile` sont donc chargés. C'est
important, car les gestionnaires de versions et `brew shellenv` s'y installent
en général — un outil comme `fvm`, `nvm` ou `pyenv` qui marche dans votre
terminal marche aussi ici.

Gitcito demande également son vrai `PATH` à votre shell de login au démarrage et
le fusionne dans tout ce qu'il lance, car une application graphique ouverte
depuis le Dock n'hérite presque de rien. Si une commande reste introuvable,
vérifiez qu'elle est dans le `PATH` d'un shell de login et pas seulement d'un
shell interactif.

Tout ce que vous lancez ici est invisible pour le verrouillage propre à Gitcito :
un long `git rebase` tapé à la main et un clic dans l'interface peuvent donc
encore entrer en collision — l'application se rafraîchit depuis le disque quand
le terminal change quelque chose.

**Voir aussi :** [Exécuter et déboguer](launch.md) · [Hooks](hooks.md)
