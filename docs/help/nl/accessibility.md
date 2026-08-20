---
title: Toegankelijkheid
category: Naar eigen smaak
order: 78
summary: Ondersteuning voor schermlezer en toetsenbord — wat gedekt is, en wat nog niet.
keywords: toegankelijkheid accessibility a11y schermlezer VoiceOver NVDA toetsenbordnavigatie focus aria contrast verminderde beweging
---

# Toegankelijkheid

Gitcito wil zonder muis bedienbaar zijn en leesbaar voor een schermlezer.
Deze pagina zegt wat dat concreet betekent — en waar de randen zitten.

## Toetsenbord

- **Tabbladen, zijbalkrijen, bestandslijsten en werkbalkmenu's** zijn
  focusbaar en activeer je met Enter of Space. Gesplitste knoppen
  (pull/push/stash) bieden hun dropdownpijl aan als een eigen focusbaar
  element.
- **De commitgrafiek** is één focusstop: geef hem focus en loop met
  omhoog/omlaag (of j/k) door de geschiedenis. De geselecteerde commit wordt
  aangekondigd met onderwerp, auteur en positie. Shift+F10 (of de menutoets)
  opent het contextmenu van de geselecteerde commit.
- **Contextmenu's** openen met focus: pijltjestoetsen bewegen, Enter
  activeert, ArrowRight/ArrowLeft gaan submenu's in en uit, Escape sluit.
- **Dialoogvensters** houden Tab binnen zichzelf, geven bij het sluiten de
  focus terug aan waar je was, en sluiten met Escape.
- Het **commandopalet** (Cmd/Ctrl+K) is een combobox: resultaten worden
  aangekondigd terwijl je typt en terwijl je er met de pijltjes doorheen
  gaat.

## Schermlezers

- Elk dialoogvenster wordt aangekondigd met zijn titel. Toasts — het
  feedbackkanaal van de app — zijn live regions: successen melden zich
  beleefd, fouten onderbreken.
- Voortgang (klonen, downloaden van een update) is beschikbaar als
  voortgangsbalk met percentage, en bezig-toestanden ("Ophalen…") kondigen
  zichzelf aan.
- Bestandsstatus wordt uitgesproken ("Toegevoegd", "Gewijzigd", "Conflict"),
  niet alleen getoond als een gekleurd teken.
- Het venster is gestructureerd met landmarks (banner, main, zijbalk,
  statusbalk), dus navigatie op landmarks werkt.

## De grenzen, zonder omwegen

- **De terminal** is xterm.js en erft diens schermlezerverhaal, en dat is
  zwak. Behandel hem als een oppervlak voor ziende gebruikers; elke
  git-operatie die hij biedt bestaat ook als UI-actie.
- **Cosmos (3D-geschiedenis), de banen van de commitgrafiek en beeld-diffs**
  zijn visueel van aard. De data erachter — de commitlijst, de
  bestandslijsten — is toegankelijk; het beeld zelf niet.
- **Slepen** (stappen van een interactieve rebase herordenen, branches slepen
  om te mergen) is alleen met de aanwijzer waar dat vermeld staat; elke
  sleepactie heeft een menu- of knopequivalent.
- De audit achter deze pagina is gedaan met VoiceOver op macOS. NVDA/JAWS op
  Windows zouden zich hetzelfde moeten gedragen, maar zijn niet in de
  praktijk getest — meldingen zijn welkom als
  [issues](https://github.com/MyAppDesk/gitcito/issues).

## Verwante instellingen

**Verminderde beweging** wordt overgenomen van de systeeminstelling —
animaties vallen terug op directe overgangen. Het themacontrast is per thema
af te stellen in [Instellingen → Uiterlijk](themes.md).
