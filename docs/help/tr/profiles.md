---
title: Profiller
category: Kendinize göre uyarlayın
order: 101
summary: İş ve diğer her şey için ayrı kimlikler ve token'lar.
keywords: profil profiller kimlik git kullanıcı e-posta token hesap geçiş identity
---

# Profiller

Bir profil, bir **Git kimliğini** (ad ve e-posta) kendi **entegrasyon
token'larıyla** bir araya getirir. Profil değiştirdiğinizde ikisi birlikte
değişir — commit'ler doğru kişiye atfedilir ve API çağrıları doğru hesabı
kullanır.

Aynı makinede hem iş hem kişisel depolarla çalışırken ya da iki GitHub hesabınız
olduğunda işe yarar.

![Bir profil: bir yanda git kimliği, diğer yanda entegrasyon token'ları](../../screenshots/settings-profiles.webp)

## Her profilin kendi hesapları

Bir profil, belirtecin yanı sıra makinede zaten bulunan bir oturumu — git'in
credential helper'ından ya da GitHub CLI'dan — Ayarlar → Entegrasyonlar'da
**bağlayabilir**. Bir bağlantı tek bir profile aittir: yeni bir profil
bağlantısız başlar ve başka bir profilin zaten tuttuğu hesap reddedilir. Böylece
iki profil iki GitHub (ya da Azure DevOps) hesabını yan yana tutabilir. Bkz.
[Barındırma](hosting.md).

## Depo bazında bağlama

Bir depo bir **profile bağlanabilir**; böylece o depodaki arka plan fetch'i her
zaman doğru hesapla kimlik doğrular — siz diğer hesaba ait bir depoya bakarken
bile.

Token'lar [işletim sistemi anahtar zincirinizde](security.md) yaşar, hiçbir
zaman ayarlar dosyasında değil.

**Ayrıca bakınız:** [Güvenlik ve gizli bilgiler](security.md) · [Hosting](hosting.md)
