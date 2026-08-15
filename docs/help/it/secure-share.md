---
title: Condivisione sicura
category: Sicurezza
order: 72
summary: Sposta impostazioni, voci della cassaforte o un'intera area di lavoro fra macchine.
keywords: condivisione sicura secure share esporta importa bundle cifrato impostazioni area di lavoro workspace trasferimento macchina
---

# Condivisione sicura

Mettere in piedi una macchina nuova di solito significa reinserire tutto. La
condivisione sicura impacchetta invece il tutto in un unico bundle cifrato.

![L'esportazione delle impostazioni di un repository come bundle cifrato](../../screenshots/secure-share.webp)

![La stessa esportazione per un'intera area di lavoro](../../screenshots/secure-workspace.webp)

## Cosa ci può stare dentro

| Sezione | Contenuto |
|---|---|
| **Impostazioni** | Temi, layout, scorciatoie, preferenze |
| **Cassaforte** | Segreti globali e per repository |
| **Repository** | I repository di un'area di lavoro, abbinati per remote o per cartella al momento dell'importazione |

I segreti vengono inclusi solo ed esclusivamente quando **spunti la casella**. Un
bundle senza quella spunta non contiene alcuna credenziale.

## Importare

La schermata di importazione mostra cosa c'è dentro **prima** di applicare
qualsiasi cosa, sezione per sezione, e i repository vengono abbinati a quelli che
hai già — prima per URL del remote, poi per cartella — così importare non
riclona il mondo daccapo.

**Vedi anche:** [Cassaforte](vault.md) · [Sicurezza e segreti](security.md)
