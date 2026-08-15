---
title: Hook'lar ve .gitignore
category: Çalışma alanı araçları
order: 92
summary: Git hook'larını yönetin ve dosyaları elle düzenlemeden yok sayın.
keywords: hook hooks pre-commit husky core.hooksPath gitignore yok sayma izlemeyi bırakma untrack
---

# Hook'lar ve .gitignore

## Hook'lar

Depodaki her hook'u listeleyin, hangilerinin gerçek hangilerinin hâlâ `.sample`
olduğunu görün; etkinleştirin, devre dışı bırakın, düzenleyin ya da yenisini
oluşturun.

![Hook yöneticisi](../../screenshots/hooks.webp)

Gitcito, özel bir **`core.hooksPath`** ayarını (husky ve benzerleri) ve bir
**pre-commit framework** yapılandırmasını algılar; hook'lar `.git/hooks` dışında
bir yerde duruyorsa bunu size söyler — aksi hâlde git'in hiç çalıştırmadığı bir
dosyayı düzenlemiş olurdunuz.

> Hook'lar Gitcito'nun commit'lerinde de tıpkı `git commit` için olduğu gibi
> çalışır. Başarısız olan bir hook commit'i engeller ve çıktısı hata mesajında
> size geri döner.

## Akıllı .gitignore

Bir dosyaya sağ tıklayın → **Yok say** ve seçin:

| Seçim | Yazdığı |
|---|---|
| Bu dosya | `path/to/file.log` |
| Tüm `*.ext` | `*.log` |
| Klasörün tamamı | `path/to/folder/` |

![.gitignore seçicisi](../../screenshots/gitignore-chooser.webp)

Kural **en yakın klasörün** `.gitignore` dosyasına ya da depo köküne yazılır ve
karar vermeden önce satırın canlı bir önizlemesini görürsünüz. Zaten izlenen
dosyalar için aynı pencerede bir **Yok say ve izlemeyi bırak** seçeneği çıkar.

**Ayrıca bakınız:** [Güvenlik ve gizli bilgiler](security.md) · [Hazırlama](staging.md)
