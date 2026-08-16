---
title: Fonctions IA
category: IA
order: 80
summary: Optionnelles, indépendantes du fournisseur, et ancrées dans votre code réel.
keywords: ia ai openai anthropic ollama llm local message de commit expliquer explain revue review wiki ancré grounded comptes compte clé api abonnement cli claude codex gemini modèles
---

# Fonctions IA

Chaque fonction d'IA est **optionnelle** et désactivée tant que vous n'avez pas
configuré de fournisseur. Rien n'est envoyé nulle part tant que vous ne demandez
pas quelque chose de précis.

![Les réglages d'IA](../../screenshots/settings-ai.webp)

## Comptes

Un **compte** est une façon d'atteindre un modèle : un fournisseur, où le
joindre, et comment il s'authentifie. Vous pouvez en configurer plusieurs et ils
coexistent — une clé professionnelle, une personnelle, un modèle local, une CLI
à laquelle vous êtes déjà connecté.

Les préréglages couvrent **OpenAI, Anthropic, Google Gemini, OpenRouter, Groq,
Mistral** et **Ollama** (entièrement local), ainsi que tout point de terminaison
compatible OpenAI.

Anthropic utilise sa propre API `/v1/messages` plutôt qu'un appel de forme
OpenAI : les modèles Claude fonctionnent vraiment au lieu d'en donner
l'apparence. Gemini est joint via le point de terminaison compatible OpenAI de
Google.

### Utiliser un abonnement plutôt qu'une clé d'API

Choisissez le fournisseur **CLI locale** pour répondre avec une CLI d'agent déjà
installée et connectée sur cette machine — `claude`, `gemini` ou `codex`.
Gitcito lance le binaire avec votre requête et lit sa réponse ; aucune clé d'API
à coller, aucun jeton stocké.

Gitcito n'exécute qu'une commande que vous avez configurée comme compte, et
toujours avec une liste d'arguments plutôt qu'un shell : rien dans un diff ou un
nom de branche ne peut être interprété comme une commande.

> **Ce n'est pas plus privé qu'une clé d'API.** Vos requêtes atteignent toujours
> le même fournisseur, sous votre propre compte, exactement comme avec une clé.
> Ce qui change, c'est la facturation et la configuration, pas la destination du
> texte.

Si la commande n'est pas dans votre `PATH`, saisissez son chemin complet sur le
compte.

### Quel compte répond à quoi

Sous **Quel compte répond à quoi**, chaque fonction — messages de commit, chat,
expliquer, revue de PR, résolution de conflits, wiki, thèmes — peut viser son
propre compte et son propre modèle. Laissez une ligne sur la valeur par défaut
pour suivre le compte par défaut. Un modèle économique pour les messages de
commit et un modèle puissant pour le chat est le partage habituel.

### Avis de mise à jour

En venant d'une version antérieure aux comptes, ceci s'affiche une fois. Le fournisseur et la clé que vous aviez deviennent le premier compte ; rien n'est à reconfigurer à la main.

![Avis de mise à jour](../../screenshots/ai-accounts-notice.webp)

## Modèles

Les listes de modèles viennent du fournisseur lui-même et sont mises en cache un
jour ; **Récupérer les modèles** en actualise une immédiatement. Sous la liste,
Gitcito indique d'où elle vient : en direct, depuis le cache (avec la date), ou
la liste intégrée de repli et pourquoi.

La liste est filtrée aux modèles capables de répondre à une requête de chat : les
modèles d'embeddings, de parole et d'image en sont exclus. Chaque champ de modèle
accepte aussi du texte libre, si bien qu'un modèle en préversion, un déploiement
privé ou une étiquette Ollama fraîchement téléchargée reste utilisable même si le
fournisseur ne l'annonce pas.

Un fournisseur auquel vous n'avez pas encore donné de clé, ou injoignable, se
rabat sur une petite liste intégrée plutôt que sur une liste déroulante vide.

Aucun fournisseur ne publie de liste classée ou triée sur le volet ; la mise en forme est donc celle de Gitcito : les instantanés datés sont repliés sur le modèle dont ils sont un instantané (`gpt-4o` couvre `gpt-4o-2024-08-06`), et le reste est trié du plus récent au plus ancien plutôt qu'alphabétiquement. **Afficher tous les modèles**, en bas de la liste, ramène tout ce que le fournisseur a renvoyé.

## Ce que cela sait faire

| Fonction | Ce que vous obtenez |
|---|---|
| **Message de commit** | Un résumé (et un corps optionnel) à partir de votre diff indexé, dans le style que vous avez choisi |
| **Expliquer ce fichier** | Une explication en langage clair dans un panneau latéral — Normal, Concis, ELI5… et même Pirate |
| **Survoler pour comprendre** | Maintenez <kbd>⇧</kbd> et pointez un identifiant pour une explication d'une ligne, plus les lignes dont elle s'inspire |
| **Résolution de conflit** | Propose une fusion dans la sortie éditable — n'applique jamais automatiquement |
| **Revue de PR** | Résume un diff et signale les risques, chacun ancré à un vrai `path:line` |
| **Description de PR** · **noms de branche** | Rédigés à partir des commits et du diff de la branche |
| **Thèmes** · **palettes de graphe** | Générés à partir d'une consigne |
| **Indexation intelligente** | Des suggestions sur ce qui a sa place dans ce commit |

## Ancré, pas devinant

La revue voit le diff comme des **sections étiquetées** et ne peut citer que ces
étiquettes ; Gitcito résout ensuite chaque étiquette vers un fichier et une ligne
réels. Un modèle qui invente un emplacement est **rejeté et réinterrogé** : les
observations pointent donc toujours vers du code qui existe.

Le survol pour comprendre ne lit qu'une fenêtre numérotée autour du jeton — dans
un diff, uniquement les sections visibles à l'écran — si bien que, lorsqu'une
définition vit ailleurs, il le dit au lieu de l'inventer. Les réponses sont mises
en cache par version de fichier.

**Les fichiers de secrets masqués ne sont jamais envoyés.** Les fichiers couverts
par les règles de masquage des secrets non plus.

## Limites

- Les listes de modèles de repli vieillissent entre deux versions. C'est à cela
  que sert la récupération en direct ; le repli ne couvre que le cas où elle est
  impossible.
- Le filtrage de la liste d'un fournisseur vers les modèles de chat se fait par
  nom : un modèle de chat au nom inhabituel peut être écarté. Saisissez-le
  vous-même.
- Un compte CLI ne peut pas rapporter la consommation de jetons si la CLI ne le
  fait pas ; les chiffres d'usage et de coût dans les réglages sous-estimeront
  donc ces appels.
- Les réponses via CLI sont plus lentes qu'un appel direct à l'API : le binaire
  démarre une session entière à chaque requête.
- Les clés sont stockées par compte dans le trousseau de votre système.
  Supprimer un compte supprime sa clé.

**Voir aussi :** [Wiki du dépôt](repo-wiki.md) · [Sécurité et secrets](security.md)
