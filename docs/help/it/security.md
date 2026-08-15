---
title: Sicurezza e segreti
category: Sicurezza
order: 70
summary: Mascheramento, protezioni, il portachiavi — e cosa Gitcito si rifiuta di fare.
keywords: sicurezza segreti mascheramento portachiavi keychain safeStorage token branch protetto file grande protezione privacy
---

# Sicurezza e segreti

Gitcito **non ha backend**. Le uniche chiamate di rete vanno al tuo host Git e,
se lo attivi, al tuo provider AI.

![Le impostazioni di sicurezza](../../screenshots/settings-security.webp)

## Mascheramento dei segreti

I valori dentro `.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials.*` e simili
vengono mostrati come `KEY=••••••` nelle viste diff, file e blame, così una
condivisione dello schermo o uno screenshot non possono farli trapelare.

È **solo visuale**: non cambia mai il file e non cambia mai quello che metti in
stage. Un interruttore a forma di occhio li rivela per singola vista.
`.env.example`, `.sample` e `.template` sono trattati come modelli, non come
segreti.

![Un .env mostrato con ogni valore mascherato, e l'interruttore per rivelarli](../../screenshots/secret-masking.webp)

## Protezioni prima che tu faccia danni

| Protezione | Quando |
|---|---|
| **File di segreti** | Quando committi qualcosa che sembra una credenziale — con un *Ignora e togli dal tracciamento* in un clic |
| **File grande** | Quando committi un blob fuori misura (soglia in Impostazioni → Sicurezza) |
| **Branch protetto** | Quando committi direttamente su `main`/`master`, o ci fai un force push |
| **Segreti tracciati** | Quando fai push di un repository che *traccia* un file di segreti — avvisato una volta per sessione |

## Il portachiavi di sistema

I token e le voci della [cassaforte](vault.md) sono cifrati con il portachiavi
del tuo sistema operativo (`safeStorage` di Electron), mai con una chiave dentro
il file delle impostazioni.

**Niente tocca il portachiavi finché non lo dici tu.** Prima ancora che possa
comparire la finestra di autorizzazione del sistema, Gitcito spiega cosa sta per
essere conservato, cosa non può fare (un'applicazione rilegge solo ed
esclusivamente la voce che ha creato lei — le tue altre password sono
irraggiungibili) e che dire di no va benissimo: in quel caso i token vivono in
memoria solo per la sessione, la cassaforte resta chiusa, e puoi attivarlo più
avanti in **Impostazioni → Sicurezza → Portachiavi di sistema**.

Un'installazione appena fatta effettua **zero** chiamate al portachiavi finché
non c'è davvero qualcosa da conservare.

## Condividere in sicurezza

La [condivisione sicura](secure-share.md) esporta impostazioni, voci della
cassaforte o intere aree di lavoro come **bundle cifrato** — i segreti vengono
inclusi solo ed esclusivamente quando spunti la casella.

**Vedi anche:** [Cassaforte](vault.md) · [Condivisione sicura](secure-share.md)
