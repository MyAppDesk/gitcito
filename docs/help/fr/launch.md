---
title: Exécuter et déboguer (launch.json)
category: Outils de l'espace de travail
order: 91
summary: Lancer vos configurations VS Code sans quitter Gitcito.
keywords: launch.json exécuter run déboguer debug vscode configurations configs tâches tasks preLaunchTask input arrière-plan background compound compounds stopAll serverReadyAction sessions parallèles hot reload hot restart device simulator emulator run target flutter metro expo vite nodemon vitest jest mocha ava wrangler dotnet watch adb simctl avd xcodebuild capacitor
---

# Exécuter et déboguer

Gitcito lit votre `.vscode/launch.json` — celui de la racine et tous ceux qui
sont imbriqués, groupés par des séparateurs — et exécute la configuration que
vous choisissez dans le terminal intégré.

![Le sélecteur de lancement et la barre d'outils flottante](../../screenshots/launch-configs.webp)

- Les **variables** VS Code **sont résolues** (`${workspaceFolder}` et
  consorts).
- Le **`preLaunchTask`** d'une configuration s'exécute d'abord.
- Les valeurs **`${input:…}`** sont demandées interactivement avant le lancement
  (`promptString` et `pickString`).
  Un `pickString` affiche ses options dans un vrai sélecteur avec la valeur par
  défaut présélectionnée ; un `promptString` marqué `password` est masqué.
- Les tâches **`isBackground`** (observateurs, serveurs de développement)
  s'exécutent détachées : elles ne bloquent donc jamais le lancement.
- Les **compounds** lancent chaque membre dans sa **propre session parallèle**,
  dans un terminal scindé portant le nom du compound — un volet par membre,
  exactement comme les sessions de débogage de VS Code. Avec `stopAll: true`,
  arrêter un membre les arrête tous.
  Les tâches partagées par plusieurs membres s’exécutent **une seule fois**,
  dans leur propre volet, avant le démarrage des membres — une invite de montée
  de version ne demande qu’une fois, pas une fois par membre.
  Ce volet se ferme seul en cas de succès et reste ouvert en cas d’échec.
- **`serverReadyAction`** est pris en charge : quand la sortie de la session
  correspond au motif configuré, l’URL annoncée s’ouvre dans votre navigateur
  (`openExternally` ; `debugWithChrome` / `debugWithEdge` ouvrent aussi le
  navigateur — Gitcito ne peut pas y attacher de débogueur).

![Un compound exécutant deux sessions parallèles](../../screenshots/launch-compound.webp)

![Le sélecteur ${input} avec la valeur par défaut présélectionnée](../../screenshots/launch-input.webp)

Une barre d'outils flottante vous donne **pause / reprise, redémarrage, arrêt**,
et permet de passer d'une session en cours à l'autre.

Activez-le dans **Réglages → Général → Activer launch.json**. Le bouton
**LANCER** apparaît à côté des onglets Git / Fichiers.

Un membre d’un compound s’affiche comme *compound › membre*, et le redémarrer
ne redémarre que ce membre.
Si la barre recouvre quelque chose dont vous avez besoin, déplacez-la par sa
poignée — la position est mémorisée, et un double-clic sur la poignée la
recentre.

Ce que Gitcito ne fait délibérément **pas** : il exécute vos programmes dans de
vrais terminaux, mais ce n’est pas un débogueur — pas de points d’arrêt, pas
d’inspection de variables, pas de Debug Adapter Protocol. Les configurations
attach fonctionnent quand elles portent un `preLaunchTask` (la tâche est le
travail) ; un attach pur n’a rien à exécuter.

## Actions à chaud — la voie rapide à côté de Redémarrer

![Un rechargement à chaud envoyé depuis la barre de débogage](../../screenshots/launch-hot.webp)

La plupart des runtimes de développement rechargent déjà sur une touche :
`flutter run` sur **r**, Metro sur **r**, nodemon sur **rs ⏎**, et Vitest relance
la suite sur **a**. Redémarrer la configuration de lancement pour obtenir la
même chose, c'est la voie lente : cela tue le processus, rejoue chaque
`preLaunchTask` et jette l'état de l'application.

Gitcito lit donc la commande qu'une configuration lance réellement — en suivant
un `npm run dev` jusqu'aux scripts de votre `package.json` — et place les touches
de ce runtime dans la barre de débogage. Appuyer sur l'une d'elles écrit la
touche sur l'entrée standard de la session, exactement comme si vous l'aviez
tapée dans le terminal.

| Runtime | Boutons | Derrière ⋯ |
|---------|---------|------------|
| Flutter (`flutter run`) | Rechargement à chaud `r`, redémarrage à chaud `R` | debug paint, surcouche de performance, changement de plateforme, DevTools |
| Expo | Recharger `r` | menu développeur, débogueur |
| Metro / React Native | Recharger `r` | menu développeur, débogueur |
| Vite (dev, serve, preview) | Redémarrer le serveur `r ⏎` | ouvrir le navigateur, afficher les URL, effacer la console |
| nodemon | Redémarrer `rs ⏎` | — |
| Vitest (mode watch) | Tout relancer `a`, relancer les échecs `f` | mettre à jour les snapshots |
| Jest (`--watch`) | Tout relancer `a`, relancer les échecs `f` | fichiers modifiés uniquement, mettre à jour les snapshots |
| Mocha (`--watch`) | Relancer `rs ⏎` | — |
| AVA (`--watch`) | Tout relancer `r ⏎`, mettre à jour les snapshots `u ⏎` | — |
| `dotnet watch` | Forcer le redémarrage `Ctrl+R` | — |
| Wrangler (`wrangler dev`) | Ouvrir le navigateur `b` | DevTools, local/distant, effacer la console |

Les runtimes qui rechargent d'eux-mêmes n'ont pas de boutons — `node --watch`,
`ng serve`, `tsc --watch`, `cargo watch`, `next dev`, webpack-dev-server. Un
bouton qui envoie une touche que personne ne lit est pire que pas de bouton,
parce qu'il a l'air d'avoir marché.

**Les limites.** La détection est textuelle : elle cherche le nom du programme
dans la ligne de commande, donc une configuration qui démarre votre serveur via
un script d'enrobage que Gitcito ne peut pas lire n'obtient rien. Rien n'accuse
réception non plus : le bouton clignote, et la sortie du processus est la vraie
réponse. Une session en pause ou terminée n'accepte aucune entrée, les boutons
sont alors grisés.

**Quand la déduction se trompe**, dites-le dans la configuration elle-même :

```json
{
  "name": "API (watch)",
  "type": "node-terminal",
  "command": "./scripts/dev.sh",
  "gitcito": { "hotActions": [{ "label": "Reload", "send": "r", "icon": "reload" }] }
}
```

`send` est écrit tel quel — terminez-le par `\n` pour une CLI qui attend Entrée.
`icon` est facultatif : `reload`, `restart`, `rerun`, `failed`, `snapshot`, `menu`, `debugger`,
`browser`, `clear`, `paint`, `perf`, `platform`, `devtools`, `urls`.
Un tableau `hotActions` vide désactive les boutons pour cette configuration.

## Cible d’exécution — sur quel appareil une configuration démarre

![Le choix de la cible à côté de l’onglet LAUNCH](../../screenshots/launch-device.webp)

À une configuration qui construit une application mobile, il faut dire où
l’exécuter. Ce choix n’appartient pas qu’à Flutter — React Native, Expo,
Capacitor et xcodebuild prennent aussi une cible, chacun à sa façon. Gitcito la
demande donc une seule fois, à côté de l’onglet **LAUNCH**, et écrit la réponse
dans la forme que lit le runtime de cette configuration. Le sélecteur
n’apparaît que si une configuration du dépôt peut réellement prendre un
appareil.

**D’où vient la liste** — des outils du SDK présents sur la machine, interrogés
en parallèle :

| Outil | Apporte | Interrogé |
|-------|---------|-----------|
| `flutter devices` / `flutter emulators` | tout, déjà normalisé | si le dossier a un `pubspec.yaml` |
| `xcrun simctl` | simulateurs iOS, démarrés ou froids | sous macOS |
| `adb devices` | téléphones Android et émulateurs démarrés | toujours |
| `emulator -list-avds` | émulateurs Android encore froids | toujours |

Le même simulateur est signalé par jusqu’à trois d’entre eux : les entrées sont
fusionnées par plateforme et par nom, et Flutter l’emporte en cas d’égalité, car
son identifiant est celui qu’attend `flutter run -d`. Les outils absents sont
nommés en bas du menu — une liste courte doit s’expliquer elle-même.

**Ce que fait le choix :**

| Famille | Écrit comme |
|---------|-------------|
| Flutter | `-d <id>` |
| React Native iOS | `--udid <id>` |
| React Native Android | `--deviceId=<id>` |
| Expo `run:ios` / `run:android` | `--device <id>` |
| Capacitor / Ionic | `--target <id>` |
| xcodebuild | `-destination id=<id>` |
| tout le reste | environnement seulement |

Toute configuration lancée reçoit en plus `GITCITO_DEVICE_ID`,
`GITCITO_DEVICE_NAME` et `GITCITO_DEVICE_PLATFORM` dans son environnement, ainsi
que `ANDROID_SERIAL` quand la cible est un vrai appareil Android. C’est ce qui
permet à un script d’enrobage, à une tâche Gradle ou à un simple `adb` de viser
le même téléphone sans que Gitcito réécrive quoi que ce soit.

**Démarrer un appareil froid.** Tout ce qui est sous *Non démarré* démarre quand
vous le choisissez : `flutter emulators --launch`, `xcrun simctl boot` (plus la
fenêtre du Simulator) ou `emulator -avd` détaché — quitter Gitcito n’emporte
donc pas votre émulateur Android.

**Les limites.** Une configuration qui nomme déjà un appareil — un `-d`
explicite, un `--simulator`, le `deviceId` de Dart-Code — est laissée telle
quelle : le sélecteur n’écrase jamais ce qu’a écrit l’auteur. Un identifiant qui
nécessiterait des guillemets bascule vers l’environnement plutôt que de risquer
une ligne de commande cassée. Le menu est filtré selon ce que vos configurations
peuvent atteindre : un dépôt uniquement Android ne vous proposera jamais un
iPhone. Et la liste est un instantané : branchez un téléphone puis appuyez sur
**Actualiser les appareils**.

Le choix est mémorisé par dépôt, et oublié quand l’appareil cesse d’exister.

**Voir aussi :** [Terminal intégré](terminal.md)
