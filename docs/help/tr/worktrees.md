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
