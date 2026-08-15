---
title: Depo wiki'si (Yapay zekâ)
category: Yapay zekâ
order: 81
summary: Her iddianın bir dosyaya kaynak gösterdiği, üretilmiş bir kod tabanı rehberi.
keywords: wiki belgelendirme dokümantasyon üretilmiş kod tabanı genel bakış bağımlılıklar mimari dışa aktarma docs
---

# Depo wiki'si

Bir depoyu gösterin, kod tabanını anlatan kısa bir wiki yazsın.

## Depo kartı

- **Dil dağılımı**, bayt cinsinden.
- **Teknoloji yığını** — rozet olarak gösterilen framework'ler (Next, Angular,
  Electron, Tailwind, Django…).
- **Bağımlılıklar**, doğrudan manifest dosyalarınızdan okunur (`package.json`,
  `Cargo.toml`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, `Gemfile`…) ve
  mimari rollerine göre gruplanır. İskele niteliğindeki paketler — tip
  tanımları, yükleyiciler, lint eklentileri — önce ayıklanır ve yalnızca projenin
  gerçekten bildirdiği paketler listeye girer.
- **Bir modül bağımlılık grafiği**; kaynak koddan ayrıştırılır (JS/TS, Python,
  Go, Rust, Dart, Ruby, C/C++, PHP) ve deponun kendi dosyalarına karşı çözülür,
  böylece bir paket importu asla sahte bir kenara dönüşmez.

## Yazılan sayfalar

Gitcito, deponun izlediği dosyalardan bir avuç sayfa planlar — önce belgeler ve
manifest'ler, ardından en çok değişenler — ve her sayfayı kapsadığı dosyalardan
yazar.

**Her ifade, geldiği dosyaya kaynak gösterir**; hiçbir dosyanın desteklemediği
bir iddia yayımlanmak yerine reddedilir. Sayfalar paralel yazılır ve tek seferde
kaydedilir, böylece başarısız bir çalıştırma iyi bir wiki'nin üzerine asla
yazmaz. Wiki daha eski bir commit'te yazılmışsa bunu size söyler.

## Dışa aktarma

**docs/ klasörüne aktar**, her şeyi `docs/wiki/` altına birbirine bağlı Markdown
olarak yazar — yani commit'lenebilir, bir PR'da incelenebilir ve barındırıcınızda
okunabilir.

Gizli bilgi taşıyor gibi görünen dosyalar hiçbir zaman gönderilmez.

**Ayrıca bakınız:** [Yapay zekâ özellikleri](ai.md)
