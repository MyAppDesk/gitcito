---
title: Tümleşik terminal
category: Çalışma alanı araçları
order: 90
summary: Deponun altına yerleşen gerçek bir PTY, her depo için ayrı sekmelerle.
keywords: terminal kabuk shell pty xterm konsol sekmeler yerleşik docked
---

# Tümleşik terminal

Gerçek bir PTY (xterm + node-pty), komut çalıştırıcı değil. Sizin kabuğunuz,
sizin komut satırınız, sizin takma adlarınız.

![Tümleşik terminal](../../screenshots/terminal.webp)

- **Her depo için birden çok sekme**; her biri o deponun klasöründe başlar.
- Terminali grafiğin **altına** ya da bir **sağ sütun** olarak yerleştirin;
  panel boyutunu hatırlar.
- Terminalin görünürlüğü depo bazındadır: hiç terminal açılmamış bir sekmeye
  geçtiğinizde kapalı kalır.
- Sekmeler, içlerinde çalışan şeye göre kendilerini adlandırır.
- Terminal listesini katlamak onu bir **raya** indirger: terminal başına bir
  simge (bölünmüş terminaller küçük bir panel haritası gösterir), geçiş yapmak
  için tıklayın, olağan yeniden adlandır/böl/sonlandır menüsü için sağ tıklayın.
- Listede **bir terminali diğerinin üzerine sürükleyin** — bölünmüş bir grupta
  birleşirler. Her terminal adını bir bölme olarak korur; birleşen grup yeni
  bir numaralı ad alır.

![Tek bir terminal grubunda yan yana bölünmüş iki panel](../../screenshots/terminal-split.webp)

Burada çalıştırdığınız hiçbir şey Gitcito'nun kendi kilitleme mekanizmasına
görünmez; dolayısıyla elle yazılmış uzun bir `git rebase` ile arayüzdeki bir
tıklama yine de çakışabilir — terminal bir şeyi değiştirdiğinde uygulama
durumunu diskten tazeler.

**Ayrıca bakınız:** [Çalıştır ve hata ayıkla](launch.md) · [Hook'lar](hooks.md)
