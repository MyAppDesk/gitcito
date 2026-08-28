---
title: Il grafo dei commit
category: Repository e cronologia
order: 10
summary: Leggere la storia: corsie, ref, colonne, filtri e selezione multipla.
keywords: grafo graph storia cronologia commit corsie lanes branch merge colonne filtro lineare first-parent correggi amend annulla undo reset github
---

# Il grafo dei commit

Branch, merge e merge a piovra disegnati come si deve, in chiaro o in scuro. Il
rendering è a finestra, quindi un repository con centomila commit scorre come uno
che ne ha cento.

| | |
|---|---|
| ![Grafo dei commit, tema chiaro](../../screenshots/graph-light.webp) | ![Grafo dei commit, tema scuro](../../screenshots/graph-dark.webp) |

## Muoversi

- <kbd>↑</kbd> <kbd>↓</kbd> (oppure <kbd>j</kbd> <kbd>k</kbd>) spostano la
  selezione.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+clic aggiunge o toglie un commit da una
  **selezione multipla**; <kbd>⇧</kbd>+clic prende un intervallo. Con più commit
  selezionati, il clic destro permette di fare cherry-pick sul branch corrente,
  fare squash di una sequenza contigua, esportare un'unica patch combinata o
  copiare i loro SHA.
- I commit arrivati con il tuo **ultimo fetch o pull** sono contrassegnati come
  nuovi. Quelli non ancora entrati nel branch attivo restano leggermente
  traslucidi finché un pull non li integra.
- Clic destro su un commit per **Correggi**, **Annulla**, **Reset al commit…** e
  **Apri su GitHub**, oltre a checkout, cherry-pick, revert, branch, tag e
  copia. Le azioni non sicure restano visibili e si disabilitano.

## Fargli mostrare quello che vuoi

- Il **focus del grafo** decide quanta storia viene disegnata — Impostazioni →
  Temi → **Grafo**, o il menu dell'ingranaggio nell'intestazione del grafo.
  *Tutto* disegna ogni cosa; *Cronologia lineare* (first-parent) lascia solo il
  tronco; *Nascondi i rami già uniti* tiene il tronco più i rami ancora aperti;
  *Modalità solo* tiene il tuo ramo, i rami preferiti e il ramo predefinito.

  Filtra soltanto ciò che il log ha già caricato. *Nascondi i rami già uniti* si
  fida della risposta di git a «già contenuto nel ramo corrente», quindi cambiare
  ramo cambia ciò che sparisce — e tiene ogni commit ancora puntato da un tag o
  da un riferimento che non riconosce, cioè proprio quello che lascia un ramo
  cancellato. *Cronologia lineare* e *Modalità solo* sono più drastiche: un tag o
  uno stash su un commit che nascondono sparisce con lui.

- **Filtra per percorso**: clic destro su un file o una cartella → *Filtra il
  grafo per questo percorso*, e restano accesi solo i commit che l'hanno toccato.

![Il grafo filtrato su un solo percorso](../../screenshots/graph-path-filter.webp)

- **Colonne**: mostra, nascondi, ridimensiona e riordina le colonne branch,
  messaggio, autore, data, SHA, firma e deploy.
- **Stile**: Impostazioni → Temi → **Grafo** — palette delle corsie (8 integrate,
  personalizzata o generata dall'AI), stile degli angoli, densità delle righe e
  spessore delle linee, con un mini-grafo di anteprima dal vivo.

![Le impostazioni di stile del grafo con anteprima dal vivo](../../screenshots/settings-graph.webp)

## Dettagli di un commit

Selezionando un commit vedi i suoi file modificati (ad albero o piatti),
l'autore, lo SHA, i coautori e la sua firma. I riferimenti `#123` e le
`@menzioni` diventano automaticamente link al tuo host.

L'elenco dei file si seleziona in gruppo con i gesti consueti (clic
<kbd>⌘</kbd>/<kbd>Ctrl</kbd>, clic <kbd>⇧</kbd>,
<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>). Clic destro sulla selezione →
*Ripristina {n} file nell'albero di lavoro* riprende quei file esattamente come
li aveva questo commit: dopo un'unica conferma sovrascrive le copie di lavoro,
senza toccare né HEAD né l'indice.

![Una passeggiata fra i dettagli dei commit](../../screenshots/clip-commit-details.webp)

**Vedi anche:** [Blame e cronologia del file](blame.md) · [Ricerca](search.md) · [Macchina del tempo](time-machine.md)
