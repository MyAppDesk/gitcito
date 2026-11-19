---
title: Çalışma ağaçları ve alt modüller
category: Eşitleme ve çoklu depo
order: 54
summary: Tek bir deponun birden çok checkout'u; ve depoların içindeki depolar.
keywords: çalışma ağacı worktree worktrees alt modül submodule submodules bağlı checkout init sync eşitle
---

# Çalışma ağaçları ve alt modüller

## Çalışma ağaçları

Bir çalışma ağacı, aynı deponun kendi klasöründeki ikinci bir checkout'udur —
böylece `feature/x` bıraktığınız gibi dururken `main`'e bakabilirsiniz, hiç stash
yapmadan.

- Çalışma ağaçlarını kenar çubuğundan oluşturun ve kaldırın. Birine **çift
  tıklamak** onu kendi sekmesinde açar; sağ tık *Worktree'yi aç*, *Klasörde
  göster* ve kaldırmayı verir.
- Herhangi bir yerel dala sağ tıklayın → **Bir çalışma ağacında aç**; kardeş bir
  klasörde bir tane oluşturulur ve sekme olarak açılır.
- Bir dal aynı anda yalnızca bir çalışma ağacında yaşar; başka bir ağacın tuttuğu
  dala geçmek bu yüzden işleyemez — git *already used by worktree at …* diyerek
  reddeder. Gitcito bunun yerine sizi oraya götürür: dalın menüsünde *`x` dalına
  worktree'sinde git* yazar ve satıra çift tıklamak, hata vermek yerine o çalışma
  ağacının sekmesini açar.

### Worktree’lerin bakımı

Geçen ay oluşturulan bir worktree kolayca unutulur ve sorular temizlik sırasında gelir: içinde iş var mı? O klasör hâlâ duruyor mu? Her satır, sormanıza gerek kalmadan yanıt verir.

| Satırda | Anlamı |
|---|---|
| **●3** | O worktree’de commit edilmemiş değişikliği olan üç dosya |
| **↑2 ↓1** | Dalı, upstream’inin iki commit önünde ve bir commit gerisinde |
| 🔒 | Kilitli — kilitlerken verilen nedeni görmek için üzerine gelin |
| **eksik**, adı üstü çizili | Klasör yok; git’te yalnızca kaydı kaldı |

Sayılar bölüm açıldığında, o worktree’nin commit’i değiştiğinde ve pencere odağı geri aldığında okunur — her yenilemede değil, çünkü her biri başka bir klasörde çalışan bir `git status`’tur.

Bir satıra sağ tıklayarak:

| Eylem | Ne yapar |
|---|---|
| **Worktree’yi kilitle** | Git’in (ve diğer istemcilerin) onu temizlemesini, taşımasını veya kaldırmasını engeller. Bir neden yazın — *harici diskte* — kilidin üzerinde görünür. Her zaman takılı olmayan ortamlardaki worktree’ler için. |
| **Worktree kilidini aç** | Tersi. Geri almak onu aynı nedenle yeniden kilitler. |
| **Worktree’yi taşı…** | Klasörü taşır ve git bağlantılarını iki yönde günceller. Kilitliyken veya bir sekmede açıkken sunulmaz: sekmeler ve düzenleri yola göre hatırlanır, sekme hiçbir yeri göstermez hâle gelirdi. Önce sekmeyi kapatın. Geri almak onu eski yerine taşır. |
| **Worktree’yi kaldır** | Önce git’e neyin kaybolacağını sorar. Temiz bir worktree normal onayı alır ve geri almak onu aynı dalda, aynı klasörde yeniden oluşturur. Commit edilmemiş değişikliği olan ise dosya sayısını belirten ayrı bir onay, *At ve kaldır*, alır — geri alma yoktur. |
| **Taşınan klasörü yeniden bağla…** | Yalnızca *eksik* bir satırda: klasörün nereye gittiğini gösterin (dosya yöneticisiyle taşıdınız), git onu `git worktree repair` ile yeniden bağlar. |
| **Eksik worktree’leri unut** | Bir satır eksik olduğunda bölüm başlığında görünen silgi düğmesi de budur. `git worktree prune` çalıştırır. |

Bu eylemlerin **yapmadıkları**:

- **Bir worktree’yi kaldırmak yok sayılan dosyalarını da siler** — `.env`, `node_modules`, derleme çıktısı. Git bunları değişiklik saymaz; bu yüzden "temiz" onay bile bunu belirtir ve geri alma bunları geri getirmez.
- **Unutmak yalnızca git’teki kaydı siler.** Silinecek dosya yoktur — klasör zaten gitmiştir — ve kilitli worktree’ler atlanır, çünkü takılı olmayan bir diskteki kilitli worktree silinmiş olanla tıpatıp aynı görünür.
- Kilit, git istemcileri arasında bir anlaşmadır, dosya koruması değildir: git dışındaki hiçbir şeyin klasörü silmesini engellemez.
- Ana worktree — deponun kendisi — kilitlenemez, taşınamaz ve kaldırılamaz.
- Bir worktree’yi kaldırmak dalını asla silmez. İşiniz bittiyse dalı dal listesinden silin.

![Kenar çubuğunun çalışma ağacı ve alt modül bölümleri, ikisi de dolu](../../screenshots/worktrees.webp)

## Alt modüller

Alt modülleri ekleyin, güncelleyin (init ve checkout), URL'lerini eşitleyin ve
kaldırın; her biri için canlı durum bilgisiyle:

| Durum | Anlamı |
|---|---|
| **Eşitlenmiş** | Üst deponun kaydettiği commit'te checkout edilmiş |
| **Değiştirilmiş** | Başka bir yerde checkout edilmiş ya da kirli |
| **Başlatılmamış** | Kayıtlı, ama hiç checkout edilmemiş |

![Her satırda bir alt modül, durumlarıyla birlikte](../../screenshots/submodule-states.webp)

**Ayrıca bakınız:** [LFS ve sparse-checkout](lfs-sparse.md) · [Fetch, pull ve push](syncing.md)
