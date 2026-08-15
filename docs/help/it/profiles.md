---
title: Profili
category: Personalizzazione
order: 101
summary: Identità e token separati per il lavoro e per tutto il resto.
keywords: profilo profili identità git user email token account cambia
---

# Profili

Un profilo mette insieme un'**identità Git** (nome ed email) con i suoi **token
di integrazione**. Cambi profilo e cambiano entrambi insieme — i commit sono
attribuiti correttamente e le chiamate API usano l'account giusto.

Utile quando la stessa macchina gestisce repository di lavoro e personali, o
quando hai due account GitHub.

![Un profilo: da un lato l'identità git, dall'altro i suoi token di integrazione](../../screenshots/settings-profiles.webp)

## Legame per repository

Un repository può essere **legato a un profilo**, così un fetch in background su
di lui si autentica sempre con l'account giusto — anche mentre stai guardando un
repository che appartiene all'altro.

I token vivono nel [portachiavi del tuo sistema operativo](security.md), mai nel
file delle impostazioni.

**Vedi anche:** [Sicurezza e segreti](security.md) · [Hosting](hosting.md)
