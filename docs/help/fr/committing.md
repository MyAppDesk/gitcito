---
title: Faire des commits
category: Travailler sur les changements
order: 31
summary: Styles de message, modèles, co-auteurs et le linter.
keywords: commit valider message compositeur composer conventional gitmoji ticket amend amender modèle template co-auteur co-author linter annuler undo réinitialisation reset
---

# Faire des commits

## Styles de message

Choisissez-en un dans les réglages ; le compositeur s'y adapte.

| Style | Ce que ça donne |
|---|---|
| **Conventional** | `feat(api)!: add rate limiting` — avec une liste déroulante de types |
| **Gitmoji** | `✨ add rate limiting` — avec un sélecteur d'emoji |
| **Gitmoji + Conventionnel** | `✨ feat(api): add rate limiting` — sélecteur d'emoji *et* liste de types |
| **Ticket** | `ABC-123: add rate limiting` — amorcé depuis le nom de la branche |
| **Simple** · **Auto** | Ce que vous tapez ; Auto laisse l'IA décider de la forme |
| **Homme des cavernes** · **Haïku** | Exactement ce que le nom laisse entendre |

![Compositeur prérempli depuis un modèle de commit](../../screenshots/commit-template.webp)

### Gitmoji

[Gitmoji](https://gitmoji.dev) place un emoji devant le sujet pour qu'un
historique se lise d'un coup d'œil : 🐛 corrections, ✨ fonctionnalités, 🔥
suppressions. Avec l'un ou l'autre style gitmoji, le bouton d'emoji se trouve
juste à côté du champ de sujet. Il ouvre **les 75 gitmoji officiels**,
consultables par emoji, par `:code:` (ce que tapent les utilisateurs de
gitmoji-cli) ou par signification dans votre langue.

**Gitmoji + Conventionnel** garde le type et l'emoji synchronisés. Choisissez un
type et son emoji suit ; changez de type et il change aussi — sauf si vous avez
choisi l'emoji vous-même (🚑️ sur un `fix`, par exemple), qui n'est jamais écrasé.

| Type | Emoji | Type | Emoji |
|---|---|---|---|
| `feat` | ✨ | `test` | ✅ |
| `fix` | 🐛 | `build` | 📦️ |
| `docs` | 📝 | `ci` | 👷 |
| `style` | 🎨 | `chore` | 🔧 |
| `refactor` | ♻️ | `revert` | ⏪️ |
| `perf` | ⚡️ | | |

L'IA écrit sous la même forme. Si un modèle oublie l'emoji ou répond avec un
`:shortcode:`, le sujet est corrigé avant d'arriver dans le champ.

Les commits écrits par d'autres outils sous la forme `:sparkles: add login` sont
**affichés** comme `✨ add login` dans le graphe, les détails du commit et les
vues d'historique.

Limites :

- Le sélecteur écrit toujours l'emoji **unicode**, jamais un `:shortcode:`.
- Les shortcodes ne sont convertis qu'à l'affichage. Le commit n'est pas
  réécrit, et la recherche dans l'historique porte sur le texte tel qu'il a été
  commité.
- Seuls les gitmoji comptent : un sujet qui commence par un autre emoji reste tel quel.
- Un dépôt dont le hook `commit-msg` lance commitlint avec le preset
  Conventional standard refuse un emoji en tête. C'est la règle du hook, pas de
  Gitcito : configurez commitlint pour gitmoji ou utilisez du Conventional pur.

## Ce que le compositeur fait pour vous

- <kbd>↑</kbd> <kbd>↓</kbd> rappellent vos **messages récents**.
- Un **sélecteur de co-auteurs** ajoute des lignes `Co-authored-by:` à partir des
  contributeurs du dépôt lui-même.
- `commit.template` / `.gitmessage` **préremplissent** le message, lignes de
  commentaire retirées.
- Pendant une fusion, un cherry-pick ou un revert, le message est
  **prérempli** comme git le ferait.
- Les brouillons **persistent** par dépôt : changer d'onglet ne perd jamais un
  message.

## Le linter

Une vérification vivante et non bloquante : longueur du sujet (avec un compteur
de caractères), point final, sujet non impératif ou en minuscule, lignes de corps
trop larges. Des indications, jamais une barrière — il ne vous empêchera pas de
faire votre commit.

## Amender

Amender réécrit le dernier commit avec ce qui est indexé. Gitcito vous montre
d'abord le message existant, pour que vous soyez en train d'éditer et non de
retaper.

**Amender le commit…** sur une ligne du graphe fait la même chose pour HEAD :
il charge le message complet, fait passer le compositeur en mode amend et lui
donne le focus. Un HEAD déjà poussé peut toujours être amendé, mais Gitcito
prévient que mettre à jour le distant exigera un push forcé.

**Annuler le commit…** est son pendant pour un HEAD non poussé : reset mixed
vers le parent, changements de l'arbre de travail conservés, message restauré
dans le compositeur. Le commit initial a un chemin dédié qui laisse une branche
non née au lieu de détruire les fichiers.

**Voir aussi :** [Indexation](staging.md) · [Absorption](absorb.md) · [Générateur de changelog](changelog.md)
