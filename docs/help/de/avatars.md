---
title: Autor-Avatare
category: Anpassen
order: 103
summary: Gravatar-Fotos, wo es sie gibt, ein generierter Avatar, wo nicht — und ein Gesicht in der Titelleiste, das auf das Repository reagiert.
keywords: avatar avatare gravatar blobatar autor foto bild identicon gesicht offline datenschutz e-mail hash stimmung ausdruck animation bewegung traurig wütend froh
---

# Autor-Avatare

Eine Commit-Liste ist eine Wand aus Namen, und Namen liest man langsam. Ein Bild
neben jedem macht aus „wer hat das geschrieben“ eine Frage, die man mit einem Blick
beantwortet. Gitcito gibt jedem angezeigten Autor eines: in der Autorenspalte des
Graphen, in den Commit-Details neben Autor und jedem Co-Autor, in der Co-Autoren-
Auswahl beim Schreiben, im Profilwechsler und neben jedem Profil in den
Einstellungen.

## Woher das Bild kommt

Zwei Quellen, in dieser Reihenfolge probiert:

| Quelle | Wann sie genutzt wird |
|---|---|
| **Gravatar** | Die Commit-E-Mail hat ein Gravatar-Konto. Über HTTPS geholt, anhand eines SHA-256-Hashes der kleingeschriebenen E-Mail. |
| **Generierter Avatar** | Alles andere — kein Gravatar, kein Netz, oder die Abfrage ist aus. Lokal aus der E-Mail gezeichnet, nie geladen. |

Der generierte Avatar ist ein kleines Wesen, kein farbiges Quadrat: dieselbe
E-Mail ergibt immer dieselbe Form und dieselben Farben, also bleibt ein Autor über
Repositorys und Neustarts hinweg erkennbar. Zwei verschiedene E-Mails kollidieren
praktisch nie. Gezeichnet wird er von
[blobatar](https://github.com/Alain00/blobatar) (MIT), und er braucht überhaupt
kein Netz — ein Repository voller Autoren ohne Gravatar bekommt trotzdem einen
vollständigen Satz unterscheidbarer Gesichter, offline, beim ersten Zeichnen.

Weil der Startwert die **Commit-E-Mail** ist, bekommt ein Autor, der unter zwei
Adressen committet, zwei Avatare. Das ist Absicht — es ist dasselbe Signal, das die
Autorenspalte des Graphen gibt, und so fällt einem meist ein Maschinenkonto oder
eine falsch gesetzte `user.email` auf. Korrigiere es mit
[Autor-Attributen](attributes.md), wenn die zwei Adressen wirklich eine Person sind.

## Das Gesicht in der Titelleiste

Der Avatar neben deinem Profilnamen ist der einzige Avatar in Gitcito, der für
**dich, in diesem Repository, jetzt** steht — also der einzige, der auf den Zustand
des Repositorys reagiert. Er trägt eines von vier Gesichtern:

| Gesicht | Wann |
|---|---|
| 😠 Wütend | Dateien sind noch in Konflikt. |
| 🙁 Bedrückt | 10 oder mehr Commits warten auf den Push, 25 oder mehr hinter dem Remote, oder 25 oder mehr nicht committete Änderungen. |
| 🙂 Zufrieden | Nichts Lokales, nichts Wartendes, und ein Upstream, mit dem man synchron sein kann. |
| 😐 Neutral | Normale Arbeit in Gang — und bevor der erste Status gelesen wurde. |

![Der Avatar der Titelleiste mit seinem wütenden Gesicht](../../screenshots/avatar-mood.webp)

Das Schlimmste gewinnt: ein Repository mit Konflikten *und* vierzig ungepushten
Commits ist wütend, nicht bedrückt. Beim Überfahren des Avatars nennt der Tooltip
die Zahl, die das Gesicht verursacht hat — ein Bild, das sich ohne genannten Grund
ändert, ist ein Rätsel und kein Signal.

Die Schwellen sind absichtlich hoch. Ein Gesicht, das beim ersten ungepushten
Commit bedrückt wird, ist dauerhaft bedrückt, und ein dauerhaftes Signal ist eines,
das man zu übersehen lernt. Ein Branch ohne Upstream bleibt neutral statt zufrieden:
„synchron“ ist keine Aussage, die man über einen Branch treffen kann, den niemand
gepusht hat.

**Das ist Dekoration, keine Messtechnik.** Die Statusleiste trägt die echten
Zahlen, und ihr ist zu glauben. Das Gesicht sagt nur *da ist etwas*, auf einen
Blick, in vier Stufen.

### Bewegung

Der Avatar in der Titelleiste atmet und blinkt von sich aus. Abschalten unter
**Einstellungen → Themes → Graph → Profil-Avatar animieren** — der Ausdruck folgt
weiter dem Repository, er bewegt sich nur nicht mehr. Bewegung wird außerdem
automatisch übersprungen, wenn dein System reduzierte Bewegung verlangt.

Nur dieser eine Avatar animiert. Ein animierter Avatar muss als lebendes SVG
gezeichnet werden statt als zwischengespeichertes Bild — in Ordnung für einen,
Verschwendung für die mehreren Hundert, die ein scrollender Graph zeichnet.

## Die Abfrage abschalten

**Einstellungen → Themes → Graph → Avatare anzeigen.**

Aus bedeutet:

- keine Anfrage an `gravatar.com`, niemals — nicht verzögert, nicht
  zwischengespeichert-und-wiederholt;
- Avatare erscheinen weiter, alle lokal generiert.

Das ist also ein Datenschutzschalter, kein „Bilder verstecken“. Es gibt keine
Einstellung, die Avatare ganz entfernt.

## Die Grenzen

- **Eine Gravatar-Abfrage verrät gravatar.com, dass diese E-Mail angesehen wurde.**
  Der Hash ist kein Geheimnis: wer eine Kandidaten-E-Mail hat, kann sie hashen und
  vergleichen. Wenn die Autorenliste eines Repositorys nichts ist, das du einem
  Dritten geben willst, schalte die Abfrage ab, bevor du es öffnest.
- **Nur Gravatar.** Avatare, die du auf GitHub, GitLab oder Bitbucket hochgeladen
  hast, werden nicht gelesen — das bräuchte pro Autor einen authentifizierten
  API-Aufruf beim Host, viel Netz für eine Dekoration.
- **Keine Überschreibungen.** Du kannst kein gewähltes Bild an einen Autor heften
  und den generierten Stil nicht tauschen. Der Avatar ist eine Funktion der E-Mail
  und sonst nichts.
- **Ein Gravatar-Foto hat keinen Ausdruck.** Hat die E-Mail deines Profils eines,
  zeigt die Titelleiste das Foto und kein Gesicht — ein Foto kann keine Miene
  ziehen. Schalte die Abfrage ab, wenn du lieber den ausdrucksstarken Blob willst.
- **Das Gesicht folgt nur dem aktiven Repository.** In einem Tab, das kein
  Repository ist, gibt es nichts, worauf zu reagieren wäre — es bleibt neutral.
- **Vier Gesichter, kein Dashboard.** Es gibt kein Gesicht für „Rebase läuft“,
  „detached HEAD“ oder „Stashes stapeln sich“: vier Posen sind das ganze Vokabular,
  und sie für feinere Unterschiede auszugeben würde jede Lesung unzuverlässig
  machen.
- **Klein ist klein.** In der Autorenspalte des Graphen ist der Avatar 16px groß,
  was Farbe und Silhouette trägt, aber kein Detail. Die Commit-Details zeichnen den
  Autor mit 38px, und dort sieht man das Gesicht wirklich.

**Siehe auch:** [Themes & Erscheinungsbild](themes.md) · [Der Commit-Graph](graph.md) ·
[Autor-Attribute](attributes.md) · [Profile](profiles.md)
