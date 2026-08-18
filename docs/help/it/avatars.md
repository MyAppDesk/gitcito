---
title: Avatar degli autori
category: Personalizzazione
order: 103
summary: Foto Gravatar dove esistono, un avatar generato dove non ci sono — e una faccia nella barra del titolo che reagisce al repository.
keywords: avatar gravatar blobatar autore foto immagine identicon faccia offline privacy email hash umore espressione animazione movimento triste arrabbiato contento
---

# Avatar degli autori

Un elenco di commit è un muro di nomi, e i nomi si leggono lentamente.
Un’immagine accanto a ciascuno trasforma «chi ha scritto questo» in qualcosa a cui
rispondi con un’occhiata. Gitcito ne mette una su ogni autore che mostra: nella
colonna autore del grafo, nei dettagli del commit accanto all’autore e a ogni
coautore, nel selettore di coautori mentre scrivi, nel commutatore di profili e
accanto a ogni profilo nelle Impostazioni.

## Da dove viene l’immagine

Due fonti, provate in quest’ordine:

| Fonte | Quando viene usata |
|---|---|
| **Gravatar** | L’email del commit ha un account Gravatar. Scaricata via HTTPS, in base a un hash SHA-256 dell’email in minuscolo. |
| **Avatar generato** | Tutto il resto — nessun Gravatar, nessuna rete, o ricerca disattivata. Disegnato localmente dall’email, mai scaricato. |

L’avatar generato è una piccola creatura, non un quadrato colorato: la stessa email
produce sempre la stessa forma e gli stessi colori, così un autore resta
riconoscibile fra repository e fra riavvii. Due email diverse praticamente non
collidono mai. È disegnato da [blobatar](https://github.com/Alain00/blobatar) (MIT)
e non richiede rete alcuna: un repository pieno di autori senza Gravatar ottiene
comunque un set completo di facce distinguibili, offline, al primo disegno.

Poiché il seme è l’**email del commit**, un autore che committa con due indirizzi
ottiene due avatar. È voluto — è lo stesso segnale che dà la colonna autore del
grafo, ed è di solito così che noti un account macchina o un `user.email`
configurato male. Correggilo con gli [attributi dell’autore](attributes.md) se i
due indirizzi sono davvero la stessa persona.

## La faccia nella barra del titolo

L’avatar accanto al nome del tuo profilo è l’unico avatar in Gitcito che
rappresenta **te, in questo repository, adesso** — quindi è l’unico che reagisce
allo stato del repository. Assume una di quattro facce:

| Faccia | Quando |
|---|---|
| 😠 Arrabbiata | Restano file in conflitto. |
| 🙁 Abbattuta | 10 o più commit in attesa di push, 25 o più indietro rispetto al remoto, o 25 o più modifiche non committate. |
| 🙂 Contenta | Niente in locale, niente in attesa, e un upstream con cui essere sincronizzati. |
| 😐 Neutra | Normale lavoro in corso — e prima che sia stato letto il primo stato. |

![L’avatar della barra del titolo con la sua faccia arrabbiata](../../screenshots/avatar-mood.webp)

Vince il peggio: un repository con conflitti *e* quaranta commit non inviati è
arrabbiato, non abbattuto. Passa il puntatore sull’avatar e il tooltip dice quale
conteggio ha causato la faccia — un’immagine che cambia senza motivo dichiarato è
un enigma, non un segnale.

Le soglie sono alte di proposito. Una faccia che si abbatte al primo commit non
inviato è abbattuta per sempre, e un segnale permanente è un segnale che si impara
a non leggere. Un branch senza upstream resta neutro invece che contento:
«sincronizzato» non è un’affermazione possibile per un branch che nessuno ha
inviato.

**Questa è decorazione, non strumentazione.** La barra di stato porta i conteggi
veri, ed è a lei che credere. La faccia dice soltanto *c’è qualcosa*, a
un’occhiata, in quattro gradini.

### Movimento

L’avatar della barra del titolo respira e sbatte le palpebre da sé. Disattivalo in
**Impostazioni → Temi → Grafo → Anima l’avatar del profilo** — l’espressione
continua a seguire il repository, smette soltanto di muoversi. Il movimento viene
inoltre saltato automaticamente se il sistema chiede movimento ridotto.

Si anima solo questo avatar. Un avatar animato va disegnato come SVG vivo invece
che come immagine in cache: bene per uno, uno spreco per le diverse centinaia che
un grafo disegna mentre scorre.

## Disattivare la ricerca

**Impostazioni → Temi → Grafo → Mostra avatar.**

Disattivato significa:

- nessuna richiesta a `gravatar.com`, mai — né differita, né messa in cache e
  ritentata;
- gli avatar continuano a comparire, tutti generati localmente.

Quindi è un interruttore di privacy, non un «nascondi le immagini». Non esiste
un’impostazione che rimuova del tutto gli avatar.

## I limiti

- **Una ricerca Gravatar dice a gravatar.com che quell’email è stata guardata.**
  L’hash non è un segreto: chi ha un’email candidata può calcolarlo e confrontarlo.
  Se l’elenco degli autori di un repository è qualcosa che preferisci non
  consegnare a terzi, disattiva la ricerca prima di aprirlo.
- **Solo Gravatar.** Gli avatar caricati su GitHub, GitLab o Bitbucket non vengono
  letti — servirebbe una chiamata autenticata all’API dell’host per ogni autore,
  troppa rete per una decorazione.
- **Nessuna sostituzione.** Non puoi fissare un’immagine scelta a un autore, né
  cambiare lo stile generato. L’avatar è una funzione dell’email e di nient’altro.
- **Una foto Gravatar non ha espressione.** Se l’email del tuo profilo ne ha una,
  la barra del titolo mostra la foto e nessuna faccia — una fotografia non può
  farti smorfie. Disattiva la ricerca se preferisci il blob espressivo.
- **La faccia segue solo il repository attivo.** In una scheda che non è un
  repository non c’è nulla a cui reagire, quindi resta neutra.
- **Quattro facce, non un pannello di controllo.** Non c’è una faccia per «rebase
  in corso», «HEAD scollegata» o «stash che si accumulano»: quattro posizioni sono
  tutto il vocabolario, e spenderle su distinzioni più fini renderebbe ogni lettura
  inaffidabile.
- **Piccolo è piccolo.** Nella colonna autore del grafo l’avatar è 16px, che porta
  colore e sagoma ma non dettaglio. I dettagli del commit disegnano l’autore a
  38px, ed è lì che la faccia si vede davvero.

**Vedi anche:** [Temi e aspetto](themes.md) · [Il grafo dei commit](graph.md) ·
[Attributi dell’autore](attributes.md) · [Profili](profiles.md)
