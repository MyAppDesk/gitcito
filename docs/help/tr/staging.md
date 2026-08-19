---
title: Hazırlama
category: Değişikliklerle çalışma
order: 30
summary: Dosyanın tamamını, tek bir hunk'ı ya da tek tek satırları hazırlayın.
keywords: hazırlama staging stage unstage geri al discard hunk satır index kısmi
---

# Hazırlama

Commit panelinde üç liste vardır: **Çakışan**, **Hazırlanmamış** ve
**Hazırlanmış**. Her biri katlanabilir ve her biri onu açık mı bıraktığınızı
hatırlar.

![Hazırlanmamış bir diff ve yanındaki hunk ile dosya denetimleri](../../screenshots/line-staging.webp)

## Üç hassasiyet düzeyi

| Düzey | Nasıl |
|---|---|
| **Dosya** | Satırdaki ✚ işaretine tıklayın ya da birkaç satır seçip hepsini birden hazırlayın |
| **Hunk** | Diff'i açın ve hunk başlığındaki düğmeyi kullanın |
| **Satır** | Diff'in içinde satırları seçin ve tam olarak onları hazırlayın |

Satır bazlı hazırlama, hata ayıklama amaçlı bir `console.log`'u önce silmek
zorunda kalmadan commit'in dışında tutmayı pratik hâle getiren şeydir.

## Değişiklikleri atma

Atma işlemi de aynı düzeylerde çalışır ve her zaman sorar. İzlenmeyen dosyalar
silinir; izlenenler hazırlanmış (ya da commit'lenmiş) hâline geri döner.

## Klavye

<kbd>↑</kbd> <kbd>↓</kbd> (ya da <kbd>j</kbd> <kbd>k</kbd>) dosya listelerinde
gezinir; aralık seçmek için <kbd>⇧</kbd>, tek tek dosyaları seçip bırakmak için
<kbd>⌘</kbd>/<kbd>Ctrl</kbd> kullanılır.

<kbd>⇧</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> seçimi en son tıkladığınız satırdan
genişletir. Seçime sağ tıklayarak içindeki her şeyi tek seferde stage'leyin,
stage'den çıkarın, stash'leyin ya da atın.

## Commit'lemeden önce

Gitcito birkaç şeyi denetler ve bir kez sorar, asla sessizce geçmez:

- **gizli bilgi** gibi görünen bir dosya (`.env`, `*.pem`, `id_rsa`…),
- **çok büyük** bir blob (eşik değeri Ayarlar → Güvenlik altında),
- doğrudan **korumalı bir dala commit'leme** (öntanımlı olarak `main`/`master`).

Bunların her biri tek tıkla bir *Yok say ve izlemeyi bırak* seçeneği sunar.
Bkz. [Güvenlik ve gizli bilgiler](security.md).

**Ayrıca bakınız:** [Commit'leme](committing.md) · [Diff'ler](diffs.md) · [Absorb](absorb.md)
