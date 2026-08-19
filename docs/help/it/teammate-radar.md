---
title: Radar dei colleghi
category: Branch e chirurgia
order: 45
summary: Chi ha mosso cosa a monte — e se atterra sul tuo lavoro non committato.
keywords: radar colleghi teammate radar attività remota remote activity upstream monte sovrapposizione overlap file modificati dirty collisione chi ha toccato conflitto fetch
---

# Radar dei colleghi

Stai modificando `api.ts`. Anche qualcun altro, su un branch che non hai mai
guardato. Il modo consueto di scoprirlo è un conflitto di merge la settimana
prossima; il modo del radar è una lista, oggi.

Tutto viene calcolato dal tuo **ultimo fetch** — ref remote-tracking, un
`merge-tree` in memoria, nient'altro. Nessun server, nessun agente sulle
macchine dei colleghi, nessuna rete oltre al fetch che stavi comunque facendo.

![Radar dei colleghi](../../screenshots/teammate-radar.webp)

## Cosa ti dice una riga

Per ogni branch remoto che ha commit che il tuo `HEAD` non ha:

| Colonna | Significato |
|--------|---------|
| Chi e quando | L'ultimo committer su quel branch, e quanto tempo fa |
| Commit / file | Quanto sta arrivando, e quanti file tocca |
| **Sovrapposizione** | Quali di quei file sono **modificati nel tuo albero di lavoro in questo momento** — la pillola rossa |
| Rischio | Se fondere quel branch in `HEAD` andrebbe in conflitto (lo stesso motore del [radar dei conflitti](conflict-radar.md)) |

Le righe sono ordinate per quanto collidono con te: prima la sovrapposizione,
poi i conflitti previsti, poi la recente attività. Espandi una riga per gli
elenchi esatti dei file; **Confronta** apre il confronto completo tra branch.

## Quando si fa sentire

Dopo ogni fetch — manuale o automatico — il radar fa una scansione silenziosa.
Mostra un toast solo quando i commit a monte toccano file che hai modificato
**e** quell'insieme è davvero cambiato dall'ultima scansione. Niente file
modificati, niente rumore: un albero di lavoro pulito non può collidere con
nulla.

## Limiti

- Vede ciò che ha visto l'ultimo fetch. Un collega che non ha ancora pushato è
  invisibile — qui si leggono ref, non pensieri.
- La sovrapposizione è a livello di percorso, non di riga: toccare lo stesso
  file è un avviso, non la prova di un conflitto. La colonna **Rischio** è la
  risposta a livello di riga, ma solo tra stati committati.
- I branch fermi da più di ~45 giorni vengono saltati, e vengono scansionati
  solo i 30 mossi più di recente.

**Vedi anche:** [Radar dei conflitti](conflict-radar.md) · [Fetch, pull e push](syncing.md) · [Cos'è cambiato da](range-diff.md)
