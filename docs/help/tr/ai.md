---
title: Yapay zekâ özellikleri
category: Yapay zekâ
order: 80
summary: İsteğe bağlı, sağlayıcıdan bağımsız ve gerçek kodunuza dayalı.
keywords: yapay zekâ yerel model commit mesajı açıklama inceleme ai openai anthropic ollama local llm commit message explain review wiki grounded hesaplar hesap api anahtarı abonelik cli claude codex gemini modeller
---

# Yapay zekâ özellikleri

Her yapay zekâ özelliği **isteğe bağlıdır** ve siz bir sağlayıcı
yapılandırana kadar kapalıdır. Siz belirli bir şey istemeden hiçbir yere
hiçbir şey gönderilmez.

![Yapay zekâ ayarları](../../screenshots/settings-ai.webp)

## Hesaplar

**Hesap**, bir modele ulaşmanın bir yoludur: bir sağlayıcı, ona nereden
erişileceği ve nasıl kimlik doğruladığı. Birden çok hesap kurabilirsin ve bir
arada yaşarlar — bir iş anahtarı, bir kişisel anahtar, yerel bir model, zaten
oturum açtığın bir CLI.

Hazır ayarlar **OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, Mistral** ve
**Ollama** (tamamen yerel) ile birlikte OpenAI uyumlu her uç noktayı kapsar.

Anthropic, OpenAI biçimli bir çağrı yerine kendi `/v1/messages` API'sini
kullanır; böylece Claude modelleri yalnızca çalışıyor gibi görünmek yerine
gerçekten çalışır. Gemini'ye Google'ın OpenAI uyumlu uç noktası üzerinden
ulaşılır.

### API anahtarı yerine abonelik kullanmak

Bu makinede kurulu ve oturumu açık bir aracı CLI ile cevap almak için **Yerel
CLI** sağlayıcısını seç — `claude`, `gemini` ya da `codex`. Gitcito ikili dosyayı
isteminle çalıştırır ve cevabını okur; yapıştırılacak bir API anahtarı yoktur,
saklanan bir belirteç de.

Gitcito yalnızca hesap olarak senin tanımladığın komutu çalıştırır ve bunu her
zaman kabuk yerine bir argüman listesiyle yapar; böylece bir diff'teki ya da dal
adındaki hiçbir şey komut olarak yorumlanamaz.

> **Bu, API anahtarından daha gizli değildir.** İstemlerin yine aynı sağlayıcıya,
> kendi hesabının altında, anahtarla olduğu gibi ulaşır. Değişen şey faturalama
> ve kurulumdur, metnin nereye gittiği değil.

Komut `PATH` üzerinde değilse tam yolunu hesaba yaz.

### Hangi hesap neye cevap versin

**Hangi hesap neye cevap versin** başlığı altında her özellik — commit mesajları,
sohbet, kodu açıklama, PR incelemesi, çakışma çözümü, wiki, temalar — kendi
hesabını ve modelini gösterebilir. Varsayılan hesabı izlemesi için satırı
varsayılanda bırak. Commit mesajlarına ucuz, sohbete güçlü bir model en yaygın
paylaştırmadır.

### Yükseltme bildirimi

Hesaplardan önceki bir sürümden yükseltirken bu bir kez görünür. Elindeki sağlayıcı ve anahtar ilk hesap olur; elle yeniden yapılandırılacak bir şey yoktur.

![Yükseltme bildirimi](../../screenshots/ai-accounts-notice.webp)

## Modeller

Model listeleri doğrudan sağlayıcıdan gelir ve bir gün önbellekte tutulur;
**Modelleri getir** birini anında tazeler. Listenin altında Gitcito listenin
nereden geldiğini söyler — canlı, önbellekten (tarihiyle) ya da yerleşik yedek
listeden, ve nedenini.

Liste, bir sohbet isteğini yanıtlayabilecek modellere göre süzülür; gömme, konuşma
ve görsel modelleri dışarıda kalır. Her model kutusu serbest metin de kabul eder,
böylece bir önizleme modeli, özel bir dağıtım ya da yeni çekilmiş bir Ollama
etiketi sağlayıcı listelemese bile hep kullanılabilir.

Henüz anahtar vermediğin ya da erişilemeyen bir sağlayıcı, boş bir açılır liste
yerine küçük bir yerleşik listeye düşer.

Hiçbir sağlayıcı sıralanmış ya da seçilmiş bir liste yayımlamaz, dolayısıyla düzenleme Gitcito'nundur: tarihli anlık görüntüler, anlık görüntüsü oldukları modelin içine katlanır (`gpt-4o`, `gpt-4o-2024-08-06`'yı kapsar) ve geri kalanı alfabetik yerine yeniden eskiye sıralanır. Listenin altındaki **Tüm modelleri göster**, sağlayıcının döndürdüğü her şeyi geri getirir.

## Neler yapabilir

| Özellik | Ne elde edersiniz |
|---|---|
| **Commit mesajı** | Hazırlanmış diff'inizden, seçtiğiniz üslupta bir özet (ve isteğe bağlı gövde) |
| **Bu dosyayı açıkla** | Yan panelde sade dille açıklama — Normal, Kısa, ELI5… hatta Korsan |
| **Üzerine gelince açıkla** | <kbd>⇧</kbd> tuşunu basılı tutup bir tanımlayıcıyı gösterin: tek satırlık açıklama ve dayandığı satırlar |
| **Çakışma çözümü** | Düzenlenebilir çıktıya bir birleştirme önerir — asla kendiliğinden uygulamaz |
| **PR incelemesi** | Bir diff'i özetler ve riskleri işaretler, her biri gerçek bir `path:line` konumuna bağlı |
| **PR açıklaması** · **dal adları** | Dalın commit'lerinden ve diff'inden taslaklanır |
| **Temalar** · **grafik paletleri** | Bir istemden üretilir |
| **Akıllı hazırlama** | Bu commit'e neyin ait olduğuna dair öneriler |

## Tahmin değil, dayanaklı

İnceleme diff'i **etiketlenmiş hunk'lar** olarak görür ve yalnızca bu etiketleri
gösterebilir; Gitcito da her etiketi gerçek bir dosya ve satıra çözer. Bir konum
uyduran model **reddedilir ve yeniden sorulur**; böylece bulgular her zaman var
olan bir kodu işaret eder.

Üzerine gelince açıkla, yalnızca token'ın çevresindeki numaralandırılmış bir
pencereyi okur — bir diff'te yalnızca ekranda görünen hunk'ları — bu yüzden bir
tanım başka yerde yaşıyorsa uydurmak yerine bunu söyler. Yanıtlar dosya sürümü
başına önbelleğe alınır.

**Maskelenmiş sır dosyaları asla gönderilmez.** Sır maskeleme kurallarının
kapsadığı dosyalar da gönderilmez.

## Sınırlar

- Yerleşik yedek listeler sürümler arasında eskir. Canlı getirme tam da bunun
  içindir; yedek yalnızca getirmenin mümkün olmadığı durumu kapsar.
- Sağlayıcının listesini sohbete uygun modellere süzmek ada göre yapılır, bu
  yüzden alışılmadık adlı bir sohbet modeli elenebilir. O zaman kendin yaz.
- Bir CLI hesabı, CLI bildirmediği sürece belirteç kullanımını raporlayamaz;
  Ayarlar'daki kullanım ve maliyet rakamları bu çağrıları eksik sayar.
- CLI cevapları doğrudan API çağrısından yavaştır: ikili dosya her istek için
  baştan bir oturum başlatır.
- Anahtarlar hesap başına işletim sisteminin anahtarlığında saklanır. Bir hesabı
  silmek anahtarını da siler.

**Ayrıca bakınız:** [Depo wiki'si](repo-wiki.md) · [Güvenlik ve sırlar](security.md)
