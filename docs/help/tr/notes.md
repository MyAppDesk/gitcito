---
title: Commit notları
category: Geçmişi okuma
order: 26
summary: Zaten push edilmiş bir commit'e — commit'i değiştirmeden — metin iliştirin.
keywords: not notlar git notes açıklama yorum commit refs/notes inceleme review ticket amend yeniden yazma push notes fetch notes
---

# Commit notları

Bir commit mesajı bir kez yazılır ve sonra donar: onu değiştirmek commit'i
yeniden yazar, ona yeni bir hash verir ve eskisine zaten sahip olan herkesi
bozar. Commit'ten bir saat sonra bunda sakınca yoktur; bir hafta sonra
imkânsızdır.

`git notes` bu çıkmazdan kurtulmanın yolu. Bir not commit'in **yanında**,
`refs/notes/commits` altında saklanır ve not iliştirmek commit'i bayt bayt aynı
bırakır. Yani zaten yayımlanmış geçmiş üzerinde çalışır — ki bir şey eklemeyi en
çok istediğiniz an tam olarak odur.

Tipik kullanım: onu onaylayan inceleme, kapattığı ticket, neden geri alındığı,
hangi sürümle çıktığı.

## Not yazmak

Bir commit seçin. Mesajın altında bir **Not** bölümü vardır: *Not ekle*, yazın,
**Notu kaydet**. Çok satırlı olması sorun değil.

![Push edilmiş bir commit'in mesajının altına not yazıp kaydetmek](../../screenshots/clip-commit-note.webp)

Not kaydetmek sıradan bir Gitcito eylemidir — bildirim çıkarır ve **Geri al**
önceki metni yerine koyar; sildiğiniz bir notu geri getirmek de buna dahildir.

Metni temizleyip kaydetmek notu kaldırır; boş not diye bir şey yoktur.

## Not bulmak

Notlar normal bir log'da görünmezdir; insanların onları hiç keşfetmemesinin
başlıca sebebi de budur. Gitcito, not taşıyan bir commit'i grafiğin mesaj
sütununda küçük bir not simgesiyle işaretler; böylece açıklamanın orada olduğunu
bilmeden de bulunabilir.

Komut satırında `git log --notes` notları her mesajın altına yazdırır.

## Notları paylaşmak

**Herkesi şaşırtan kısım şu: normal bir `git push` notları push etmez ve normal
bir `git fetch` onları fetch etmez.** Notlar `refs/heads` ve `refs/tags` dışında
yaşar, dolayısıyla varsayılan refspec'ler onları tamamen atlar. Dizüstünüzde
yazılan notlar, birileri onları açıkça taşıyana kadar dizüstünüzde kalır.

Araçlar → **Not** → *Notları push et* / *Notları fetch et*, uzak depo bazında.
Şunları çalıştırırlar:

```sh
git push <remote> refs/notes/*
git fetch <remote> +refs/notes/*:refs/notes/*
```

Bazı sunucuların kendi taraflarında da notların etkinleştirilmesi ya da izin
verilmesi gerekir; oradaki bir ret, sunucunun politikasıdır, Gitcito'nun sınırı
değil.

## Sınırlar

- **Tek bir notes ref'i.** Gitcito varsayılan `refs/notes/commits` ref'ini okur
  ve yazar. Özel ad alanları (`git notes --ref=review`) burada sunulmaz — onları
  kullanan bir depo o notları burada göremez.
- **Ayrışan notlar birleştirilmez.** İki kişi aynı commit'e açıklama ekleyip
  ikisi de push ederse git ikinci push'u reddeder. Bunu çözmek
  [terminalde](terminal.md) `git notes merge` demek anlamına gelir.
- **Notlar bir temizleme yedeğiyle** ya da [anlık görüntülerle](recovery.md)
  **yedeklenmez.** Bunlar sıradan ref'lerdir ve normal işlemlerden sağ çıkarlar,
  ama sıfırdan yeniden klonlanan bir depo onlarsız başlar.

Ayrıca bakınız: [Commit'leme](committing.md) · [Commit grafiği](graph.md)
