---
title: Bezpieczeństwo i sekrety
category: Bezpieczeństwo
order: 70
summary: Maskowanie, zabezpieczenia, pęk kluczy — i to, czego Gitcito robić odmawia.
keywords: bezpieczeństwo sekrety maskowanie pęk kluczy tokeny chroniona gałąź duży plik prywatność security secrets masking keychain safeStorage protected branch guard privacy
---

# Bezpieczeństwo i sekrety

Gitcito **nie ma żadnego backendu**. Jedyne wywołania sieciowe idą do twojego
hostingu Gita i — jeśli to włączysz — do twojego dostawcy AI.

![Ustawienia bezpieczeństwa](../../screenshots/settings-security.webp)

## Maskowanie sekretów

Wartości w `.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials.*` i spółce
renderują się jako `KEY=••••••` w widokach diffa, pliku i blame — więc
udostępnienie ekranu albo zrzut ekranu nie mogą ich wypuścić.
Materiał podpisujący Apple też się liczy: `*.mobileprovision`,
`*.provisionprofile`, `*.p12` oraz klucze `*.p8` do App Store Connect. `*.cer`
już nie — certyfikat z założenia jest publiczny.

To działa **wyłącznie na wyświetlanie**: nigdy nie zmienia pliku i nigdy nie
zmienia tego, co dodajesz do przechowalni. Przełącznik z okiem odsłania je
w danym widoku. `.env.example`, `.sample` i `.template` są traktowane jak
szablony, a nie jak sekrety.

![Plik .env wyrenderowany z zamaskowaną każdą wartością i przełącznikiem odsłaniania](../../screenshots/secret-masking.webp)

## Zabezpieczenia, zanim narobisz szkód

| Zabezpieczenie | Kiedy |
|---|---|
| **Plik z sekretem** | Commitowanie czegoś, co wygląda na poświadczenie — z *Ignoruj i przestań śledzić* jednym kliknięciem |
| **Duży plik** | Commitowanie przerośniętego bloba (próg w Ustawienia → Bezpieczeństwo) |
| **Śmieci z budowania** | Commit `xcuserdata/`, `DerivedData/` albo `.DS_Store` — z tym samym *Zignoruj i przestań śledzić* jednym kliknięciem |
| **Chroniona gałąź** | Commit prosto na `main`/`master` albo force push na nią |
| **Śledzone sekrety** | Push repozytorium, które *śledzi* plik z sekretem — ostrzeżenie raz na sesję |

## Pęk kluczy systemu

Tokeny i wpisy [sejfu](vault.md) są szyfrowane pękiem kluczy twojego systemu
(`safeStorage` z Electrona), nigdy kluczem trzymanym w pliku ustawień.

**Nic nie dotyka pęku kluczy, dopóki tego nie powiesz.** Zanim zdąży pojawić się
systemowe okno uprawnień, Gitcito wyjaśnia, co zostanie zapisane, czego nie
potrafi (aplikacja zawsze odczyta wyłącznie wpis, który sama utworzyła — twoje
pozostałe hasła są nieosiągalne) i że odmowa jest w porządku: tokeny żyją wtedy
w pamięci tylko na czas sesji, sejf zostaje zamknięty, a włączyć to możesz
później w **Ustawienia → Bezpieczeństwo → Pęk kluczy systemu**.

Świeża instalacja wykonuje **zero** wywołań do pęku kluczy, dopóki coś naprawdę
nie wymaga zapisania.

## Bezpieczne dzielenie się

[Bezpieczne udostępnianie](secure-share.md) eksportuje ustawienia, wpisy sejfu
albo całe przestrzenie robocze jako **zaszyfrowaną paczkę** — sekrety trafiają
do niej wyłącznie wtedy, gdy zaznaczysz checkbox.

**Zobacz też:** [Sejf](vault.md) · [Bezpieczne udostępnianie](secure-share.md)
