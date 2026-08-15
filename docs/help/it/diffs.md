---
title: Diff e anteprime
category: Leggere le modifiche
order: 20
summary: Vista affiancata, evidenziazione a livello di parola, diff di immagini e anteprime dei file.
keywords: diff split affiancato side-by-side parola whitespace spazi immagine anteprima preview markdown docx pdf
---

# Diff e anteprime

## Leggere un diff

| Interruttore | Cosa fa |
|---|---|
| **Unificato ↔ affiancato** | Affiancato quando vuoi confrontare, impilato quando vuoi leggere |
| **A livello di parola** | Evidenzia solo i token cambiati dentro una riga modificata — rosso sul vecchio, verde sul nuovo |
| **Ignora gli spazi** | Nasconde le reindentazioni così emerge la modifica vera |
| <kbd>⌘F</kbd> | Cerca dentro il diff, con avanti/indietro |

![Diff affiancato con evidenziazione a livello di parola](../../screenshots/split-diff.webp)

Sopra ogni diff sta il [riepilogo semantico](semantic-diff.md) — cos'è cambiato,
simbolo per simbolo, invece che riga per riga.

## Diff di immagini

Le immagini modificate ottengono un confronto vero: affiancate, oppure con una
maniglia da trascinare fra il prima e il dopo.

![Diff di immagini](../../screenshots/image-diff.webp)

## Anteprima di qualsiasi cosa

La modalità **Anteprima** renderizza il file invece di mostrarne il sorgente:
Markdown, Word (`.docx`), Excel (`.xlsx`), PDF, video, audio, immagini, e codice
con evidenziazione della sintassi per tutto il resto.

![Anteprima di un Markdown](../../screenshots/markdown-preview.webp)

## Scheda File

La scheda **File** della barra laterale sinistra naviga l'albero di lavoro vero e
proprio, con badge di stato sulle cartelle (aggiunto / modificato / eliminato)
che riassumono ciò che contengono.

![La scheda file con un'anteprima](../../screenshots/file-tree.webp)

![Badge sulle cartelle che sommano cosa è cambiato dentro ciascuna](../../screenshots/tree-badges.webp)

**Vedi anche:** [Diff semantico](semantic-diff.md) · [Staging](staging.md)
