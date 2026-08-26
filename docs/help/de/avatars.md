---
title: Autor-Avatare
category: Anpassen
order: 103
summary: Gravatar-Fotos, wo es sie gibt, ein generierter Avatar, wo nicht — und ein Gesicht in der Titelleiste, das auf das Repository reagiert.
keywords: avatar avatare gravatar blobatar autor foto bild identicon gesicht offline datenschutz e-mail hash stimmung ausdruck animation bewegung traurig wütend froh nachdenklich erschrocken unsicher krank schläfrig detached Stash ruhend
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
des Repositorys reagiert. Er zieht ein Gesicht, wenn etwas los ist, und bleibt sonst
neutral.

![Der Avatar der Titelleiste mit seinem wütenden Gesicht](../../screenshots/avatar-mood.webp)

Worauf er reagiert, Schlimmstes zuerst: Dateien, die in Konflikt geblieben sind;
ein Merge, Rebase, Cherry-Pick oder Revert, dem git nie gesagt wurde, wie es zu
enden hat; ein losgelöster HEAD — alarmiert, wenn nicht committete Arbeit darunter
liegt, sonst nur unsicher; Commits, die sich ungepusht oder ungeholt stapeln;
Änderungen, die sich uncommittet stapeln; eine Stash-Schublade, die niemand
öffnet; und ein Repository, in dem seit einem Monat nichts gelandet ist.

Das Schlimmste gewinnt: ein Repository mit Konflikten *und* vierzig ungepushten
Commits trägt die Konflikte. Beim Überfahren des Avatars nennt der Tooltip genau,
was das Gesicht verursacht hat — ein Bild, das sich ohne genannten Grund ändert,
ist ein Rätsel und kein Signal. Zu lesen ist der Tooltip; das Gesicht bringt einen
nur dazu hinzusehen.

Die Schwellen sind absichtlich hoch. Ein Gesicht, das beim ersten ungepushten
Commit besorgt wird, ist dauerhaft besorgt, und ein dauerhaftes Signal ist eines,
das man zu übersehen lernt. Ein Branch ohne Upstream bleibt neutral statt zufrieden:
„synchron“ ist keine Aussage, die man über einen Branch treffen kann, den niemand
gepusht hat.

**Das ist Dekoration, keine Messtechnik.** Die Statusleiste trägt die echten
Zahlen, und ihr ist zu glauben. Das Gesicht sagt nur *da ist etwas*, auf einen
Blick.

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
- **Eine Lesung auf einmal.** Das Gesicht zeigt das eine Schlimmste, was es
  gefunden hat; ein Repository kann also auf mehrere Arten unordentlich sein und
  trotzdem einen einzigen Ausdruck tragen. Eine Statusliste ist es nicht — das ist
  Sache der Statusleiste und des Tooltips.
- **Klein ist klein.** In der Autorenspalte des Graphen ist der Avatar 16px groß,
  was Farbe und Silhouette trägt, aber kein Detail. Die Commit-Details zeichnen den
  Autor mit 38px, und dort sieht man das Gesicht wirklich.

**Siehe auch:** [Themes & Erscheinungsbild](themes.md) · [Der Commit-Graph](graph.md) ·
[Autor-Attribute](attributes.md) · [Profile](profiles.md)
