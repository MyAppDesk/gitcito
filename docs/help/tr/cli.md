---
title: Komut satırı
category: Çalışma alanı araçları
order: 93
summary: `gitcito .` bir depo açar — `gitcito doctor` ise hiçbir şey açmadan yanıt verir.
keywords: cli komut satiri terminal shim path kurulum acmak klasor tek ornek doctor status repos commit-check config editor completions wait core.editor blame show search fiiller cikis kodu ci hook
---

# Komut satırı

Bir terminalden iki tür soru sorulur ve `gitcito` ikisini de yanıtlar.

Birincisi *“şunu göster”* — bir klondasın, bir şeye bakılması gerekiyor ve
bakmak için doğru yer uygulama. Bu çağrılar bir pencere açar, sorduğun şeye
olabildiğince yakın bir yerde.

İkincisi *“hemen söyle”* — bir hook, bir CI işi ya da bir borunun ortasındaki
sen; pencere yerine bir yanıt ve bir çıkış kodu istiyorsun. Bunlar uygulamayı hiç
başlatmaz: stdout’a yazar ve yoldan çekilir.

```sh
gitcito .                        # bu klasörü aç
gitcito blame src/api.ts -l 84   # …o satırın blame’inde
gitcito doctor                   # pencere yok: depoyu denetler, hata varsa 1 ile çıkar
```

## Kurulumu

Komut paleti (<kbd>⌘K</kbd>) → **'gitcito' komutunu PATH’e kur**. macOS’ta küçük
bir shim’i `/usr/local/bin` veya `/opt/homebrew/bin` içine sembolik bağ olarak
kurar; yönetici hakkı yalnızca ikisi de senin için yazılabilir değilse istenir.
Linux’ta hiçbir hak gerektirmeyen `~/.local/bin` dizinine gider. Aynı komut
kaldırır. Windows henüz desteklenmiyor.

Sonra, istersen:

```sh
gitcito completions zsh >> ~/.zshrc     # ya da bash, ya da fish
```

## Bir şeyler açmak

| Komut | Açar |
|-------|------|
| `gitcito [yol]` | Depoyu (varsayılan: geçerli dizin) |
| `gitcito open <ad>` | Bir depoyu **sekme adıyla** — `gitcito open api` |
| `gitcito diff` | Çalışma kopyasındaki değişiklikleri |
| `gitcito graph` | Commit grafiğini |
| `gitcito show <ref>` | Tek bir commit — `HEAD~2`, bir etiket, kısa bir hash |
| `gitcito blame <dosya>` | Bir dosyanın blame’ini; `-l 84` ile doğrudan o satıra |
| `gitcito search <sorgu>` | Kod aramasını, sorgu yazılmış hâlde |
| `gitcito stack`, `stash`, `reflog`, `conflicts`, `todos`, `chat`, `settings` | O paneli |
| `gitcito ci`, `clean`, `bisect`, `absorb`, `snapshots`, `insights`, `terminal` | …ve devamı |

`gitcito help verbs` tam listeyi yazdırır. Üç seçenek hepsi için geçerlidir:
`-n <ad>` sekmenin görünen adını belirler, `-g <grup>` onu bir grup sekmesine
koyar (gerekirse oluşturur) ve `-l <n>` bir satır seçer.

Gitcito **tek örnek** çalışır: uygulama açıkken `gitcito` çalıştırmak isteği o
pencereye devreder, ikinci bir kopya başlatmaz. Zaten açık olan bir yol — sekme
olarak ya da bir grubun içinde — **odaklanır**, kopyalanmaz. Henüz depo olmayan
bir dizin de açılır ve “burada depo oluştur” akışını sunar.

## Terminalde yanıt vermek

Bunlar yazdırır ve biter. Pencere açılmaz, üstelik uygulamanın çalışıyor olması
bile gerekmez.

### `gitcito status`

Dal, izleme, ileri/geri, çalışma ağacı, zulalar ve — depo bir tane getiriyorsa —
[`.gitcito.json` içindeki push denetim listesi](repo-settings.md). Çalışma
ağacında çakışma varsa 1 ile çıkar; yani `gitcito status || echo engelli`
çalışır.

### `gitcito doctor [--fix]`

[Depo yapılandırması](repo-settings.md) panelinin yaptığı denetimlerin aynısını
çalıştırır: Node sürümü, alt modüller, LFS, `core.hooksPath`, gerekli dosyalar.
**Bir denetim başarısız olursa 1 ile çıkar** — bütün mesele bu: bir deponun
bildirdiği kurallar, yalnızca arayüzü açık olan kişi görüyorsa pek bir şey ifade
etmez:

```yaml
- run: gitcito doctor          # CI’da, pahalı her şeyden önce
```

`--fix`, doktorun bildiği onarımları uygular (alt modülleri başlatmak,
`lfs pull`, `core.hooksPath` ayarlamak, bir dosyayı örneğinden kopyalamak) ve
yeniden denetler. Yapılandırmanın verdiği bir komutu asla çalıştırmaz — onarım
kümesi kapalıdır.

Uyarılar çalışmayı başarısız kılmaz. Uyarı, doktorun bir şeyi belirleyemediği
anlamına gelir, bir şeyin yanlış olduğu anlamına değil; derlemeleri buna
takılarak düşürmek dosyayı benimsemeyi fazla pahalı hâle getirirdi.

### `gitcito commit-check [dosya]`

Bir commit mesajını denetler. Argümansız `.git/COMMIT_EDITMSG` dosyasını okur;
`-m "…"` bir metni denetler. Deponun ne bildirdiğini bilir: `.gitcito.json`
kapsam listeliyorsa bilinmeyen kapsam bir **hatadır**, listelemiyorsa yalnızca
biçem önerisidir. Bir hook’a bağla:

```sh
# .husky/commit-msg
gitcito commit-check "$1"
```

### `gitcito config init | show | check`

`init` depoyu okur ve zaten var olandan bir `.gitcito.json` önerir — `.nvmrc`,
`.gitmodules`, `.env` olmayan bir `.env.example`, geçmişin kullanageldiği commit
kapsamları. `--dry-run` yazmak yerine ekrana basar. `show` mevcut dosyayı
yazdırır; `check` onu doğrular ve düşürülecek her alanı listeler.

### `gitcito repos [filtre]`

Gitcito’nun bildiği her depo — önce açık sekmeler, sonra son kullanılanlar —
grubuyla birlikte. `--paths` betikler için satır başına bir çıplak yol yazar:

```sh
cd "$(gitcito repos --paths api | head -1)"
```

## Gitcito’yu git’in düzenleyicisi yapmak

```sh
gitcito editor install
```

`core.editor` ve `sequence.editor` değerlerini `gitcito --wait` yapar. Bundan
sonra `git commit` (`-m` olmadan), `git commit --amend`, `git tag -a` ve
`git rebase -i` dosyalarını vim yerine Gitcito’da açar; karakter sayacı ve
besteci ekranındaki commit mesajı ipuçlarıyla birlikte.

![git bir düzenleyici istediğinde Gitcito’nun açtığı pencere](../../screenshots/cli-edit.webp)

Önemli olan **bekliyor** sözcüğü: git o iletişim kutusunda bloke olmuş
durumdadır. Yani

- **Kaydet ve devam et** dosyayı geri yazar, git yoluna devam eder.
- **Vazgeç** boş bir dosya yazar; git bunu *iptal* olarak okur.
- Kutuyu başka bir yolla kapatmak — Escape, arka plan, Gitcito’dan çıkmak —
  Vazgeç sayılır. Sonsuza dek bekleyen bir terminal, yeniden yazılacak bir
  mesajdan çok daha kötü olurdu.

Tek bir depoyla sınırlamak için `--local` ekle; geri almak için
`gitcito editor uninstall`.

## Yapmayacakları

- **Hiçbir terminal fiili depoyu değiştirmez.** Tek istisna `doctor --fix`’tir ve
  onarımları sabit bir listedir; bir yapılandırma dosyası bunu genişletemez.
- **`repos` yalnızca okur.** Çalışan uygulama kendi ayar dosyasının sahibidir;
  CLI onu okur, asla yazmaz.
- **Kurulu uygulamanın bilmediği bir fiil yok sayılır**, reddedilmez — daha yeni
  bir shim, eski bir uygulamada da depoyu yine açar.
- **Windows’ta henüz shim yok.** Fiillerin tamamı uygulanmış durumda; eksik olan
  yalnızca kurulum yolu.

**Ayrıca bakınız:** [Çalışma alanları, sekmeler ve gruplar](workspaces.md) ·
[Depo yapılandırması](repo-settings.md) · [Commit’lemek](committing.md)
