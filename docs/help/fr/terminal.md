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

## Touches

| Touches | Effet |
|---|---|
| <kbd>⌃`</kbd> | Affiche ou masque le terminal — la touche Contrôle physique, sur toutes les plateformes |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Nouveau terminal, quand le terminal a le focus |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Ferme le terminal actif ; fermer le dernier masque le panneau |
| <kbd>Ctrl+Shift+C</kbd> | Copie la sélection ; un simple <kbd>Ctrl+C</kbd> copie aussi tant qu’il y a une sélection, et reste SIGINT sinon |
| <kbd>Ctrl+V</kbd> / <kbd>Ctrl+Shift+V</kbd> / <kbd>Shift+Ins</kbd> | Colle depuis le presse-papiers |
| Clic droit | Copie la sélection, ou colle si rien n’est sélectionné |

Les deux premières sont limitées au terminal à dessein : en dehors, elles
ouvrent et ferment toujours les [onglets d’espace de travail](workspaces.md). Sous
macOS, Copier/Coller du menu Édition se comportent de la même façon.

## Suggestions de scripts

Tapez `npm run ` (ou `pnpm`, `yarn`, `bun run`) et la liste des scripts du projet
apparaît au curseur, filtrée au fil de la frappe : `npm run loc` trouve
`LOCAL_SERVER`. Chaque nom affiche la commande qu’il exécute.

| Touche | Effet |
|--------|-------|
| **Tab** | Complète le script sélectionné |
| **↑ / ↓** | En choisir un autre |
| **Échap** | Ferme la liste jusqu’à la prochaine frappe |

D’autres commandes ont leur propre liste :

| Tapé | Liste | Lu depuis |
|----|-----|---------|
| `composer run ` | Scripts Composer | le `composer.json` le plus proche |
| `make ` | Cibles du Makefile, avec le `## texte` après une cible comme description | le `Makefile` du répertoire courant, comme `make` le lit |
| `git checkout `, `switch`, `merge`, `rebase` | Branches locales, puis distantes par leur nom court | le dépôt où se trouve le shell |

Une cible de Makefile construite à partir de variables ou d’un motif (`%.o`)
n’apparaît pas, et `git checkout -b` n’a pas de liste : il nomme une nouvelle branche.

Les scripts viennent du `package.json` le plus proche du répertoire **courant**
du shell : après `cd frontend`, vous obtenez ceux du frontend. Les noms qui
commencent par ce que vous avez tapé passent d’abord, puis ceux qui le
contiennent.

La liste ne connaît que les touches tapées depuis le dernier Entrée. Rappeler une
commande avec ↑, déplacer le curseur ou utiliser la complétion Tab du shell
modifie la ligne hors de sa vue ; elle se tait alors jusqu’au prochain Entrée
plutôt que de compléter de travers. Sous Windows, le répertoire courant ne peut
pas être lu, donc la liste suit le dossier où le terminal a été ouvert.

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

## Shell, thème et Oh My Posh

Sous Windows, Réglages → Disposition choisit le shell lancé par chaque nouveau
terminal — PowerShell, PowerShell Core (`pwsh`), `cmd`, Git Bash, WSL ou un
exécutable personnalisé. L’apparence du terminal (thème, taille et famille de
police) se règle dans Réglages → Thèmes → Thème du terminal et s’applique en
direct à toutes les sessions.

Si [Oh My Posh](https://ohmyposh.dev) est installé, la section liste aussi chaque
`*.omp.json` de `%POSH_THEMES_PATH%` avec un aperçu en direct — en choisir un
l’injecte comme `POSH_THEME` dans les nouveaux terminaux, si bien qu’un simple
`oh-my-posh init pwsh` dans votre profil le prend. Un chemin `.omp.json`
personnalisé fonctionne aussi ; laisser le champ sur Par défaut conserve ce que
votre shell/profil ou un `POSH_THEME` global définit déjà. Les sessions ouvertes
gardent leur thème — fermez et rouvrez un terminal pour appliquer le nouveau. Les
glyphes du prompt exigent une Nerd Font dans la famille de police du terminal
(par exemple `CaskaydiaMono Nerd Font`), sinon les icônes s’affichent en carrés.

Côté vitesse : Oh My Posh lance son binaire une fois par prompt — environ
100–200 ms sous Windows, davantage pour les thèmes avec un segment git dans un
gros dépôt — ce qui se ressent comme une courte pause avant chaque prompt, pas
comme une lenteur de Gitcito. Les thèmes sans segment git sont les plus rapides.
Le style de prédiction de PowerShell compte aussi : `-PredictionViewStyle
InlineView` repeint une petite zone à chaque touche, alors que `ListView` redessine
tout un bloc.

**Voir aussi :** [Exécuter et déboguer](launch.md) · [Hooks](hooks.md)
