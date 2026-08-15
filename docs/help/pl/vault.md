---
title: Sejf
category: Bezpieczeństwo
order: 71
summary: Lokalny, zaszyfrowany magazyn na sekrety, których potrzebuje repozytorium — nigdy niecommitowane.
keywords: sejf sekrety env pęk kluczy zaszyfrowany lokalny globalny kopiuj vault keychain encrypted local per-repo global copy
---

# Sejf

Wartości `.env`, których projekt potrzebuje, muszą gdzieś mieszkać. Sejf jest tym
gdzieś — bez tego, żeby lądowały w repozytorium.

![Sejf](../../screenshots/vault.webp)

- **Zaszyfrowany w spoczynku** pękiem kluczy twojego systemu.
- **Dwa zasięgi**: wpisy przypięte do repozytorium oraz zestaw **globalny**,
  do którego możesz sięgnąć skądkolwiek.
- **To nie plik i nie ma nic wspólnego z twoim `.env`.** Wpisy są *powiązane*
  z repozytorium, ale nigdy do niego nie zapisywane, nigdy niecommitowane, nigdy
  niewypychane.
- **Nic nigdy nie opuszcza twojej maszyny.** Bez synchronizacji, bez chmury.

## Korzystanie

Otwórz przez <kbd>⌘⇧V</kbd>, z menu narzędzi, z Ustawień albo z palety poleceń.
Przełączaj się między dowolnymi znanymi repozytoriami, odsłaniaj albo kopiuj
wartość, bądź **skopiuj jako .env** cały zestaw prosto do schowka.

## Przenoszenie między maszynami

[Bezpieczne udostępnianie](secure-share.md) potrafi spakować sejf
w zaszyfrowaną paczkę — i tylko wtedy, gdy jawnie poprosisz o dołączenie
sekretów.

**Zobacz też:** [Bezpieczeństwo i sekrety](security.md) · [Bezpieczne udostępnianie](secure-share.md)
