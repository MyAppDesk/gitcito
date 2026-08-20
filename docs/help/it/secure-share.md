---
title: Condivisione sicura
category: Sicurezza
order: 72
summary: Sposta segreti, note o un'intera area di lavoro fra macchine — o colleghi — come un unico file cifrato.
keywords: condivisione sicura secure share esporta export importa import bundle cifrato encrypted area di lavoro workspace trasferimento macchina team note struttura senza backend
---

# Condivisione sicura

Mettere in piedi una macchina nuova — o un collega nuovo — di solito significa
reinserire tutto. La condivisione sicura impacchetta invece il tutto in un unico
file `.gitcito` cifrato: le funzioni di squadra di Gitcito **non hanno alcun
backend**, quindi il file *è* il trasporto. Invialo come già invii i file; la
password viaggia a parte.

![L'esportazione delle impostazioni di un repository come bundle cifrato](../../screenshots/secure-share.webp)

![La stessa esportazione per un'intera area di lavoro](../../screenshots/secure-workspace.webp)

## Cosa ci può stare dentro

| Sezione | Contenuto |
|---|---|
| **Cassaforte** | I segreti della cassaforte globale (le voci di cassaforte per repository restano dove sono) |
| **File del repository** | File di configurazione e di segreti non tracciati, rimaterializzati agli stessi percorsi relativi all'importazione |
| **Struttura dell'area di lavoro** | La disposizione delle schede in sé — gruppi, colori, ordine — con i repository referenziati per URL del remote, mai per i tuoi percorsi locali |
| **Note sui commit** | Il `refs/notes/commits` di un repository, applicato all'importazione senza bisogno di accesso in scrittura ad alcun remote |

I segreti vengono inclusi solo ed esclusivamente quando **spunti la casella**.
Un bundle senza quella spunta non contiene alcuna credenziale. Le impostazioni
dell'app non viaggiano in un bundle — hanno la loro esportazione in JSON
semplice nelle Impostazioni.

## Importare

La schermata di importazione mostra cosa c'è dentro **prima** di applicare
qualsiasi cosa, sezione per sezione, e i repository vengono abbinati a quelli che
hai già — prima per URL del remote, poi per cartella — così importare non
riclona il mondo daccapo.

Una sezione **struttura dell'area di lavoro** ricrea l'area di lavoro con i
repository che hai già; quelli che ti mancano vengono elencati con il loro
remote, così puoi clonarli prima e poi reimportare — Gitcito qui non clona mai
al posto tuo. Una sezione **note sui commit** mostra in anteprima cosa
arriverebbe — nuove, identiche, diverse o agganciate a commit che non hai — e le
note diverse vengono sostituite solo se spunti **sovrascrivi**; non c'è alcun
merge di note divergenti.

**Vedi anche:** [Cassaforte](vault.md) · [Sicurezza e segreti](security.md) ·
[Note sui commit](notes.md) ·
[Aree di lavoro, schede e gruppi](workspaces.md)
