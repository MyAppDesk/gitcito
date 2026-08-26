---
title: TODO nel codice
category: Strumenti dello spazio di lavoro
order: 93
summary: Ogni TODO, FIXME e HACK che il codice si porta dietro, raggruppati per etichetta, per responsabile o per cartella.
keywords: todo fixme hack xxx note marcatore marcatori commento commenti albero etichetta responsabile assegnato cgm debito tecnico grep scansione
---

# TODO nel codice

Un TODO è una promessa che qualcuno ha fatto a sé stesso e poi ha perso. Si
scrive dove sta il problema, cioè esattamente dove nessuno torna a guardare, e
quando conta davvero chi l’ha scritto ha già cambiato squadra. Grep li trova, e
mille righe di output di grep equivalgono a non trovarli.

La scheda **TODO** del dock dell’analizzatore li legge tutti e poi fa ciò che
grep non sa fare: li raggruppa. Apri il dock dalla barra di stato o dalla
palette dei comandi (`TODO nel codice`) e passa alla seconda scheda.

La barra di stato conta i marcatori accanto agli errori e agli avvisi degli
analizzatori; un clic su quel contatore apre questa scheda.

![La scheda TODO, raggruppata per responsabile](../../screenshots/code-todos.webp)

## Che cosa conta come marcatore

Un’etichetta, dentro un commento, in un file che Git traccia o traccerebbe:

| Scritto | Letto come |
|---------|------------|
| `// TODO: spediscilo` | etichetta `TODO`, senza responsabile |
| `//todo spediscilo` | lo stesso — i due punti e lo spazio sono facoltativi |
| `# todo spediscilo` | lo stesso — non contano né le maiuscole né il linguaggio |
| `/* TODO(cgm): spediscilo */` | etichetta `TODO`, responsabile `cgm` |
| `-- TODO (CGM) spediscilo` | lo stesso responsabile: `cgm`, `(CGM)` e `[cgm]` sono una persona sola |
| `<!-- TODO: @cgm spediscilo -->` | di nuovo lo stesso |

Le etichette sono `TODO`, `FIXME`, `BUG`, `HACK`, `XXX`, `NOTE`, `OPTIMIZE`,
`REVIEW`, `REFACTOR`, `DEPRECATED`, `QUESTION`, `IDEA`, `WIP` e `TEMP`. Le prime
quattro sono colorate, perché «questo è rotto» e «questa è un’idea che ho avuto»
non devono somigliarsi in un elenco.

L’etichetta deve stare dopo un inizio di commento — `//`, `#`, `--`, `;`, `%`,
`/*`, `*`, `<!--`, `"""`. Nient’altro conta: `todo = [l for l in lines]` è
codice, e un pannello che segna un’assegnazione di variabile come debito è un
pannello di cui non ci si fida due volte. La stessa regola tiene fuori
dall’elenco una funzione chiamata `reviewNotes`.

## Il raggruppamento è la funzione

Quattro assi, un clic ciascuno:

| Raggruppa per | Risponde a |
|---------------|------------|
| **Etichetta** | Che tipo di debito si porta dietro questo repository? |
| **Responsabile** | Che cosa ha lasciato ciascuno — e che cosa c’è nel mucchio non assegnato? |
| **Cartella** | Quale angolo dell’albero sta marcendo? |
| **File** | L’elenco semplice, quando sai già dove stai andando. |

**Non assegnati** è un gruppo vero, non un avanzo: i marcatori su cui nessuno ha
messo il proprio nome sono quelli che nessuno raccoglie mai, e vederli contati è
esattamente il punto.

I chip delle etichette in alto filtrano l’elenco; lo fa anche un clic sul badge
del responsabile su una riga, e la ricerca, che confronta messaggio, file,
etichetta e responsabile. **Solo modificati** restringe ai file che hai
modificato senza ancora fare commit — l’ultimo controllo prima di un push,
quando un `// FIXME` lasciato un’ora fa sta per diventare permanente.

Un clic su una riga apre il file a quella riga.

## Che cosa non fa

- **Legge, non scrive mai.** Non c’è nessun «segna come fatto»: un TODO si chiude
  cancellando la riga e facendo commit. Per un elenco che Gitcito tiene per te
  vedi [todos](todos.md), che è tutt’altra cosa: note private che vivono
  nell’app, non nel codice.
- **I file ignorati vengono saltati**, `node_modules` compreso, qualunque cosa
  dicano le etichette al loro interno. I file non tracciati invece entrano: un
  marcatore scritto cinque minuti fa è quello che vale di più vedere.
- **Non sa distinguere un commento da una stringa.** Una riga
  `const banner = "// TODO"` per la scansione è un marcatore. Non ha un parser
  per quaranta linguaggi e non finge di averlo.
- **La scansione è un’istantanea.** Se modifichi un file il pannello conserva i
  numeri che aveva finché non riesegui la scansione; il pulsante di aggiornamento
  è tutta la storia.
- **Si ferma a 5.000 marcatori.** Un repository oltre quella soglia ha un
  problema di debito che nessun pannello risolverà.

## Dove viene eseguito

Un solo `git grep` sull’albero di lavoro: ecco perché impiega millisecondi dove
la scheda [Problemi](problems.md) impiega secondi. Non si compila nulla, non
entra in gioco alcuna toolchain, e la ricerca salta i binari e i percorsi
ignorati perché Git sa già quali sono.
