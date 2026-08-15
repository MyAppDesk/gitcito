---
title: Mission control
category: Sincronizzazione e più repo
order: 51
summary: Ogni repository dell'area di lavoro su una sola schermata, i peggiori per primi.
keywords: mission control cruscotto dashboard tutti i repo panoramica stato sporco non pubblicati indietro area di lavoro workspace
---

# Mission control

Venti repository, e la domanda è sempre la stessa: quale ha bisogno di me?

Mission control risponde. Ogni repository dell'**area di lavoro attiva** su una
sola schermata, ordinato in base a chi ha davvero bisogno di te:

1. **Bloccato** — un rebase o un merge lasciato a metà, conflitti, un repo che
   non si riesce proprio a leggere.
2. **Da sincronizzare** — prima i commit da recuperare, poi quelli da pubblicare.
3. **In corso** — lavoro non committato, file non tracciati.
4. **Pulito** — quelli tranquilli, in fondo, dove è giusto che stiano.

![Ogni repository su una sola schermata, i peggiori per primi](../../screenshots/mission-control.webp)

## Cosa ti dice una riga

Branch e suo upstream · ↑avanti / ↓indietro · conteggi di file non committati e
non tracciati · stash · PR aperte (quando il repo è già caricato) · uno
**sparkline dei commit su 14 giorni** · quanto tempo è passato dall'ultimo commit.

Espandi una riga (con il chevron, o con <kbd>spazio</kbd>) per vedere esattamente
quali commit aspettano di essere pubblicati e quali file sono sporchi.

## Lavorare sull'elenco

- Le pillole di stato in cima sono **filtri** — clicca "3 bloccati" per vedere
  solo quelli.
- Ordina per **urgenza**, **nome** o **attività**.
- **Spunta più repo** per recuperarli, o fai pull solo su quelli indietro (il
  pulsante li conta per te).
- Si aggiorna da solo ogni 30 secondi finché resta aperto.

| Tasto | Azione |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> oppure <kbd>j</kbd> <kbd>k</kbd> | Scorri l'elenco |
| <kbd>Enter</kbd> | Apri quel repository |
| <kbd>f</kbd> / <kbd>p</kbd> | Fetch / pull su quel repo |
| <kbd>spazio</kbd> | Espandilo |
| <kbd>/</kbd> | Salta al filtro |

## È una vista, non una scheda

L'indicatore accanto al nome dell'area di lavoro la apre e la chiude; cliccando
una scheda qualsiasi torni al tuo lavoro. Non aggiunge mai una scheda propria, e
appartiene all'area di lavoro in cui sei — cambia area di lavoro e ottieni il
cruscotto di quell'area.

Leggerlo è **puramente locale**: un `git status` per repository, niente rete,
niente token. Aprire il cruscotto non autentica mai da nessuna parte. Il fetch è
sempre qualcosa che hai chiesto tu.

**Vedi anche:** [Aree di lavoro e schede](workspaces.md) · [Aree di lavoro, schede e gruppi](workspaces.md)
