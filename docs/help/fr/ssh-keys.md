---
title: Clés SSH
category: Synchronisation et multi-dépôts
order: 57
summary: Pourquoi votre jeton ne sert à rien pour un distant git@, et comment voir quelle clé échoue.
keywords: ssh clé key clés keys agent ssh-add ssh-keygen ed25519 publickey permission denied empreinte fingerprint phrase secrète passphrase téléverser upload github known_hosts
---

# Clés SSH

**Réglages → Sécurité → Clés SSH.**

## Pourquoi cette section est à côté des jetons

Gitcito authentifie deux choses différentes, et on suppose raisonnablement
qu'elles n'en font qu'une :

| | Authentifié par |
|---|---|
| L'**API de l'hébergeur** — dépôts, PR, tickets, vérifications de CI | Votre [jeton](hosting.md) |
| Le transport git par `https://` | Votre jeton, injecté dans l'URL |
| Le transport git par **`git@…`** | **Votre clé SSH, via le ssh du système** |

Un distant comme `git@github.com:me/api.git` ne touche jamais au jeton. Git
confie la connexion à `ssh`, qui n'a jamais entendu parler d'un jeton d'accès
personnel. Ce n'est pas un cas marginal — c'est ce que vous obtenez quand un
collègue a configuré le dépôt, quand un `.gitmodules` utilise des URL `git@`,
quand votre entreprise désactive l'authentification HTTPS, ou quand l'hébergeur
est un GitLab autogéré.

Quand cela tourne mal, ssh dit `Permission denied (publickey)` et rien d'autre.
Techniquement vrai, inutile comme conseil.

![Chaque clé de ~/.ssh avec son type, son empreinte et si l'agent la détient](../../screenshots/ssh-keys.webp)

## Ce que la section vous dit

Chaque clé trouvée dans `~/.ssh` affiche son type, sa taille, son empreinte et
son commentaire, plus le seul fait qui explique la plupart des pannes soudaines :

**dans l'agent** / **pas dans l'agent.** Une clé que l'agent ne détient pas ne
peut authentifier quoi que ce soit, et l'agent oublie son contenu au redémarrage,
sauf si l'on a dit le contraire au système. « Ça marchait hier », c'est
généralement cela.

## Ce que vous pouvez faire ici

| Action | Ce qu'elle exécute |
|--------|--------------|
| **Copier la clé publique** | Met la ligne `.pub` dans le presse-papiers, prête à coller chez n'importe quel hébergeur |
| **Ajouter à l'agent** | `ssh-add` (avec `--apple-use-keychain` sur macOS, pour qu'elle survive à un redémarrage) |
| **Téléverser vers GitHub** | `POST /user/keys` avec le jeton de ce profil |
| **Générer une clé** | `ssh-keygen -t ed25519`, commentée avec votre e-mail git |
| **Tester la connexion** | `ssh -T git@<host>`, traduit en une phrase |

**Tester la connexion** existe parce que la réponse propre de ssh induit en
erreur : GitHub vous authentifie avec succès *puis* sort avec un code d'échec,
puisqu'il n'offre pas de shell. Gitcito lit le message plutôt que le code de
sortie, et affiche la sortie brute en dessous pour que vous puissiez vérifier sa
lecture.

## Les limites, dites clairement

- **Le téléversement ne marche que pour GitHub.** GitLab, Bitbucket et Azure
  DevOps ont droit à *Copier la clé publique* et à un lien direct vers leur page
  de réglages de clés. L'enregistrement de clés chez les trois autres n'est pas
  implémenté, et le bouton ne prétend pas le contraire.
- **La génération n'écrase jamais.** Un nom déjà présent dans `~/.ssh` est
  refusé. Écraser une clé privée révoque silencieusement votre accès à tout ce
  qui lui fait confiance, et aucune boîte de dialogue de confirmation ne rend
  cela récupérable.
- **Les phrases secrètes ne sont pas stockées par Gitcito.** Vous en tapez une à
  la génération ou à l'ajout dans l'agent ; elle est transmise à
  `ssh-keygen`/`ssh-add` puis abandonnée. La conserver d'un redémarrage à l'autre
  est le travail du trousseau du système, via `ssh-add`.
- **Aucune édition de `~/.ssh/config`**, pas d'alias d'hôtes, pas de sélection de
  clé par dépôt. Cela vit dans votre configuration ssh, et Gitcito ne touche pas
  à ce fichier.

## Ce qui ne quitte jamais votre machine

**Gitcito ne lit, n'affiche et ne transmet jamais une clé privée.** La section
liste des moitiés publiques et des empreintes. La seule chose jamais envoyée où
que ce soit est la clé publique sur laquelle vous appuyez explicitement
**Téléverser** — et elle part vers GitHub, sous votre propre jeton, après une
confirmation qui nomme l'empreinte.

Voir aussi : [Sécurité et secrets](security.md) · [Hébergement et pull requests](hosting.md)
