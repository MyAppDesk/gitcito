---
title: Yerel CI
category: Eşitleme ve çoklu depo
order: 58
summary: Deponun GitHub Actions iş akışlarını act ile yerelde çalıştırın — daha hiçbir şey push edilmeden.
keywords: yerel ci iş akışı çalıştırıcı konteyner boru hattı push öncesi test karar rozeti notlar commit başına local ci act actions workflow runner docker pipeline test before push nektos verdict badge notes per-commit
---

# Yerel CI

Push et–bekle–kırmızı çarpı–düzelt–push et döngüsü her turda on dakika harcar.
[act](https://nektosact.com) ile aynı iş akışları makinenizdeki Docker
konteynerlerinde çalışır ve onları Gitcito yönetir: bir iş akışı seçin,
Çalıştır'a basın, CI'ın basacağı logun aynısını izleyin — daha hiçbir şey
makinenizden ayrılmadan.

![Yerel CI](../../screenshots/local-ci.webp)

## Bir entegrasyon, paketlenmiş bir çalışma zamanı değil

Gitcito bilerek act veya Docker **içermez** — yanında bir konteyner çalışma
zamanı sürükleyen bir uygulama, git istemcisinin tam zıddıdır. Bu isteğe bağlı
bir entegrasyondur: **Ayarlar → Entegrasyonlar**'dan (veya diyaloğun
kendisinden) etkinleştirin; Gitcito neyin kurulu olduğunu algılar ve gerisi
için size yol gösterir — `brew install act`, çalışan bir Docker daemon'ı,
bitti. Üç koşul da sağlanana kadar hiçbir şey çalışmaz: etkin, act kurulu,
Docker erişilebilir.

## Ne yapar

- `.github/workflows` altındaki her iş akışını `name:` değeriyle listeler.
- **Çalıştır**, iş akışını act ile **çalışma ağacınıza** karşı yürütür —
  commit edilmemiş değişiklikleriniz dahil; mesele de tam olarak bu: push
  ettikten sonra değil, commit etmeden önce test edin.
- Çıktı diyaloğa canlı akar; **Durdur** çalıştırmayı sonlandırır. Çıkış kodu
  0 **Başarılı** gösterir, diğer her şey kodla birlikte **Başarısız**.

## Grafikte commit başına kararlar

![Grafikte Local-CI kararları](../../screenshots/local-ci-verdicts.webp)

Biten bir çalıştırma, sonucunu test ettiği commit'e iliştirir: küçük bir deney
şişesi grafikteki satırı **yeşil veya kırmızı** işaretler; böylece hangi
commit'lerin CI'dan yerelde zaten sağ çıktığını bir bakışta görürsünüz. Karar,
`refs/notes/gitcito-ci` altında bir git notu olarak saklanır — makinenize
özeldir, varsayılan olarak asla push edilmez.

Dürüstlük kuralı: karar yalnızca çalışma ağacınız **temizken** iliştirilir.
Commit edilmemiş değişiklikler üzerinde yapılan bir çalıştırma, hiçbir
commit'in içermediği bir şeyi test etmiştir; bu yüzden sonucunu diyalogda
gösterir ama hiçbir şeyi işaretlemez.

## Bir commit veya aralığı test et — dalınızdan ayrılmadan

Diyaloğun **Bir commit veya aralığı test et** bölümü, bir iş akışını üzerinde
*olmadığınız* commit'lere karşı çalıştırır. Her commit, sistemin geçici dizini
altında **tek kullanımlık bir worktree'ye detached olarak** checkout edilir,
act orada çalışır ve çalıştırma nasıl biterse bitsin worktree kaldırılır —
çalışma ağacınız ve dalınız asla yerinden oynamaz. Bu checkout yapısı gereği
tertemiz olduğundan, karar her zaman test ettiği commit'e iliştirilir.
Grafikte bir commit'e sağ tıklamak doğrudan **Bu commit üzerinde yerel CI
çalıştır** seçeneğini sunar.

Maliyet, bir şey çalışmadan önce söylenir, sonradan keşfedilmez: bir revizyon
veya aralık yazın (`main..HEAD`, `HEAD~5..`, bir sha), **Önizleme**'ye basın;
Gitcito, belirtimin kaç commit'le eşleştiğini ve en yeni hangi N commit'in —
50 ile sınırlı açık bütçe — gerçekten çalışacağını gösterir. Bir tarama
bunları **sırayla** çalıştırır (act artı Docker, paralel çalıştırmaların
makine için kavga edeceği kadar ağırdır), her çalıştırmanın logunu canlı
akıtır, her commit'i anında başarılı/başarısız olarak işaretler ve **Durdur**,
süren çalıştırmayı sonlandırıp commit'ler arasında iptal eder. Commit başına
gerçek dakikalar bekleyin.

Bilinmeye değer bir sınır daha: tek kullanımlık worktree, commit'in
dosyalarını içerir ama deponuzun alt modül checkout'larını içermez —
başlatılmış alt modüllere bağımlı bir iş akışı, onlar olmadan taze bir
klondaki gibi davranır.

## Sınırlar

- act, GitHub çalıştırıcılarının çok iyi bir taklididir ama kusursuz değildir:
  GitHub'ın barındırdığı hizmetlere, secret'lara veya sıra dışı çalıştırıcı
  imajlarına ihtiyaç duyan action'lar farklı davranabilir. Yerelde alınan bir
  yeşil güçlü bir kanıttır, garanti değil.
- Depo başına aynı anda tek çalıştırma; yenisini başlatmak ilkini iptal eder.
- Yalnızca iş akışı düzeyinde çalıştırma — tek tek job'ları, matrisleri veya
  event'leri seçmek act'in alanıdır; bayraklara ihtiyacınız olduğunda onu
  [tümleşik terminal](terminal.md)'de çalıştırın.
- İlk çalıştırma çalıştırıcı imajlarını indirir — bir kereliğine yavaş
  olmasını bekleyin.

**Ayrıca bakınız:** [Sunucular ve pull request'ler](hosting.md) · [Tümleşik terminal](terminal.md)
