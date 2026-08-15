---
title: Çalışma alanları, sekmeler ve gruplar
category: Buradan başlayın
order: 3
summary: Boğulmadan çok sayıda depo: sekmeler, gruplar, klasörler ve çalışma alanları.
keywords: çalışma alanı sekmeler gruplar klasörler çoklu depo düzenleme geçiş yerleşim workspace tabs groups folders multiple repos organise switch layout
---

# Çalışma alanları, sekmeler ve gruplar

En gevşekten en sıkıya üç düzey.

## Sekmeler

Bir depo, bir sekme. Yeni sekme seçicisini açmak için <kbd>⌘T</kbd> /
<kbd>Ctrl+T</kbd>, etkin sekmeyi kapatmak için <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd>
kullanın. Ayrıca sürükleyerek sıralayabilir, orta tıkla kapatabilir ya da en son
kapattığınızı yeniden açmak için <kbd>⌘⇧T</kbd> tuşuna basabilirsiniz. Son
sekmeyi kapatın; <kbd>⌘W</kbd> bu kez pencereyi kapatır. Sekmedeki bir nokta
commit'lenmemiş çalışma, farklı bir nokta ise çakışma anlamına gelir.

Bir kapatma uyarısı çıkarsa <kbd>Escape</kbd> her zaman iptal eder.
<kbd>Enter</kbd> yalnızca sekme temizken onaylar — commit'lenmemiş değişiklikler
veya çakışmalar varken uyarı sizi bilerek düğmeye uzanmaya zorlar; böylece
<kbd>⌘W</kbd> sonrası yanlışlıkla basılan bir tuş, hâlâ elinizde tuttuğunuz
çalışmayı kapatamaz.

## Gruplar

İlgili depoları adlandırılmış, renk kodlu bir **grup sekmesinde** toplayın. Bir
grubun içinde depo başına bir çipin bulunduğu ikinci bir satır elde edersiniz ve
grubun kendisi tek seferde **Tümünü fetch et** veya **Tümünü pull et**
yapabilir.

![Birkaç depo içeren bir grup sekmesi](../../screenshots/repo-groups.webp)

Gruplar **istenen derinlikte iç içe klasörler** tutabilir: gruba sağ tıklayın →
*Yeni klasör…*, sonra depoları bir klasör çipinin üzerine sürükleyin. Her klasör
bir renk alır, sayılı bir çipe katlanır, içindeki her şeyin durum noktalarını
toplar ve tüm alt ağacını fetch ya da pull edebilir.

![Grubun sekme şeridindeki klasörler, her biri sayılı bir çip — Services içinde iç içe duran Internal](../../screenshots/nested-folders.webp)

> Klasörler yalnızca düzenler. Birini silmek, içindeki depoları üst düzeye
> taşır — hiçbir depoyu kapatmaz.

## Çalışma alanları

Bir çalışma alanı, **kaydedilmiş bütün bir sekme şerididir**. Geçiş yapmak her
sekmeyi bir anda değiştirir: `Work` ile `Personal` birbirinin ayağına basmayı
bırakır.

Çalışma alanının adı sol üstte, Gitcito işaretinin yanında durur. Geçiş yapmak,
oluşturmak, yeniden adlandırmak, sıralamak veya silmek için ona tıklayın.
Yanında ise içinde bulunduğunuz çalışma alanı için
[Komuta merkezi](mission-control.md)'ni açan gösterge vardır.

**Ayrıca bakınız:** [Komuta merkezi](mission-control.md) · [Komut satırı](cli.md)
