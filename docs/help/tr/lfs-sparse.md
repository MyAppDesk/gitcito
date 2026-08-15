---
title: LFS, seyrek çıkarma ve yamalar
category: Eşitleme ve çoklu depo
order: 55
summary: Büyük dosyalar, kısmi çıkarmalar ve değişiklikleri dosya olarak taşımak.
keywords: lfs large file storage büyük dosya seyrek çıkarma sparse checkout cone kısmi klon partial clone yama patch am apply
---

# LFS, seyrek çıkarma ve yamalar

## Git LFS

![LFS yöneticisi](../../screenshots/lfs.webp)

`git-lfs` kurulu mu, bu depo onu kullanıyor mu ve hangi desenler izleniyor —
hepsini tespit eder. Dosya listesi neyin **indirilmiş**, neyin hâlâ bir
**işaretçi** olduğunu gösterir; oradan pull edebilir ya da budayabilirsiniz.

## Seyrek çıkarma

![Koni kipinde seyrek çıkarma](../../screenshots/sparse-checkout.webp)

Koni kipi: gerçekten üzerinde çalıştığınız üst düzey klasörleri işaretleyin,
geri kalanı geçmişte kalmaya devam ederken çalışma dizininizden çıksın. Yalnızca
iki paketin sahibi olduğunuz bir monorepo'da işe yarar.

Klonlarken bir **kısmi klon** (`--filter=blob:none`) seçeneği sunulur; böylece
hiç açmayacağınız blob'ları indirmezsiniz.

## Yamalar

- Bir commit'i (ya da çoklu seçimi) `.patch` olarak **dışa aktarın**.
- Bir yamayı çalışma dizinine (`git apply`) ya da commit olarak (`git am`)
  **uygulayın**.

İkisi de Araçlar menüsünden.

**Ayrıca bakınız:** [Çalışma ağaçları ve alt modüller](worktrees.md)
