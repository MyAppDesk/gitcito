---
title: Bir pull request'i önizleme
category: Eşitleme ve çoklu depo
order: 57
summary: Başkasının pull request'ini hiçbir şey commit'lemeden kendi makinenizde çalıştırın — fork'lardan gelenler dahil, her sunucuda.
keywords: önizleme preview pull request merge request PR MR fork yerelde checkout test deneme refs/pull refs/merge-requests pull-requests uzak dal remote branch
---

# Bir pull request'i önizleme

Tarayıcıda bir diff incelemek size kodun iyi okunup okunmadığını söyler.
Uygulamanın hâlâ açılıp açılmadığını söylemez. Bunu öğrenmek için dalı
çalıştırmanız gerekir — ve insanlar tam burada takılır, çünkü bir fork'tan gelen
pull request hiç klonlamadığınız, üstelik çoğu zaman push edemeyeceğiniz bir
depoda yaşar.

Yerelde önizleme bunu, çoğu kişinin hiç öğrenmesi gerekmeyen bir gerçekle çözer:
forge'lar her pull request'in head'ini **hedef depoda** sıradan bir git ref'i
olarak yayımlar. Fork'a erişilebilir olması gerekmez, API belirtecine ihtiyacınız
yoktur ve ikinci bir uzak depo eklenmez. Tek bir fetch ve kod diskinizdedir.

![Yerelde önizleme: uzak depoyu, pull request'i ve nasıl uygulanacağını seçin](../../screenshots/pr-preview.webp)

| Sunucu | PR head'inin bulunduğu yer |
|------|-------------------------|
| GitHub, GitHub Enterprise, Gitea, Forgejo, Gogs | `refs/pull/<n>/head` |
| GitLab (bulut ve kendi sunucunuzda) | `refs/merge-requests/<n>/head` |
| Bitbucket Cloud, Bitbucket Server | `refs/pull-requests/<n>/from` |
| Azure DevOps | `refs/pull/<n>/merge` |

Gitcito dördünü de tek bir `ls-remote` içinde yoklar; böylece tanımadığı ya da
kendi sunucunuzda duran bir forge, bu geleneklerden birine uyduğu sürece çalışır.

## Nasıl açılır

- Kenar çubuğundaki pull request listesi — herhangi bir girdideki ok düğmesi. Bu,
  yalnızca GitHub'da çalışan ayrıntı görünümünün aksine her sunucuda çalışır.
- Komut paleti: **Pull request'i yerelde önizle**.
- Bir pull request'in ayrıntı görünümünde, "tarayıcıda aç" düğmesinin yanında.

## Ona verdikleriniz

**Uzak depo** — pull request'in *karşı* açıldığı depo, normalde `origin`. Fork
değil.

**Pull request** — numara ya da yapıştırılmış bir tarayıcı adresi. `7`, `#7` ve
`https://github.com/owner/repo/pull/7` hepsi çalışır; GitLab, Bitbucket ve Azure
DevOps adres biçimleri de öyle. **Bul**'a basın; Gitcito, daha hiçbir şey
fetch edilmeden, çözdüğü ref'i ve işaret ettiği commit'i bildirir.

**Uzak dal** — bulunacak bir PR ref'i olmadığında kullanılacak ikinci sekme:
bunları yayımlamayan bir sunucu ya da yalnızca denemek istediğiniz bir dal. Dal
adını uzak depodaki hâliyle verin.

## Uygulamanın iki yolu

Hiçbiri commit yazmaz. Bu bilinçlidir — çekip gidemediğiniz bir önizleme,
önizleme değildir.

| Kip | Ne olur | Nasıl geri alınır |
|------|--------------|-----------------|
| **Yerel bir dal** | Ref kendi dalına (varsayılan `pr/7`) fetch edilir ve checkout edilir. Diğer dallarınıza dokunulmaz. | Geri alma, bulunduğunuz dala döner ve önizleme dalını siler. |
| **Commit'lemediğiniz bir birleştirme** | Ref, geçerli dala `--no-commit --no-ff` ile birleştirilir; birleşik ağaç hazırlanmış hâlde kalır, böylece derleyip test edebilirsiniz. | Geri alma birleştirmeyi iptal eder. |

Aynı pull request'i ikinci kez önizlemek aynı dalı yeniden kullanır ve onu yeni
head'e taşır — siz test ederken yazar bir düzeltme push ettiğinde işe yarar. O
dal zaten varsa Gitcito bunu söyler ve sıfırlamadan önce sorar, çünkü yalnızca
orada yaşayan herhangi bir commit kaybolurdu.

## Yapmayacakları

- **Sunucunun yayımlamadığı bir ref'i uyduramaz.** Bazı kendi sunucunuzdaki
  yapılandırmalar PR ref'lerini kapatır; bazı forge'larda hiç olmadı. Net bir
  "#n için ref yok" alırsınız ve çıkış yolu uzak dal sekmesidir.
- **Etiketleri fetch etmez.** Bir önizleme, başkasının etiket ad alanını sizin
  deponuza sürüklememelidir.
- **Birleştirme kipi temiz bir çalışma dizini ister.** Git, commit'lenmemiş
  çalışmanın üzerine birleştirmeyi reddeder; önce [stash](stashes.md) yapın.
- **Önizleme bir inceleme değildir.** Kodu makinenize koyar — hiçbir şeyi
  onaylamaz, yorumlamaz ya da birleştirmez. O
  [hosting ve pull request'ler](hosting.md) sayfasının işidir.
- **Özel fork'lar özel kalır.** PR ref'i hedef depo tarafından sunulur, dolayısıyla
  erişim *o* uzak depoya ait kimlik bilgilerinizi izler — bkz.
  [güvenlik](security.md).

## Temizlik

Önizleme dalı sıradan bir daldır: işiniz bitince kenar çubuğundan silin ya da
önizlemenin hemen ardından geri alma yapın. Commit'lenmemiş bırakılan bir
önizleme birleştirmesi geri almayla düşürülebilir; ya da sonuçta onu istediğinize
karar verdiyseniz çözülüp commit'lenebilir — ki o noktada önizleme olmaktan
çıkıp [bir birleştirmeye](merging.md) dönüşür.
