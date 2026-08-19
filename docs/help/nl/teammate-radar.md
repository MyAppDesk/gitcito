---
title: Teamgenotenradar
category: Branches & ingrepen
order: 45
summary: Wie wat upstream verplaatste — en of het op je niet-gecommitte werk landt.
keywords: teammate radar teamgenotenradar remote activiteit activity upstream overlap dirty gewijzigde bestanden botsing collision wie raakte conflict fetch
---

# Teamgenotenradar

Je bewerkt `api.ts`. Iemand anders ook, op een branch waar je niet naar hebt
gekeken. De gebruikelijke manier om daarachter te komen is een mergeconflict
volgende week; de manier van de radar is een lijst, vandaag.

Alles wordt berekend uit je **laatste fetch** — remote-tracking refs, een
`merge-tree` in het geheugen, verder niets. Geen server, geen agent op de
machines van je teamgenoten, geen netwerk buiten de fetch die je toch al deed.

![Teamgenotenradar](../../screenshots/teammate-radar.webp)

## Wat een rij je vertelt

Voor elke remote branch met commits die jouw `HEAD` niet heeft:

| Kolom | Betekenis |
|--------|---------|
| Wie & wanneer | De laatste committer op die branch, en hoelang geleden |
| Commits / bestanden | Hoeveel er binnenkomt, en hoeveel bestanden het raakt |
| **Overlap** | Welke van die bestanden **op dit moment dirty zijn in je werkboom** — de rode pil |
| Risico | Of het mergen van die branch in `HEAD` zou conflicteren (dezelfde motor als de [conflictradar](conflict-radar.md)) |

Rijen sorteren op hoezeer ze met jou botsen: overlap eerst, dan voorspelde
conflicten, dan recentheid. Klap een rij uit voor de precieze bestandslijsten;
**Vergelijk** opent de volledige branchvergelijking.

## Wanneer hij zich meldt

Na elke fetch — handmatig of automatisch — scant de radar in stilte. Hij toont
alleen een toast wanneer upstream-commits bestanden raken die jij hebt gewijzigd
**en** die set sinds de laatste scan echt veranderd is. Geen dirty bestanden,
geen ruis: een schone werkboom kan nergens mee botsen.

## Grenzen

- Hij ziet wat de laatste fetch zag. Een teamgenoot die niet heeft gepusht is
  onzichtbaar — dit leest refs, geen gedachten.
- Overlap is op padniveau, niet op regelniveau: hetzelfde bestand raken is een
  waarschuwing, geen bewijs van een conflict. De kolom **Risico** is het
  antwoord op regelniveau, maar alleen tussen gecommitte toestanden.
- Branches die langer dan ~45 dagen stilliggen worden overgeslagen, en alleen
  de 30 meest recent bewogen worden gescand.

**Zie ook:** [Conflictradar](conflict-radar.md) · [Fetchen, pullen & pushen](syncing.md) · [Wat er veranderd is sinds](range-diff.md)
