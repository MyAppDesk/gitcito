---
title: Changelog üreteci
category: Değişikliklerle çalışma
order: 34
summary: İki ref arasındaki conventional commit'leri gruplanmış bir changelog'a dönüştürür.
keywords: changelog değişiklik günlüğü sürüm notları release notes conventional commits üret generate CHANGELOG
---

# Changelog üreteci

Ona iki ref verin — varsayılanı **en son etiket → HEAD**'dir — ve aradaki
commit'leri Conventional Commit türüne göre gruplanmış bir changelog'a dönüştürsün.

![Changelog üreteci](../../screenshots/changelog-gen.webp)

- **Kırıcı değişiklikler** hangi türden gelmiş olursa olsun en başta gösterilir.
- Ardından Features, Fixes, Performance ve devamı.
- Hiçbir kurala uymayan commit'ler atılmak yerine **Other** altına iner —
  commit'leri sessizce yitiren bir changelog, dağınık olandan daha kötüdür.

Sonucu kopyalayın ya da **doğrudan `CHANGELOG.md`'nin başına ekleyin**.

> Bunu faydalı kılan şey, mesajlarınızı [Conventional stilinde](committing.md)
> yazmanızdır. Üreteç, okuduğu commit başlıkları kadar iyidir.

**Ayrıca bakınız:** [Commit'leme](committing.md) · [Hosting ve pull request'ler](hosting.md)
