---
title: Depo bağlam menüsü
category: Buradan başlayın
order: 4
summary: Herhangi bir depo çipine ya da sekmesine sağ tıklayın; takma ad, worktree'ler, GitHub, terminal ve kaldırma.
keywords: bağlam menüsü sağ tık takma ad worktree github terminal göster düzenleyici kaldır depo sekme context menu right-click alias reveal editor remove repository tab
---

# Depo bağlam menüsü

Bir depoya sağ tıklayın — bağımsız bir sekmeye, bir grup içindeki çipe, iç içe
bir klasördeki çipe, karşılama/başlatıcı listesindeki bir satıra ya da araç
çubuğunun depo açılır listesindeki bir satıra — ve hep aynı depo kapsamlı
menüyü elde edersiniz. Grup çipinin kendisi yine grup menüsünü açar;
tıklamanın deponun üzerine denk gelmesi gerekir.

![Gruplanmış bir çipteki depo bağlam menüsü](../../screenshots/repo-context-menu.webp)

Araç çubuğundaki depo açılır listesi, dal açılır listesinin dalları
listelediği gibi açık olan her depoyu listeler. Bir satıra geçmek için sol
tıklayın. Takma ad, worktree'ler, GitHub, terminal, gösterme, düzenleyici ve
kaldırma için bir satıra (ya da geçerli depo rozetinin kendisine) sağ
tıklayın. En alttaki **Depo aç…** başlatıcıyı açar.

![Araç çubuğunun depo açılır listesindeki bir satıra sağ tıklama](../../screenshots/repo-dropdown-context-menu.webp)

## Her eylem ne yapar

| Eylem | Etkisi |
|---|---|
| **Takma ad oluştur…** / **Takma adı değiştir…** | Yalnızca bir görünen ad. Gitcito diskteki klasörü asla yeniden adlandırmaz ya da taşımaz. Aynı takma ad depoyu sekmeler, gruplar ve çalışma alanları boyunca izler. |
| **Takma adı kaldır** | Bir takma ad varken gösterilir. Klasör adını geri getirir. |
| **Worktree’leri göster** | Bu depoya odaklanır ve kenar çubuğunun worktree bölümünü açar. |
| **Yeni worktree…** | Bir daldan kullanılan worktree oluşturma isteminin aynısı. Yol eksikken ya da bir merge/rebase/cherry-pick/revert sürerken devre dışıdır. |
| **Depo adını kopyala** | Takma adı değil, asıl klasör adını kopyalar. |
| **Depo yolunu kopyala** | Mutlak yolu kopyalar. |
| **GitHub’da görüntüle** | github.com ise origin, değilse ayrıştırılabilen ilk GitHub uzak deposu. Hiçbiri türetilemediğinde devre dışıdır. |
| **Terminalde aç** | Gitcito'nun terminalini, çalışma dizini bu depo olacak şekilde açar. |
| **Finder’da göster / Dosya Gezgini’nde göster** | Depo klasörünü platformun dosya yöneticisinde vurgular. |
| **Harici düzenleyicide aç** | Ayarlar'da yapılandırılan düzenleyici. Biri ayarlanana kadar görünür ama devre dışıdır. |
| **Kaldır…** | Sekmeyi kapatır ya da çipi gruptan çıkarır. **×** düğmesiyle aynı commit'lenmemiş çalışma uyarısını kullanır. Diskten asla dosya silmez. |

Eksik ya da geçersiz bir yol kopyalamayı, takma adı ve kaldırmayı kullanılabilir
bırakır; dizini açacak ya da inceleyecek her şeyi soluklaştırır.

**Ayrıca bakınız:** [Çalışma alanları, sekmeler ve gruplar](workspaces.md) · [Çalışma ağaçları ve alt modüller](worktrees.md) · [Harici düzenleyici](editor.md) · [Tümleşik terminal](terminal.md)
