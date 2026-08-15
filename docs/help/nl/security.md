---
title: Beveiliging & geheimen
category: Beveiliging
order: 70
summary: Maskeren, bewakingen, de sleutelhanger — en wat Gitcito weigert te doen.
keywords: beveiliging security geheimen secrets maskeren masking sleutelhanger keychain safeStorage tokens beschermde branch groot bestand bewaking privacy
---

# Beveiliging & geheimen

Gitcito heeft **geen backend**. De enige netwerkoproepen gaan naar je Git-host
en, als je dat aanzet, naar je AI-provider.

![Beveiligingsinstellingen](../../screenshots/settings-security.webp)

## Geheimen maskeren

Waarden in `.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials.*` en consorten
worden getoond als `KEY=••••••` in de diff-, bestands- en blameweergave, zodat
een gedeeld scherm of een schermafbeelding ze niet kan laten lekken.

Het is **alleen weergave**: het verandert het bestand nooit en verandert nooit
wat je staget. Een oogschakelaar onthult ze per weergave. `.env.example`,
`.sample` en `.template` worden als sjablonen behandeld, niet als geheimen.

![Een .env met elke waarde gemaskeerd, en de onthulschakelaar](../../screenshots/secret-masking.webp)

## Bewakingen voor je schade aanricht

| Bewaking | Wanneer |
|---|---|
| **Geheimenbestand** | Iets committen dat op een credential lijkt — met een *Negeren & untracken* in één klik |
| **Groot bestand** | Een te grote blob committen (drempel in Instellingen → Beveiliging) |
| **Beschermde branch** | Rechtstreeks naar `main`/`master` committen, of er een force-pushen |
| **Getrackte geheimen** | Een repository pushen die een geheimenbestand *trackt* — één waarschuwing per sessie |

## De OS-sleutelhanger

Tokens en [kluis](vault.md)-regels worden versleuteld met de sleutelhanger van je
besturingssysteem (Electron `safeStorage`), nooit met een sleutel in het
instellingenbestand.

**Er raakt niets de sleutelhanger tot jij het zegt.** Nog voor het eigen
toestemmingsvenster van het systeem kan verschijnen, legt Gitcito uit wat er
opgeslagen wordt, wat het niet kan (een app leest alleen ooit de regel terug die
het zelf aanmaakte — je andere wachtwoorden zijn onbereikbaar), en dat nee zeggen
prima is: tokens leven dan alleen in het geheugen voor die sessie, de kluis blijft
dicht, en je kunt het later aanzetten in **Instellingen → Beveiliging →
OS-sleutelhanger**.

Een verse installatie doet **nul** aanroepen naar de sleutelhanger tot er
werkelijk iets opgeslagen moet worden.

## Veilig delen

[Veilig delen](secure-share.md) exporteert instellingen, kluisregels of hele
workspaces als een **versleutelde bundel** — geheimen gaan alleen mee wanneer jij
het vakje aanvinkt.

**Zie ook:** [Kluis](vault.md) · [Veilig delen](secure-share.md)
