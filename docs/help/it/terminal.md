---
title: Terminale integrato
category: Strumenti dell'area di lavoro
order: 90
summary: Una vera PTY agganciata sotto il repo, con schede per repository.
keywords: terminale terminal shell pty xterm console schede agganciato
---

# Terminale integrato

Una vera PTY (xterm + node-pty), non un esecutore di comandi. La tua shell, il
tuo prompt, i tuoi alias.

![Il terminale integrato](../../screenshots/terminal.webp)

- **Più schede per repository**, ognuna che parte dalla cartella di quel
  repository.
- Agganciato **sotto** il grafo oppure come **colonna di destra**; il pannello
  ricorda la propria dimensione.
- La visibilità del terminale è per repository: passando a una scheda che non ne
  ha mai aperto uno, resta chiuso.
- Le schede si danno il nome in base a ciò che vi sta girando.
- Richiudere l'elenco dei terminali lo riduce a una **guida laterale**:
  un'icona per terminale (i terminali divisi mostrano una mini mappa dei
  pannelli), clic per passare da uno all'altro, clic destro per il solito menu
  rinomina/dividi/termina.
- **Trascina un terminale su un altro** nell'elenco per fonderli in un gruppo
  diviso. Ogni terminale conserva il suo nome come riquadro; il gruppo fuso
  riceve un nuovo nome numerato.

![Due pannelli affiancati in un unico gruppo di terminali](../../screenshots/terminal-split.webp)

Tutto quello che esegui qui è invisibile al meccanismo di lock di Gitcito, quindi
un lungo `git rebase` digitato a mano e un clic nell'interfaccia possono ancora
scontrarsi — l'app si aggiorna da disco quando il terminale cambia qualcosa.

**Vedi anche:** [Esecuzione e debug](launch.md) · [Hook](hooks.md)
