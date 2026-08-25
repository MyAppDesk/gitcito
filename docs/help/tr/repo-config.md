---
title: Depo kuralları (.gitcito.json)
category: Çalışma alanı araçları
order: 98
summary: Depoyla birlikte seyahat eden ev kuralları — korumalı dallar, commit kapsamları, bir klonun neye ihtiyacı olduğu ve push öncesi liste.
keywords: gitcito.json depo yapılandırması kurallar doctor gereksinimler korumalı dallar kapsam scopes trailers ticket takipçi bağlantıları kontrol listesi onboarding hooksPath node altmodüller lfs env example
---

# Depo kuralları (`.gitcito.json`)

Her projede koddan çıkarılamayacak kurallar vardır. *`release/*` dalına asla
doğrudan push etme.* *Commit kapsamları `api`, `web` ve `infra`; başkası yok.*
*Bir şeyin çalışması için Node 20, checkout edilmiş altmodüller ve
`.env.example`'dan kopyalanmış bir `.env` gerekir.* Bu kurallar kimsenin tekrar
okumadığı bir README'de, bir CI hatasında ya da burada en uzun süredir çalışan
kişinin kafasında yaşar.

`.gitcito.json`, deponun bu kuralları yazdığı ve aracın onlara göre
davranabildiği yerdir. Depo kökünde durur, diğer dosyalar gibi versiyonlanır ve
böylece klonla birlikte seyahat eder: projeyi açan herkes aynı kuralları alır ve
yeni gelen kişi bunları ilk reddedilen push'ta değil, ilk gün öğrenir.

Dosya tamamen isteğe bağlıdır. Dosyası olmayan bir depo her zamanki gibi
davranır.

![Deponun Config sekmesi; doctor satırları ve kural bölümleri](../../screenshots/repo-config.webp)

## Nerede düzenlenir

Araç çubuğundaki araçların yanındaki dişli → **Config**. Bu düzenleyici dosyayı
çalışma ağacına yazar; başka hiçbir yerde saklanmaz, bu yüzden kuralları ekiple
paylaşmak için **commit et**.

Depoda henüz yoksa, **Depoyu oku** hâlihazırda var olandan bir öneri çıkarır: bir
`.nvmrc` ya da `engines.node`, bir `.gitmodules`, `.gitattributes` içindeki
`filter=lfs`, yanında `.env` bulunmayan bir `.env.example`, yerelde zaten
koruduğun dallar ve son 500 commit başlığının kullandığı kapsamlar. Sen
kaydedene kadar hiçbir şey yazılmaz. Terminalden `gitcito config init` aynı işi
yapar (bkz. [komut satırı](cli.md)).

## Dosya neler söyleyebilir

```json
{
  "version": 1,
  "protect": ["main", "release/*"],
  "links": {
    "tickets": [
      { "match": "\\b[A-Z][A-Z0-9]+-\\d+\\b", "url": "https://tracker.example.com/browse/$0", "label": "Jira" }
    ]
  },
  "commit": {
    "scopes": ["api", "web", "infra"],
    "ticketFromBranch": true,
    "trailers": ["Refs: {ticket}"]
  },
  "requires": {
    "node": ">=20",
    "hooksPath": ".husky",
    "submodules": true,
    "lfs": true,
    "files": [{ "path": ".env", "from": ".env.example", "why": "API temel adresi ve bir geliştirme jetonu" }]
  },
  "checklist": {
    "push": ["Entegrasyon paketini staging üzerinde çalıştır"]
  }
}
```

| Alan | Ne yapar |
|---|---|
| `version` | `1` olmalı. Daha yeni bir şemadan gelen dosya tahmin edilmek yerine bütünüyle yok sayılır. |
| `protect` | Dal adları; `*` herhangi bir metin dizisiyle eşleşir. Yerelde koruduğun dallara **eklenir** — bkz. [korumalı dallar](repo-settings.md). |
| `links.tickets` | Bir düzenli ifade ve bir adres şablonu. `$0` eşleşmenin tamamı, `$1`…`$9` grupları. Commit başlıklarındaki ve gövdelerindeki eşleşmeler bağlantıya dönüşür. |
| `commit.scopes` | Besteci'nin serbest metin yerine sunduğu kapsamlar. Bunları bildirmek, `gitcito commit-check` içinde bilinmeyen bir kapsamı biçim tavsiyesinden hataya çevirir. |
| `commit.ticketFromBranch` | Ticket anahtarını dal adından doldurur (`feature/ABC-123-sey` → `ABC-123`) — ama yalnızca boş bir bestecide, yazmakta olduğun metnin üzerine asla. |
| `commit.trailers` | Commit gövdesine eklenen satırlar. `{ticket}` ve `{branch}` doldurulur; yer tutucusunu dolduracak bir şey bulamayan satır yarım yazılmak yerine atılır. |
| `requires.*` | Çalışan bir klonun neye ihtiyacı olduğu. Her girdi aşağıdaki doctor satırlarından biri olur. |
| `checklist.push` | İlk push'tan önce oturumda bir kez gösterilen serbest metin. |

## Doctor

`requires`, *"klonladım ama çalışmıyor"* sorusunu yanıtlayan kısımdır. Gitcito
depoyu açtığında bunları denetler ve bir şey eksikse durum çubuğunda steteskoplu
bir rozet gösterir. Rozete tıklamak Config sekmesini doctor satırlarında açar;
**Yeniden denetle** hepsini tekrar çalıştırır.

| Denetim | Geçer | Onarım |
|---|---|---|
| `node` | PATH'indeki `node` belirtimi karşılıyorsa | — |
| `submodules` | Hiçbir altmodül checkout'suz değilse | `git submodule update --init --recursive` |
| `lfs` | git-lfs kuruluysa ve izlenen dosyalar işaretçi metni değil gerçek içerikse | `git lfs pull` |
| `hooksPath` | `core.hooksPath` bildirilen yolla eşleşiyorsa | `core.hooksPath` ayarlamak |
| `files` | Dosya varsa | varsa `from`'dan kopyalamak |

İki bilinçli sınır. Bir **uyarı** asla "bozuk" demek değildir; doctor bir şeyi
belirleyemedi demektir (okunamayan bir Node belirtimi, elinden bir şey
gelmeyeceğin bir hata uydurmak yerine geçer) ve uyarılar CI'da `gitcito doctor`
komutunu düşürmez. Onarım da asla dosyanın verdiği bir şey değildir: yukarıdaki
küme kümenin tamamıdır ve derleme zamanında kapalıdır. Yapılandırma ona bir değer
verir — kopyalanacak bir yol, `core.hooksPath` için bir değer — asla bir komut
değil.

Kopyalama asla üzerine yazmaz: dosyanın eksik olması, o satırın var olma
sebebidir.

## Commit'ler

`commit.scopes` bildirildiğinde besteci'nin kapsam düğmesi serbest metin yerine o
listeyi sunar — `feat(renderer)` ile `feat(rendererr)` arasındaki fark.
`ticketFromBranch` ve `trailers` bir mesajın mekanik kısımlarını doldurur;
`links.tickets` ise anahtarları, commit'in görüntülendiği her yerde tekrar
bağlantıya çevirir.

Aynı kurallar pencerenin dışında da geçerlidir: `gitcito commit-check` bu dosyayı
okur, böylece bir `commit-msg` hook'u ve CI tam olarak besteci'nin önerdiğini
dayatır. Bkz. [komut satırı](cli.md) ve [commit atmak](committing.md).

## Push listesi

`checklist.push`, oturumun ilk push'undan önce bir onay olarak gösterilir; madde
başına bir satır. Gerçekten insan kararı gerektiren şeyin yeri burasıdır —
*destek ekibine haber veren oldu mu?* — çünkü Gitcito **bunları senin yerine asla
denetlemez**. Bunlar hatırlatmadır, kapı değil: oku ve push et ya da vazgeç. Depo
başına oturumda bir kez gösterilir, çünkü her push'ta çıkan bir pencere kimsenin
okumadığı bir penceredir.

## Neden sana zarar veremez

Dosya depoyla birlikte gelir, yani depoyu kim yazdıysa ondan gelir. Tıpkı bir
commit mesajı gibi güvenilmeyen içerik olarak ele alınır:

- **İçinde hiçbir şey çalışmaz.** Komut taşıyan bir alan yoktur ve doctor'un
  onarımları sabit bir listedir.
- **Yalnızca kısıtlama ekleyebilir.** `protect` yerel listenle birleşimdir — bir
  depo senin seçtiğinden fazlasını koruyabilir, ama bir şeyi korumaktan
  vazgeçirmez. Hiçbir alan bir koruyucuyu kapatmaz.
- **Yollar depodan çıkamaz.** Mutlak yollar, `..`, `~`, sürücü harfleri ve
  `.git`'e dokunan her şey reddedilir; üstelik bir metnin gerçek bir yola
  dönüştüğü noktada yeniden denetlenir.
- **Bağlantılar `http(s)` olmalı.** Sistemin adres açıcısına başka hiçbir şey
  verilmez.
- **Her şeyin bir üst sınırı var** — liste uzunlukları, metin uzunlukları, desen
  uzunlukları — böylece düşmanca bir depo bir pencereye metin duvarı, bir panele
  bin rozet yapıştıramaz.

Hatalı bir alan atılır, ölümcül değildir. Dosyanın kalanı yine geçerlidir ve
atılanlar Config sekmesinde **Gitcito tarafından yok sayıldı** başlığı altında
gerekçesiyle listelenir. Tek istisna geçersiz JSON ya da bilinmeyen bir
`version`'dır; orada kurtarılacak bir şey yoktur.

## Bilerek yapmadıkları

- **Komut yok, betik yok, hook yok.** Bunun için [hook'lar](hooks.md) var ve
  onlar klon başına verdiğin bir karardır.
- **Dal başına ya da kişi başına kural yok.** Tek dosya, tek kural kümesi.
- **CI'nın yerini almaz.** Liste metindir; doctor ortamı denetler, işini değil.
- **Hiçbir şeyi zayıflatamaz.** Gitcito'nun her koruması yine senindir.

**Ayrıca bkz.:** [Depo başına ayarlar](repo-settings.md) ·
[Komut satırı](cli.md) · [Commit atmak](committing.md) ·
[Hook'lar ve .gitignore](hooks.md)
