---
title: Timelapse
category: Dépôt et historique
order: 14
summary: Rejouer toute la vie du dépôt sous forme d'animation, et l'exporter.
keywords: timelapse accéléré vidéo video animation historique history rejouer replay gource export webm film rétrospective année
---

# Timelapse

Regardez le dépôt grandir.

Chaque fichier est un point, placé selon son dossier de premier niveau : il naît
quand il est ajouté, pulse quand un commit le touche, enfle à mesure qu'il est
édité encore et encore, s'estompe quand il est supprimé. La date, l'auteur, le
sujet et les compteurs courants de commits, de fichiers et d'auteurs se trouvent
en surimpression, avec une barre de progression en bas.

![Le timelapse en cours de lecture](../../screenshots/timelapse.webp)

![Toute la vie d'un dépôt, rejouée](../../screenshots/clip-timelapse.webp)

## Commandes

- **Lecture / pause**, des vitesses de **4× à 32×**, et redémarrage.
- Le curseur se déplace en **rejouant depuis le début** : revenir en arrière
  atterrit donc exactement dans le bon monde plutôt que dans une approximation.

## Exporter la vidéo

**Exporter la vidéo** enregistre le canevas de bout en bout et demande où
enregistrer un `.webm`.

L'enregistrement se fait dans la page elle-même (`MediaRecorder`) — il n'y a
aucun encodeur à installer, pas de ffmpeg, et rien n'est envoyé nulle part. Rien
n'est écrit sur le disque tant que vous n'avez pas choisi un chemin.

> Un dépôt qui a une vraie forme fait un meilleur film qu'un dépôt bien rangé.
> Les renommages, les suppressions et un dossier qui explose d'un coup sont ce
> qui rend la chose digne d'être regardée.

**Voir aussi :** [Machine à remonter le temps](time-machine.md) · [Analyses](insights.md)
