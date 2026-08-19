---
title: Yığılmış dallar
category: Dallanma ve cerrahi
order: 43
summary: Birbirine bağımlı dal zincirleri — kademeli yeniden yığma ve tek tıkla zincirlenmiş PR'lar.
keywords: yığın stack yığılmış dallar stacked branches graphite restack bağımlı dependent zincir chain ebeveyn parent seviye başına PR gönderme submit otopilot autopilot yeniden hedefleme retarget
---

# Yığılmış dallar

Yığın, her birinin altındakinin üzerine kurulduğu bir dal zinciridir:
`main → api → ui`. Üç küçük PR incelemek, tek bir devasa PR incelemekten iyidir.

![Bir dal yığını](../../screenshots/branch-stack.webp)

Gitcito yığını alttan üste doğru, her seviyedeki commit sayısıyla birlikte
gösterir. Açık bir PR'ı olan her seviye numarasını bir rozet olarak taşır —
PR'ı açmak için rozete tıklayın.

## Yığını zincirlenmiş PR'lar olarak gönderme

**Yığını PR olarak gönder**, yığınlama araçlarının para aldığı işi tek tıkla yapar:

1. Her seviyeyi `--force-with-lease` ile push eder (taze dallar bunu tolere
   eder, yeniden yığılmış olanlarsa buna muhtaçtır).
2. PR'ı olmayan her seviye için bir PR açar — her biri `main`e değil **kendi
   ebeveyn dalına dayanır**, böylece her inceleme yalnızca kendi commit'lerini
   gösterir. Başlık ve açıklama, seviyenin kendi commit'lerinden gelir.
3. Tabanı kaymış mevcut her PR'ı yeniden hedefler.
4. Her PR gövdesine bir **yığın gezinme bölümü** yazar; böylece herhangi bir
   seviyedeki inceleyici zincirin tamamını ve bu PR'ın zincirdeki yerini
   görebilir.

Eylem **idempotenttir**: her yeniden yığmadan veya yeni seviyeden sonra basın,
sonuç aynı noktaya yakınsar — hiçbir şey çoğaltılmaz, yalnızca kaymış olana
dokunulur.

## Yeniden yığma

Alttaki bir dal değiştiğinde — `api` üzerindeki inceleme yorumlarını
karşıladığınızda — onun üzerindeki her dal artık yanlış temelin üzerine kurulmuş
olur. **Yeniden yığ**, zincirin tamamını `rebase --onto` ile ardışık olarak rebase
eder; böylece bir ebeveynin yeniden yazılması commit'leri çocuklarına
kopyalamaz. Yeniden yığmadan sonra **Gönder**'e tekrar basın: yeniden yazılan
seviyeleri zorla push eder ve PR'lar yerinde güncellenir.

## Sınırlar

- Gönderme şimdilik **yalnızca GitHub** içindir (oluşturma dört barındırıcının
  hepsinde çalışır, ancak yeniden hedefleme ve gövde güncellemeleri GitHub
  API'sini gerektirir).
- En alttaki PR birleştikten sonra git eski zinciri görmeye devam eder:
  birleşen seviyenin **izlemesini kaldırın** (veya çocuğunun ebeveynini ana
  dala ayarlayın), yeniden yığın, gönderin. Alt birleşme temizliği henüz
  otomatik değildir.
- PR gövdesindeki yığın bölümü gizli işaretçiler arasında tutulur — onun
  üzerindeki kendi açıklamanız korunur.

## Bağlantılar nerede yaşar

Ebeveyn bağlantıları **git config** içinde saklanır, dolayısıyla depoyla birlikte
yolculuk eder ve yeniden klonlamadan sağ çıkar. Hiçbir şey bir serviste yaşamaz.

**Ayrıca bakınız:** [Etkileşimli rebase](rebase.md) · [Sunucular ve pull request'ler](hosting.md)
