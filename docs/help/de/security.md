---
title: Sicherheit & Geheimnisse
category: Sicherheit
order: 70
summary: Maskierung, Wächter, der Schlüsselbund — und was Gitcito sich weigert zu tun.
keywords: sicherheit geheimnisse secrets maskierung masking schlüsselbund keychain safeStorage tokens geschützter branch protected branch große datei large file wächter guard privatsphäre
---

# Sicherheit & Geheimnisse

Gitcito hat **kein Backend**. Die einzigen Netzwerkaufrufe gehen an deinen
Git-Host und, falls du es einschaltest, an deinen KI-Anbieter.

![Sicherheitseinstellungen](../../screenshots/settings-security.webp)

## Geheimnisse maskieren

Werte in `.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials.*` und Verwandten
werden in Diff-, Datei- und Blame-Ansicht als `KEY=••••••` dargestellt, damit
ein geteilter Bildschirm oder ein Screenshot sie nicht ausplaudern kann.
Apple-Signaturmaterial zählt dazu: `*.mobileprovision`,
`*.provisionprofile`, `*.p12` und die `*.p8`-Schlüssel für App Store Connect.
Ein `*.cer` nicht — ein Zertifikat ist von Haus aus öffentlich.

Das ist **reine Anzeige**: Die Datei wird nie verändert, und was du stagest,
auch nicht. Ein Augen-Schalter deckt sie pro Ansicht auf. `.env.example`,
`.sample` und `.template` gelten als Vorlagen, nicht als Geheimnisse.

![Eine .env mit maskierten Werten und dem Schalter zum Aufdecken](../../screenshots/secret-masking.webp)

## Wächter, bevor du Schaden anrichtest

| Wächter | Wann |
|---|---|
| **Geheimnisdatei** | Du committest etwas, das nach einem Zugangsdatum aussieht — mit *Ignorieren & nicht mehr verfolgen* auf einen Klick |
| **Große Datei** | Du committest einen übergroßen Blob (Schwellwert unter Einstellungen → Sicherheit) |
| **Build-Müll** | `xcuserdata/`, `DerivedData/` oder eine `.DS_Store` committen — mit demselben *Ignorieren & aus der Versionierung nehmen* mit einem Klick |
| **Geschützter Branch** | Du committest direkt auf `main`/`master` oder erzwingst dort einen Push |
| **Getrackte Geheimnisse** | Du pushst ein Repository, das eine Geheimnisdatei *trackt* — einmal pro Sitzung gewarnt |

## Der Schlüsselbund des Betriebssystems

Tokens und [Tresor](vault.md)-Einträge werden mit dem Schlüsselbund deines
Betriebssystems verschlüsselt (Electron `safeStorage`), niemals mit einem
Schlüssel in der Einstellungsdatei.

**Nichts rührt den Schlüsselbund an, bevor du es sagst.** Noch bevor der
Berechtigungsdialog des Systems auftauchen kann, erklärt Gitcito, was gespeichert
wird, was es nicht kann (eine App liest immer nur den Eintrag zurück, den sie
selbst angelegt hat — deine anderen Passwörter sind unerreichbar) und dass Nein
sagen völlig in Ordnung ist: Tokens leben dann nur für die Sitzung im
Arbeitsspeicher, der Tresor bleibt zu, und du kannst es später unter
**Einstellungen → Sicherheit → Schlüsselbund des Betriebssystems** einschalten.

Eine frische Installation macht **null** Aufrufe an den Schlüsselbund, bis
tatsächlich etwas gespeichert werden muss.

## Sicher teilen

[Sicheres Teilen](secure-share.md) exportiert Einstellungen, Tresor-Einträge
oder ganze Workspaces als **verschlüsseltes Paket** — Geheimnisse kommen
ausschließlich dann hinein, wenn du das Häkchen setzt.

**Siehe auch:** [Tresor](vault.md) · [Sicheres Teilen](secure-share.md)
