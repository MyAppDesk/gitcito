---
title: Flutter DevTools
category: Outils d’espace de travail
order: 93
summary: La vue réseau, la timeline, l’inspecteur et le profileur mémoire, dans un onglet Gitcito.
keywords: devtools flutter dart réseau network timeline inspecteur mémoire profileur webview panneau intégré vm service
---

# Flutter DevTools

DevTools possède déjà la vue réseau, la timeline, l’inspecteur de widgets et le
profileur mémoire — et c’est une application Flutter web servie par votre propre
machine. Gitcito n’en réimplémente donc rien, et ne parle pas lui-même au Dart VM
Service : il repère l’adresse et l’intègre.

![DevTools ouvert dans un onglet Gitcito](../../screenshots/devtools.webp)

`flutter run` affiche la ligne dès que le service VM est prêt :

```
The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at:
http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/
```

La session de lancement surveille sa propre sortie, et la barre de débogage gagne
un bouton. Un clic ouvre DevTools dans son propre onglet, un par session — deux
applications qui tournent, ce sont deux DevTools.

Un **redémarrage à chaud publie une nouvelle adresse**, et l’onglet la suit tant
que sa session vit. Une fois la session terminée, l’onglet conserve la dernière
adresse, généralement morte : fermez-le et rouvrez DevTools depuis la nouvelle
exécution.

## Ce qu’il a le droit de faire

La vue intégrée est tenue en laisse courte, car cette application détient des
identifiants :

- **Loopback uniquement.** `127.0.0.1`, `localhost`, `::1`. Un attachement avec
  une autre adresse est refusé, et une redirection vers elle aussi.
- **Pas de preload, pas d’intégration Node, isolation de contexte activée.** La
  page n’a aucun pont vers Gitcito.
- **Les liens s’ouvrent dans votre vrai navigateur**, dans une fenêtre normale,
  pas dans le panneau.

## Les limites

- **C’est DevTools, pas le nôtre.** Ce que cette version sait faire, le panneau
  le fait ; ce qu’elle ne sait pas, nous non plus. Il n’y a pas de vue réseau
  façon Gitcito.
- **Seul Flutter s’annonce ainsi.** Un programme Dart ordinaire affiche une URL
  de service VM mais aucune adresse DevTools : aucun bouton n’apparaît.
- **Un panneau vide signifie que l’application s’est arrêtée.** DevTools est
  servi *par l’application en cours* ; quand elle se termine, son adresse ne
  répond plus.

**Voir aussi :** [Exécuter et déboguer](launch.md)
