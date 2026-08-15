---
title: Subtree'ler
category: Dallanma ve cerrahi
order: 49
summary: Başka bir depoyu bu deponun bir dizinine yerleştirin — dosyalar gerçekten orada, alt modül merasimi yok.
keywords: subtree git subtree vendor kütüphane gömme prefix split squash monorepo alt modül submodule alternatif pull push
---

# Subtree'ler

Bir subtree, başka bir depoyu sizin bir dizininize kopyalar. Ondan sonra dosyalar
**gerçekten oradadır**: düz bir `git clone` onları getirir, `git checkout` onları
başka her dosya gibi taşır ve dizinin başka bir yerden geldiğini kimsenin bilmesi
gerekmez.

[Alt modülden](lfs-sparse.md) tek farkı budur; alt modül yalnızca bir işaretçi
saklar ve düzgün gitmesi için `--recurse-submodules`, kendi checkout'u ve kendi
ayrık HEAD'i ister.

`⌘K` → **Subtree'ler**.

![Geçmişte bulunan, yerleştirilmiş bir dizin ve Gitcito'nun onun için hatırladığı kaynak](../../screenshots/subtree.webp)

## Kimsenin söylemediği püf noktası

**git, subtree'ler için hiçbir manifest tutmaz.** Bir alt modülün her url ve yolu
listeleyen `.gitmodules` dosyası vardır. Bir subtree'nin hiçbir şeyi yoktur —
yalnızca içe aktarmayı yapan commit üzerindeki bir `git-subtree-dir:` alt bilgisi.

Yani bir depo bir subtree içerebilir ve size onun nereden geldiğini öğrenmenin
hiçbir yolunu vermeyebilir. Gitcito elinden geleni yapar:

- Liste, o alt bilgiler okunarak geçmişten keşfedilir. Kim tarafından, hangi
  araçla eklenmiş olursa olsun her subtree görünür.
- **Kaynak depo ve ref**, Gitcito tarafından bu deponun git yapılandırmasında
  hatırlanır. Geçmişten keşfedilen bir subtree bu alanlar boş olarak başlar —
  bir kez doldurun, o andan itibaren pull ve push çalışır.

Hatırlanan değerler `.git/config` içinde `gitcito.subtree.*` altında yaşar;
yani depoyla birlikte kalır ama bir klona taşınmaz. **Unut** bunları temizler ve
başka hiçbir şeye dokunmaz.

## Bir tane eklemek

| Alan | Anlamı |
|-------|---------|
| Dizin | Nereye ineceği, örneğin `vendor/parser`. Henüz var olmamalı |
| Kaynak depo | Bir URL ya da diskteki bir yol |
| Dal veya etiket | Neyin içe aktarılacağı |
| Squash | Tüm geçmişi yerine tek bir commit olarak getir |

Bir nedeniniz yoksa **Squash'ı açık bırakın**. Açık bırakmazsanız kütüphanenin
her commit'i sonsuza dek sizin log'unuza karışır ve `git log` artık sizin
projeniz hakkında olmaktan çıkar.

## Onunla yaşamak

| Eylem | Ne çalıştırır |
|--------|--------------|
| **Pull** | `git subtree pull` — upstream değişiklikleri dizininize bir merge olarak iner |
| **Push** | `git subtree push` — o dizin altındaki yerel değişiklikleriniz kaynağa geri gider |
| **Split** | `git subtree split -b <branch>` — dizinin kendi geçmişini, dosyalar kökte olacak şekilde bir dala çıkarır |

Bilmeye asıl değen **Split**'tir: yerleştirilmiş bir dizini yeniden bağımsız bir
deponun geçmişine dönüştürür; bir subtree'nin subtree olmaktan çıkma yolu budur.

## Bilmeye değer sınırlar

- **Push yavaştır.** Dizinin geçmişini her seferinde sıfırdan yeniden hesaplar.
  Büyük bir depoda bu anlık değil, saniyeler ya da dakikalar sürer ve Gitcito
  yalnızca bekleyebilir.
- **Bir pull bir merge'dür**, dolayısıyla her merge gibi çakışabilir — [çakışma
  çözücüde](conflicts.md) bulursunuz kendinizi.
- **`git subtree` bir contrib betiğidir**, git'in yerleşik komutu değil. Kırpılmış
  bir git kurulumunda bulunmayabilir; Gitcito bunu "'subtree' is not a git
  command" mesajını olduğu gibi aktarmak yerine açıkça söyler.
- **Squash'lanmış geçmiş sonradan geri açılamaz.** O commit'ler hiç içe
  aktarılmamıştır.
- Gitcito bir alt modülü subtree'ye ya da tersine dönüştürmez.

Ayrıca bakınız: [Birleştirme ve rebase](merging.md) · [Arayüzlü tesisat](lfs-sparse.md)
