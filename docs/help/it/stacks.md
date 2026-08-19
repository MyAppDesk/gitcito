---
title: Branch impilate
category: Branch e chirurgia
order: 43
summary: Catene di branch dipendenti — restack a cascata e PR concatenate con un clic.
keywords: stack impilate branch graphite restack dipendenti catena genitore PR per livello submit invio autopilot pilota automatico retarget cambiare base
---

# Branch impilate

Uno stack è una catena di branch in cui ciascuno si costruisce su quello sotto:
`main → api → ui`. Rivedere tre PR piccole batte rivederne una enorme.

![Uno stack di branch](../../screenshots/branch-stack.webp)

Gitcito mostra lo stack dal basso verso l'alto con il numero di commit a ogni
livello. Ogni livello con una PR aperta porta il suo numero come chip — cliccalo
per aprire la PR.

## Invia lo stack come PR concatenate

**Invia lo stack come PR** fa in un clic quello che gli strumenti di stacking
fanno pagare:

1. Fa il push di ogni livello con `--force-with-lease` (i branch nuovi lo
   tollerano, quelli ristackati lo richiedono).
2. Apre una PR per ogni livello che ne è privo — ciascuna **basata sul branch
   genitore**, non su `main`, così ogni review mostra solo i propri commit.
   Titolo e descrizione vengono dai commit del livello stesso.
3. Cambia la base di qualsiasi PR esistente la cui base è andata alla deriva.
4. Scrive una **sezione di navigazione dello stack** nel corpo di ogni PR, così
   un reviewer su qualsiasi livello può vedere l'intera catena e dove si colloca
   questa PR al suo interno.

L'azione è **idempotente**: premila dopo ogni restack, nuovo livello o PR
mergiata e converge — niente viene duplicato, viene toccato solo ciò che è
andato alla deriva.

Quando la PR più in basso è stata **mergiata**, lo stesso pulsante ripulisce
dopo di lei: il figlio del livello mergiato viene riagganciato al trunk, il
livello smette di essere tracciato, il suo branch locale viene eliminato
(senza rischi — il trunk lo contiene in modo dimostrabile), la catena viene
ristackata e ogni PR rimasta cambia base. Fai il merge dal basso verso l'alto,
premi Invia, ripeti.

## Restack

Quando un branch più in basso cambia — hai sistemato i commenti della review su
`api` — ogni branch sopra di lui è adesso costruito sulla base sbagliata.
**Restack** fa il rebase a cascata dell'intera catena con `rebase --onto`, così
la riscrittura di un genitore non duplica i commit dentro i suoi figli. Dopo un
restack, premi di nuovo **Invia**: fa il force-push dei livelli riscritti e le
PR si aggiornano sul posto.

## Limiti

- Per ora l'invio è **solo per GitHub** (la creazione funziona su tutti e
  quattro gli host, ma il cambio di base e l'aggiornamento del corpo richiedono
  l'API di GitHub).
- La pulizia dopo il merge in basso vede i merge e i merge via rebase, non i
  merge con **squash**: una patch squashata è un commit nuovo che git non può
  ricondurre al branch, quindi per un livello mergiato con squash devi
  smettere di tracciarlo a mano. Fai prima anche il fetch — la pulizia legge
  il trunk com'era al tuo ultimo fetch.
- La sezione dello stack nel corpo di una PR è mantenuta tra marcatori
  nascosti — la tua descrizione sopra di essa viene preservata.

## Dove vivono i collegamenti

I collegamenti ai genitori sono conservati nella **configurazione git**
(`git config`), quindi viaggiano con il repository e sopravvivono a un nuovo
clone. Niente vive dentro un servizio.

**Vedi anche:** [Rebase interattivo](rebase.md) · [Hosting e pull request](hosting.md)
