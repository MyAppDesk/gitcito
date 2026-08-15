---
title: Rimuovere un file dalla storia
category: Branch e chirurgia
order: 48
summary: Togli una credenziale trapelata o un binario enorme da ogni commit — e capisci esattamente quanto costa.
keywords: purge storia riscrittura filter-branch bfg filter-repo segreto trapelato credenziale token rimuovi file blob grande rimpicciolire repository backup pre-purge ruotare sfoglia file più grandi
---

# Rimuovere un file dalla storia

`git rm` impedisce a un file di comparire nei commit *nuovi*. Non fa nulla a
quelli già fatti: il blob è ancora nel database degli oggetti, ancora in ogni
clone, ancora a un `git show` di distanza.

E questo conta due volte: quando il file era una credenziale, e quando pesava
400 MB.

`⌘K` → **Rimuovi un file dalla storia**, oppure clic destro sul file — nell'albero
del progetto, nell'elenco dei file di un commit o nel compositore di commit. Il
commit che ha *eliminato* un file è di solito il punto in cui uno si accorge che
è ancora nella storia, quindi la via d'uscita sta anche in quel menu.

## Trovare il percorso

Due modi di entrare, perché rispondono a domande diverse.

**Scrivilo** — relativo al repository, senza slash iniziale — quando sai già cosa
sei venuto a rimuovere.

**Sfoglia la storia** quando non lo sai. Elenca ogni percorso mai committato, dal
più pesante, con quante versioni ne esistono e se è ancora tracciato. I percorsi
eliminati sono segnalati come tali e di solito sono proprio quelli che ti
interessano: un file sparito dall'albero di lavoro ma ancora presente in ogni
clone è esattamente il caso che una normale finestra di selezione file non può
mostrarti, perché il file lì non c'è da selezionare.

Lo stesso elenco risponde all'altro motivo per cui si arriva qui — *perché questo
clone pesa due gigabyte* — visto che è ordinato per i byte realmente occupati dai
blob di ciascun percorso. Scegliendo una riga la misura parte subito.

![Ogni percorso mai committato, dal più pesante, con quelli eliminati segnalati](../../screenshots/history-purge-browse.webp)

## Misura prima di dare il consenso

Premi **Misura** (o scegli una riga). Non viene ancora scritto niente. Ottieni:

| | |
|---|---|
| **Commit riscritti** | Ogni commit dal primo che conteneva il file in poi |
| **Branch / tag** | I ref che si sposteranno |
| **Occupato dai suoi blob** | I byte realmente occupati da quelle versioni |
| **Primo commit** | Dove comincia la riscrittura — tutto quello che viene dopo prende un nuovo hash |

![La misurazione: commit riscritti, ref coinvolti, byte occupati e l'avviso a ruotare comunque il segreto](../../screenshots/history-purge.webp)

Se il conteggio è zero, il percorso è sbagliato. Di solito è un refuso o un
prefisso di directory, non un'assenza.

## Cosa fa davvero la riscrittura

Gitcito copia ogni branch e tag in
`refs/gitcito/pre-purge/<timestamp>/…`, poi esegue:

```sh
git filter-branch --force \
  --index-filter 'git rm --cached --ignore-unmatch -- <path>' \
  --prune-empty --tag-name-filter cat -- --branches --tags
```

`--index-filter` riscrive direttamente l'indice invece di fare il checkout di
ogni commit, ed è la differenza fra minuti e ore. `--branches --tags` invece di
`--all` è deliberato: `--all` includerebbe i ref di backup, e la riscrittura si
mangerebbe la propria rete di sicurezza.

I commit che non contenevano altro che il file rimosso vengono scartati
(`--prune-empty`). I tag vengono ripuntati sui loro commit riscritti.

## Il backup, e perché lo spazio non torna subito

La purga è annullabile, e il prezzo di questo è che **lo spazio su disco non
viene recuperato finché non lo dici tu**. Finché il backup esiste, i vecchi
commit restano raggiungibili, quindi git non li raccoglie.

| Azione | Effetto |
|--------|--------|
| **Ripristina** | Ogni branch e tag torna al suo commit precedente alla purga; il file torna con loro |
| **Elimina il backup** | Cancella i ref di backup, fa scadere il reflog, esegue `git gc --prune=now` — spazio restituito, purga ora definitiva |

Due passaggi invece di uno, perché il primo è la metà recuperabile e il secondo
no.

## Ruota comunque il segreto

**Se una credenziale è mai stata pubblicata, riscrivere la tua storia non la
rende non trapelata.** Qualcuno può averla recuperata; i server delle forge
tengono in giro oggetti non referenziati; un log di CI può averla stampata. La
riscrittura le impedisce di diffondersi oltre — non annulla l'esposizione.

Ruota la chiave. Poi purga, così chi clonerà dopo non la troverà.

## Cosa non farà

- **Non farà push.** La riscrittura è locale. Pubblicare il risultato significa
  un force push su ogni branch coinvolto, e tutti gli altri dovranno riclonare o
  fare un hard reset — la decisione vive nella
  [protezione contro il force push](syncing.md).
- **Si rifiuta con un albero di lavoro sporco** o a metà di un merge o rebase.
  Una riscrittura sposta HEAD ripetutamente, e farlo attorno a lavoro non
  committato è il modo in cui lo si perde.
- **Riscrive per percorso, non per contenuto.** Rimuovere un segreto incollato
  dentro un file sorgente, invece che residente in un file suo, richiede un
  filtro sul contenuto — è territorio di `git filter-repo --replace-text`, e
  Gitcito non lo incapsula.
- **`filter-branch` è lento su storie molto grandi.** È ciò che viene distribuito
  con git ovunque, ed è per questo che è ciò che Gitcito usa. Su un repository
  con decine di migliaia di commit, `git filter-repo` nel
  [terminale](terminal.md) è lo strumento più veloce.
- **I cloni degli altri non sono il tuo repository.** Conservano la vecchia
  storia finché non riclonano.
