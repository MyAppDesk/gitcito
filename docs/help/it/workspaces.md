---
title: Aree di lavoro, schede e gruppi
category: Per iniziare
order: 3
summary: Tanti repository senza affogare: schede, gruppi, cartelle e aree di lavoro.
keywords: area di lavoro workspace schede tabs gruppi cartelle più repo organizza cambia layout
---

# Aree di lavoro, schede e gruppi

Tre livelli, dal più lasco al più stretto.

## Schede

Un repository, una scheda. Usa <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> per aprire il
selettore della nuova scheda e <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> per chiudere
quella attiva. Puoi anche trascinarle per riordinarle, chiuderle con il clic
centrale, o premere <kbd>⌘⇧T</kbd> per riaprire l'ultima che hai chiuso. Clic
destro su una scheda di repository (o su una pillola dentro un
[gruppo](#gruppi)) per il [menu contestuale del repository](repo-menu.md) —
alias, worktree, GitHub, terminale, mostra, editor e rimozione. Chiudi
l'ultima scheda e <kbd>⌘W</kbd> chiude invece la finestra. Un punto sulla scheda
significa lavoro non committato; uno diverso significa conflitti.

Se compare un avviso di chiusura, <kbd>Escape</kbd> annulla sempre.
<kbd>Enter</kbd> conferma solo quando la scheda è pulita — quando ci sono
modifiche non committate o conflitti, l'avviso ti costringe deliberatamente a
cercare il pulsante, così una pressione di tasto a vuoto dopo <kbd>⌘W</kbd> non
può chiudere lavoro che avevi ancora fra le mani.

## Gruppi

Raccogli repository affini in una **scheda di gruppo** con un nome e un colore.
Dentro un gruppo ottieni una seconda riga con una pillola per repository, e il
gruppo stesso può fare **Fetch su tutti** o **Pull su tutti** in un colpo solo.

![Una scheda di gruppo con diversi repository](../../screenshots/repo-groups.webp)

I gruppi possono contenere **cartelle, annidate a qualsiasi profondità**: clic
destro sul gruppo → *Nuova cartella…*, poi trascina i repository su una pillola
di cartella. Ogni cartella prende un colore, si richiude in una pillola con il
conteggio, riassume i punti di stato di tutto ciò che contiene, e può fare fetch
o pull sull'intero sottoalbero.

![Le cartelle nella striscia di schede del gruppo, ciascuna una pillola con il conteggio — Internal annidata dentro Services](../../screenshots/nested-folders.webp)

> Le cartelle servono solo a organizzare. Eliminarne una solleva i suoi
> repository al livello superiore — non chiude mai un repository.

## Le pagine che appartengono a un repository

Alcune pagine non stanno da sole: il [wiki](repo-wiki.md) di un repository, i
suoi [insight](insights.md), i [dev tool](devtools.md) che una sessione di
avvio ha annunciato. Non occupano una scheda — compaiono come piccole icone sul
repository stesso.

- **Clicca un’icona** per mostrare quella pagina. **Clicca di nuovo — o clicca
  il nome del repository** — per tornare al repository. Finché una pagina è
  aperta, il nome prende il cursore a mano e una pastiglia al passaggio: è la
  via del ritorno.
- **Passa sopra un’icona** per la ✕ che chiude solo quella pagina.
- Dentro un **gruppo**, le icone stanno sulla targhetta del repository a cui
  appartengono, e solo finché quel repository è quello selezionato. Scegliere
  un altro repo del gruppo mostra *quel* repository, non lo strumento del
  vicino.
- Riaprire la stessa pagina accende l’icona che c’è già, invece di aggiungerne
  una seconda.

Un repository non aperto da nessuna parte non ha un’icona da portare: una sua
pagina apre allora una scheda propria — aprire deve sempre aprire qualcosa.

## Aree di lavoro

Un'area di lavoro è un'**intera striscia di schede salvata**. Cambiarla scambia
tutte le schede in una volta: `Lavoro` e `Personale` smettono di pestarsi i
piedi.

Il nome dell'area di lavoro sta in alto a sinistra, accanto al marchio Gitcito.
Cliccalo per cambiare, creare, rinominare, riordinare o eliminare. Accanto c'è
l'indicatore che apre [Mission control](mission-control.md) per l'area di lavoro
in cui sei.

**Vedi anche:** [Mission control](mission-control.md) · [La riga di comando](cli.md)
