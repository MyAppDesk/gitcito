---
title: Rimuovere i file non tracciati
category: Lavorare con le modifiche
order: 35
summary: Una prova a vuoto di git clean — ogni percorso non tracciato, con la sua dimensione, i file ignorati a parte e il Cestino come destinazione predefinita.
keywords: clean git clean untracked non tracciati rimuovi elimina spazzatura build output ignorati gitignore dry run cestino trash node_modules dist pulizia
---

# Rimuovere i file non tracciati

Un albero di lavoro accumula file di cui git non ha mai preso copia: un appunto
al volo, un `debug-output.txt`, una `dist/` di una build fallita, un
`node_modules` di un branch che hai lasciato il mese scorso. Git ha un comando
per questo — `git clean` — ed è l'unica operazione git con **niente dietro**. Il
contenuto non è mai stato in un commit, quindi non c'è voce di reflog, non c'è
stash, non c'è annullamento e non esiste formula magica di `git` che lo riporti
indietro.

È per questo che è l'operazione che la gente lancia da terminale e poi rimpiange.
La versione di Gitcito ti mostra l'elenco completo prima che succeda qualsiasi
cosa.

`⌘K` → **Rimuovi i file non tracciati**.

![Percorsi non tracciati e ignorati elencati separatamente, ciascuno con la sua dimensione, prima che venga rimosso alcunché](../../screenshots/clean.webp)

## Cosa significa l'elenco

Ogni voce è un percorso che `git clean` potrebbe raggiungere, con la dimensione
su disco, in due gruppi:

| Gruppo | Cos'è | Selezionato di default |
|-------|-----------|---------------------|
| **Non tracciati** | Mai committati, non corrispondenti a `.gitignore` | Sì |
| **Ignorati** | Corrispondenti a `.gitignore` — output di build, cache, `.env` | **No** |

La separazione è tutto il punto. I percorsi ignorati di solito non valgono nulla
e ogni tanto sono l'unica copia di qualcosa che conta: un `.env` locale, un dump
di database, una fixture scaricata. Nulla che corrisponda a `.gitignore` viene
mai selezionato al posto tuo.

Una **directory** interamente non tracciata è una sola riga, non una riga per
file — `tmp/`, `dist/`, `node_modules/` — perché è la granularità con cui git le
rimuove, e un elenco di 40.000 file è un elenco che nessuno legge. La sua
dimensione è la somma di ciò che contiene.

Una cartella segnalata come **repository a sé** ha un proprio `.git`: un clone
che hai lasciato cadere dentro questo, o un esperimento che non hai mai
collegato. Git si rifiuta di rimuoverle (vorrebbe `-ff`, un flag che Gitcito non
offre) — il Cestino invece le prende.

## Cestino o eliminazione

**Sposta nel Cestino** è attivo di default e non passa affatto da git: i percorsi
finiscono nel Cestino di sistema, da dove puoi rimetterli a posto. È l'unica
strada che rimuove un repository annidato, e l'unica che sopravvive a una casella
spuntata per sbaglio.

Disattivarlo significa un vero `git clean -f -d -x` esattamente sui percorsi
selezionati, e ti chiede conferma mettendoti davanti il conteggio e la dimensione
totale. Da lì non si torna indietro.

## Limiti da conoscere

- **Solo file non tracciati.** Un file tracciato e modificato non è qui — quello
  è [Scarta](staging.md), che lo ripristina dall'indice o da HEAD.
- **L'elenco è limitato** ai primi 400 percorsi. Se un repository ne ha di più,
  rimuovi quelli elencati e premi **Riesamina** per il resto.
- **Le dimensioni delle directory sono approssimate** per alberi molto grandi: la
  scansione si ferma dopo 20.000 file, quindi un `node_modules` enorme può
  risultare più piccolo di quello che è. Non risulta mai più grande.
- **La scansione è un'istantanea.** Se una build scrive file mentre la finestra è
  aperta, premi **Riesamina** prima di rimuovere qualsiasi cosa.
- I percorsi vengono confrontati con l'elenco di file rimovibili di git prima che
  si tocchi qualcosa, quindi da questa finestra non si può rimuovere nulla di
  tracciato, nemmeno indicandolo per nome.

Vedi anche: [Staging e scarto](staging.md) · [Ignorare i file](hooks.md) ·
[Rimuovere un file dalla storia](history-purge.md)
