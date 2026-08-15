---
title: Fonctions IA
category: IA
order: 80
summary: Optionnelles, indépendantes du fournisseur, et ancrées dans votre code réel.
keywords: ia ai openai anthropic ollama llm local message de commit expliquer explain revue review wiki ancré grounded
---

# Fonctions IA

Chaque fonction d'IA est **optionnelle** et désactivée tant que vous n'avez pas
configuré de fournisseur. Rien n'est envoyé nulle part tant que vous ne demandez
pas quelque chose de précis.

![Les réglages d'IA](../../screenshots/settings-ai.webp)

## Fournisseurs

Des préréglages pour **OpenAI, Anthropic, OpenRouter, Groq, Mistral et Ollama**
(entièrement local), ou n'importe quel point d'accès compatible OpenAI. Les
modèles sont récupérés en direct, et vous pouvez ajouter des instructions
personnalisées.

> Seul OpenAI est réellement éprouvé. Les autres utilisent une forme d'appel
> compatible OpenAI et devraient fonctionner — mais ils ne sont pas vérifiés.

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

**Voir aussi :** [Wiki du dépôt](repo-wiki.md) · [Sécurité et secrets](security.md)
