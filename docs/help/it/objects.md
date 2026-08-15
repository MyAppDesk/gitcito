---
title: Esploratore di oggetti
category: Repository e cronologia
order: 16
summary: Percorri lo strato sotto il grafo — commit, tree, blob, tag e i ref che li puntano. Qui niente cambia niente.
keywords: oggetti objects esploratore blob tree commit tag ref plumbing cat-file ls-tree sha1 interni database rev-parse HEAD^{tree} loose packed
---

# Esploratore di oggetti

Git ha la fama di essere complicato. Quasi tutta questa fama nasce dal non vedere
mai il modello: **quattro tipi di oggetto, e puntatori**. Una volta che riesci a
cliccare un commit, atterrare sul suo tree e scoprire che il tuo file *è* un blob
a cui un tree ha dato un nome, la porcellana smette di essere magia.

`⌘K` → **Esploratore di oggetti**. Niente in questa pagina può cambiare un byte —
ogni chiamata dietro di essa è una lettura.

![I campi di un commit, con il suo tree e i suoi genitori come link, accanto all'elenco dei ref](../../screenshots/objects.webp)

## I quattro oggetti

| Oggetto | È | Sa |
|--------|----|-------|
| **blob** | Il *contenuto* di un file | Niente. Non il suo nome, non il suo percorso, non la sua storia |
| **tree** | L'elenco di una directory | Nomi, modi, e lo sha di ogni blob o tree figlio |
| **commit** | Una singola istantanea | Il suo tree, i suoi genitori, autore, committer, messaggio |
| **tag** | Un tag annotato | L'oggetto che punta, chi l'ha creato, un messaggio |

La sorpresa, per quasi tutti, è la prima riga. **Un blob non ha nome.** Due file
con contenuto identico ovunque nella tua storia sono lo stesso blob, memorizzato
una volta sola. Il nome vive nel tree che lo punta — ed è per questo che git
traccia contenuti e non file, e per questo che le rinomine vengono rilevate
invece che registrate.

Un **ref** — `refs/heads/main`, `refs/tags/v1.0`, `HEAD` — è solo un file che
contiene uno sha. È tutto qui il "creare branch costa niente".

## Camminare

La colonna di sinistra elenca ogni ref del repository, raggruppato come li
raggruppa git. Cliccane uno per atterrare sull'oggetto che nomina.

Da lì tutto è un link:

- Un **commit** mostra il suo `tree` e ogni `parent` — clicca per arrivare
  all'istantanea, o per risalire la storia un commit alla volta.
- Un **tree** elenca le sue voci con modo, tipo, sha e dimensione. Clicca un nome
  per aprire quel figlio.
- Un **blob** mostra il suo testo (l'inizio, per qualsiasi cosa di grande), o
  dice chiaramente quando è binario.
- Un **tag annotato** mostra cosa punta — clicca per arrivare al commit.

**Indietro** ripercorre i tuoi passi.

## Scrivere una revisione

La casella accetta tutto ciò che accetta `git rev-parse`, ed è qui che questa
smette di essere una vista e diventa un modo per imparare:

| Scrivi questo | Per ottenere |
|-----------|--------|
| `HEAD` | Il commit corrente |
| `HEAD~3` | Tre commit indietro |
| `HEAD^{tree}` | Il tree di quel commit, sbucciato |
| `HEAD:src/app.ts` | Il blob di quel percorso, direttamente |
| `v1.0^{}` | Ciò che un tag annotato punta, invece dell'oggetto tag |
| `a1b2c3d` | Qualsiasi oggetto, per sha — le abbreviazioni funzionano |

Vale la pena conoscere le cifre dei modi in un elenco di tree: `100644` un file,
`100755` eseguibile, `040000` un sottoalbero, `120000` un link simbolico,
`160000` un gitlink di sottomodulo — e quest'ultimo è tutto ciò che un
sottomodulo memorizza.

## Limiti da conoscere

- **In sola lettura, apposta.** Qui non c'è niente con cui scrivere. Costruire
  oggetti a mano è un esercizio di `git hash-object`, e appartiene a un
  terminale.
- **I blob grandi vengono troncati** dopo i primi 200 KB — abbastanza per vedere
  di cosa si tratta, non abbastanza da bloccare la finestra.
- **Le dimensioni sono quelle del contenuto dell'oggetto** come le riporta
  `git cat-file -s`, non quello che costa su disco dopo l'impacchettamento. Per
  quello, vedi [manutenzione](maintenance.md).
- **Gli oggetti irraggiungibili restano oggetti.** Incolla uno sha da un report
  di oggetti penzolanti di `git fsck` e si apre, che spesso è il modo più rapido
  per vedere cosa conteneva un commit perduto prima di decidere se recuperarlo.

Vedi anche: [Il grafo](graph.md) · [Manutenzione del repository](maintenance.md) ·
[Recupero](recovery.md)
