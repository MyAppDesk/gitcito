---
title: Signierte Commits
category: Wiederherstellung & Schutz
order: 61
summary: Signieren per GPG, SSH oder X.509, mit einem Verifikations-Badge pro Commit.
keywords: signieren signierung signing gpg ssh x509 verifiziert verified signatur signature badge vertrauen trust
---

# Signierte Commits

Schalte die Signierung pro Repository ein (**Einstellungen → Zahnrad des
Repos**): GPG, SSH oder X.509, mit dem Schlüssel deiner Wahl. Gitcito schreibt
`commit.gpgsign`, `gpg.format` und `user.signingkey` für dieses Repository —
dieselbe Konfiguration, die jedes andere Werkzeug auch liest.

| | |
|---|---|
| ![Signaturspalte, hell](../../screenshots/signed-commits-light.webp) | ![Signaturspalte, dunkel](../../screenshots/signed-commits-dark.webp) |

Der Graph bekommt dadurch eine eigene, frei verschiebbare **Signaturspalte**:

| Badge | Bedeutet |
|---|---|
| **Verifizierte Signatur** | Gute Signatur von einem Schlüssel, dem git vertraut |
| **Signiert — nicht verifiziert** | Signiert, aber der Schlüssel ist unbekannt oder nicht validiert |
| **Signatur abgelaufen** | Die Signatur oder ihr Schlüssel ist abgelaufen |
| *(nichts)* | Nicht signiert |

Auch Tags lassen sich signieren — siehe [Tags](tags.md).

**Siehe auch:** [Sicherheit & Geheimnisse](security.md)
