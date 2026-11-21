---
title: Hosting i pull requesty
category: Synchronizacja i wiele repozytoriów
order: 56
summary: Twórz PR-y wszędzie; recenzuj je i merguj na GitHubie i GitLabie.
keywords: pull request PR merge request GitHub GitLab Bitbucket Azure DevOps recenzja zatwierdź merge zgłoszenia review approve issues
---

# Hosting i pull requesty

## Tworzenie

Twórz pull (albo merge) requesty bez opuszczania aplikacji: listy gałęzi, tytuł
i treść wypełnione wstępnie z commitów gałęzi, przełącznik szkicu i — na
GitHubie — recenzenci, etykiety i przypisania nadawane od razu przy tworzeniu.

![Tworzenie pull requesta](../../screenshots/create-pr.webp)

Działa na **GitHubie, GitLabie, Bitbuckecie i Azure DevOps**. Otwarte PR-y/MR-y
dla wszystkich czterech są wypisane w panelu bocznym.

Zacznij od porównania gałęzi, z grafu, z `+` w panelu PR-ów albo ze zgłoszenia
(które wypełni `Closes #N`).

## Stosy na liście

Pull requesty stojące jeden na drugim zwijają się do jednego wiersza z ikoną
stosu, gałęzią, na której ląduje łańcuch, i liczbą elementów. Rozwiń go, aby
zobaczyć łańcuch w kolejności czytania — od liścia w dół do bazy — ze strzałką
pod każdym wierszem mówiącą, w co się scala; kierunek jest na ekranie, a nie do
wywnioskowania z czterech baz.

Grupę tworzą dwie rzeczy: własny numer stosu GitHuba, gdy PR-y należą do
[stosu natywnego](stacks.md), a poza tym same refy — pull request, którego bazą
jest głowa innego, stoi na nim. Ta druga reguła sprawia, że działa to również na
GitLabie, Bitbuckecie i Azure DevOps.

![Stos na liście pull requestów](../../screenshots/pr-stack-list.webp)

Każdy wiersz niesie stan **checków** swojej głowy — najedź, aby zobaczyć liczby —
a na GitHubie także poziomy już zamknięte lub scalone, które lista otwartych PR-ów
by ukryła. Poziom nad **zamkniętym** jest oznaczony jako zablokowany: jego checki
mogą być zielone, ale gałąź, w którą celuje, nigdy nie wyląduje. Akcje wiersza
pojawiają się po najechaniu, żeby tytuł zachował szerokość.

Odczyt checków kosztuje jedno zapytanie na pull request i tylko przy odświeżaniu
listy.

## Twoje pull requesty w repozytorium nadrzędnym forka

W forku liczą się zwykle pull requesty otwarte w repozytorium, z którego
zrobiono fork, a one są tam, nie w Twoim forku. Dlatego gdy repozytorium ma
zdalne `upstream` wskazujące inne repozytorium GitHub niż `origin`, lista pyta
też `upstream` o otwarte pull requesty i zostawia **tylko te, których gałąź
pochodzi z Twojego forka**. Pojawiają się pod pull requestami forka, pod
nagłówkiem z nazwą repozytorium nadrzędnego, **W owner/repo**. Kliknięcie otwiera
ten sam widok szczegółów, z checkami i recenzją, w repozytorium nadrzędnym.

![Własny pull request forka, a pod nim jego pull requesty w repozytorium nadrzędnym, pod On example/pr-ready-branch](../../screenshots/fork-upstream-prs.webp)

*Ograniczenia:* tylko GitHub i tylko zdalne o nazwie `upstream`. Pozostałe pull
requesty repozytorium nadrzędnego są celowo pominięte: to jego kolejka, nie Twoja
praca. Stosy i wyszukiwanie gałęzi nadal działają tylko na liście `origin`.
Odpytanie repozytorium nadrzędnego to jedno żądanie więcej przy każdym
odświeżeniu.

## Recenzowanie — GitHub i GitLab

![Strona pull requesta z rozmową i panelem recenzentów](../../screenshots/pull-request-page.webp)

Kliknięcie pull requesta otwiera go jako **osobną stronę**. Jest przypięta do
swojego repozytorium jak wiki: ikona z numerem PR na karcie repozytorium albo na
jego chipie w grupie. Kliknij ikonę ponownie lub nazwę repozytorium, aby wrócić.
**Otwórz w nowej karcie** w menu kontekstowym PR daje mu zamiast tego własną
kartę. Jeśli repozytorium nie jest nigdzie otwarte, PR otwiera się we własnej
karcie.

Praca toczy się w kolumnie głównej, a panel boczny mówi, czym PR *jest*, bez
przewijania. Z włączoną AI przycisk ✨ w nagłówku recenzuje diff PR tak, jak
podaje go host, więc działa nawet dla gałęzi, której nigdy nie pobrałeś (fork,
cudza gałąź).

Kolumna główna ma trzy sekcje:

| Sekcja | Co zawiera |
|---|---|
| **Rozmowa** | Opis, komentarze i wątki recenzji w kodzie (`plik:wiersz`, z odpowiedziami). Potem pole komentarza z komentuj / zatwierdź / poproś o zmiany oraz pole scalania (merge, squash lub rebase) |
| **Pliki** | Każdy zmieniony plik i diff wybranego obok listy, z podświetlaniem składni i zmianami na poziomie słów (pliki wyglądające na sekrety zamaskowane, gdy to ustawienie jest włączone). Lista ✓ „obejrzane” pamięta postęp. Plik, dla którego host nie wysyła diffu (binarny lub za duży), linkuje do hosta |
| **Checki** | Check-runy CI (GitHub), joby pipeline’u (GitLab), statusy commita (Forgejo) lub statusy PR (Azure DevOps), z wynikiem i linkami do logów |

Panel boczny pokazuje:

| Wiersz | Pokazuje |
|---|---|
| **Autor** | Kto go otworzył i kiedy |
| **Status** | Otwarty, szkic, scalony (przez kogo, kiedy) lub zamknięty; konflikty z celem |
| **Recenzenci** | Ostatnią decyzję każdego recenzenta (zatwierdzone, prośba o zmiany, skomentowane) i kto jeszcze ma recenzować, z zespołami |
| **Przypisani, etykiety, kamień milowy** | Jak ustawiono na hoście, etykiety w swoich kolorach |
| **Gałęzie** | Źródło → cel i fork, z którego pochodzi |
| **Zmiany** | Zmienione pliki, commity, dodane i usunięte wiersze, z paskiem |
| **Checki** | Zaliczone / nieudane / w toku, jedno kliknięcie od sekcji Checki |
| **Uczestnicy** | Wszyscy, którzy brali udział |
| **Aktywność** | Kiedy go otwarto i kiedy ostatnio zaktualizowano |

GitLab nie podaje sum wierszy dla merge requesta; są sumowane z listy plików po
jej wczytaniu. Wiersz, którego host nie podaje, jest pomijany.

Jeśli ktoś zrobi force-push w trakcie recenzji, [co się od tego czasu zmieniło](range-diff.md)
pokaże dokładnie, co się przesunęło.

Różnice GitLaba, wprost: GitLab nie ma jednego wywołania „wyślij recenzję”, więc
**zatwierdź** używa jego endpointu zatwierdzeń, a **poproś o zmiany** cofa twoje
zatwierdzenie i publikuje komentarz. **Rebase-merge** nie jest oferowany — GitLab
wybiera między commitem scalającym a fast-forward według ustawień projektu, więc
menu scalania pokazuje tylko merge i squash. Wątki w kodzie pokazują plik i
wiersz, ale nie otaczający fragment diffu, którego API GitLaba nie zwraca.
Recenzja i scalanie działają na gitlab.com i na [GitLabie na własnym serwerze](#gitlab-na-własnym-serwerze).
Bitbucket do recenzji nadal otwiera się w przeglądarce.

Różnice Forgejo: wątki komentarzy do linii są widoczne, ale nie da się na nie
odpowiedzieć (Forgejo nie ma do tego API), a checki to statusy commita głowy —
więcej w [Forgejo](#forgejo).

Różnice Azure DevOps: zatwierdzenie oddaje twój głos (*Approved*); **poproś o
zmiany** głosuje *Waiting for author*. Ukończenie PR przyjmuje merge, squash lub
rebase. Azure podaje zmienione pliki PR, ale nie wysyła diffu, więc aplikacja
pobiera obie wersje każdego pliku i sama liczy diff — dla pierwszych 200 plików;
plik binarny albo zbyt duża zmiana linkuje do hosta. Osoby pokazywane są
inicjałami, bo zdjęcia profilowe Azure wymagają zalogowanej przeglądarki.

Panel boczny pokazuje też **work itemy powiązane z PR** — numer, tytuł, typ i
stan — każdy otwiera się w przeglądarce. Ich odczyt wymaga tokenu, który może
czytać work itemy (*Work Items: Read*); bez niego wiersz po prostu się nie
pojawia.

## GitLab na własnym serwerze

Firmowy GitLab ma własny adres. Podaj go w profilu w **Ustawienia → Integracje →
GitLab → Adres GitLab**, na przykład `git.example.org` albo
`https://example.net/gitlab` dla instancji pod ścieżką. Od tej chwili zdalne na
tym hoście to GitLab: merge requesty są wyświetlane, otwierane, recenzowane i
scalane, przeglądarka klonowania i *Utwórz repozytorium* rozmawiają z nim, a push
i fetch logują się tokenem tego profilu.

**Token GitLab należy do jednej instancji.** Token profilu jest wysyłany tylko na
adres podany w tym profilu. Pusty adres oznacza gitlab.com. Token z gitlab.com
nigdy nie trafia na firmowy serwer, a token firmowy nigdy na gitlab.com. Jeśli
konto służbowe i prywatne są na różnych instancjach, każde dostaje własny profil.
Repozytorium powiązane z profilem używa instancji tego profilu.

**Utwórz token** otwiera stronę tokenów Twojej instancji z zaznaczonymi `api` i
`write_repository`. Token tylko do odczytu łączy się bez problemu, a potem
zawodzi przy pierwszym pushu.

Ograniczenia:

- **Tylko https.** Adres `http://` jest odrzucany, bo token przechodziłby przez
  sieć jawnym tekstem.
- **Jedna instancja GitLab na profil.** Dla drugiej instancji dodaj drugi profil.
- Przez ssh porównywany jest host, nie ścieżka, więc dwóch instancji na jednym
  hoście pod różnymi ścieżkami nie da się rozróżnić dla zdalnego ssh.
- Awatary zdalnych są rysowane tylko dla gitlab.com i github.com. Zdalne na
  własnym serwerze dostaje zwykłą ikonę, żeby nazwy jego grup nigdy nie trafiły
  do publicznego hosta.

## Forgejo

Ustaw adres instancji, zanim wpiszesz jej token. Zmiana adresu usuwa poprzednie logowanie.

![Ustawienia integracji z Forgejo](../../screenshots/forgejo-integration.webp)

Forgejo — i Gitea, która dzieli z nim API — zawsze działa pod adresem wybranym
przez właściciela: Twoim własnym serwerem albo publicznym, jak codeberg.org.
Podaj ten adres w profilu w **Ustawienia → Integracje → Forgejo**, razem z
tokenem dostępu. **Utwórz token** otwiera stronę tokenów tego serwera. Nadaj tokenowi odczyt i zapis dla *repository*, *issue* i *notification* oraz
odczyt dla *user* i *organization*. Uprawnień tokenu nie da się później zmienić:
token bez *issue* lub *notification* nie pokaże issues ani powiadomień, a
rozwiązaniem jest nowy token.

Od tej chwili zdalne na tym serwerze to Forgejo:

| Działa | Jak |
|--------|-----|
| Push i fetch | Logowanie tokenem profilu |
| Otwarte pull requesty | Na liście w panelu bocznym, otwierane na [stronie pull requesta](#recenzowanie--github-i-gitlab): rozmowa, diff każdego pliku, checki (statusy commita, w tym Forgejo Actions), komentarz, akceptacja, prośba o zmiany oraz merge / squash / rebase |
| Utworzenie pull requesta | Z aplikacji; szkic dostaje prefiks `WIP:`, którego używa Forgejo |
| Przeglądarka klonowania, tworzenie repozytorium | Na tym serwerze, na Twoim koncie lub w organizacji |

Check będący jobem **Forgejo Actions** pokazuje swój log pod wierszem, z kolorami,
od końca, gdzie jest błąd. Forgejo nie ma API do logów jobów, więc aplikacja
pobiera tę samą stronę, którą ściąga webowa przeglądarka logów, i wysyła token
tylko wtedy, gdy link jest jobem na tym samym serwerze; status z zewnętrznego CI
nigdy go nie dostaje. Serwer, który daje logi tylko zalogowanej przeglądarce,
odpowiada stroną logowania — wiersz o tym mówi i proponuje przeglądarkę. Bardzo
długie logi pokazują ostatnie kilka tysięcy wierszy.

Tak jak przy GitLab, **token Forgejo trafia tylko na serwer, który go wydał**.
Profil bez adresu Forgejo nie ma żadnych danych logowania do Forgejo. Nie ma
domyślnego serwera zapasowego.

Ograniczenia:

- Wątki komentarzy do linii są widoczne, ale nie da się na nie odpowiedzieć z
  aplikacji: Forgejo nie ma API do odpowiedzi w istniejącym wątku. Odpowiedz na
  serwerze.
- Tylko https, jeden serwer Forgejo na profil.
- Listy kończą się po dwudziestu żądaniach: 1000 pull requestów lub repozytoriów przy domyślnym rozmiarze strony serwera.

## Issues, kamienie milowe, wydania — GitHub i Forgejo

Przeglądaj zgłoszenia i otwieraj pełną kartę zgłoszenia: treść, komentarze,
etykiety, przypisania, kamień milowy, pola Projects v2, zamknięcie/otwarcie
ponowne oraz **utwórz gałąź dla tego zgłoszenia** (z nazwą od AI). Kamienie
milowe pokazują postęp i swoje zgłoszenia. Wydania da się przeglądać razem ze
stroną changelogu.

Na serwerze [Forgejo](#forgejo) działają te same listy i strony, z tokenem
Forgejo profilu. Dwie rzeczy są tylko w GitHubie i tam zostają puste: pola
Projects v2 i pull requesty powiązane z issue. Wydania pokazują najnowsze, nie
całą historię.

## Czeka na Twoją recenzję

Na liście pull requestów w panelu bocznym 👁 oznacza PR-y, w których **Ty**
jesteś recenzentem i jeszcze nie odpowiedziałeś — na GitHub, GitLab i Forgejo.
Kim jesteś „Ty”, aplikacja pyta host danymi logowania profilu i pamięta przez
dziesięć minut. Token, który nie może odczytać własnego użytkownika (np. bez
`read:user` w Forgejo), niczego nie oznacza.

Z włączonym **Ustawienia → Powiadomienia systemowe** pull request w GitLabie lub
Forgejo, który *zaczyna* na ciebie czekać, wywołuje jedno; kliknięcie otwiera
stronę PR. Pierwsze spojrzenie na repozytorium tylko odnotowuje, co już czeka,
więc otwarcie aplikacji nie odtwarza zaległości. Prośby o recenzję z GitHuba
zostają przy jego skrzynce powiadomień, niżej, która już je ogłasza.

## Powiadomienia — GitHub i Forgejo

Cała twoja skrzynka — prośby o recenzję, wzmianki, aktywność CI — ze wszystkich
repozytoriów, z filtrami nieprzeczytane/wszystkie i oznaczaniem jako
przeczytane. Dzwonek na pasku nosi plakietkę nieprzeczytanych, a opcjonalne
powiadomienia systemowe odpalają, gdy ktoś poprosi o recenzję albo gdy CI
skończy.

Jeśli aktywny profil ma serwer Forgejo, jego powiadomienia trafiają na tę samą
listę, od najnowszych, i są oznaczane jako przeczytane na tamtym serwerze. Forgejo
nie mówi, *dlaczego* dostałeś powiadomienie, więc te wiersze nie mają powodu i
nigdy nie wywołują powiadomienia systemowego — decyduje o tym powód.

## Tokeny

Tokeny per profil dla wielu kont albo organizacji, przechowywane w pęku kluczy
twojego systemu. Gitcito potrafi też pożyczyć to, co już trzyma twój
**credential helper gita**, więc organizacja, do której już się
uwierzytelniłeś, często nie wymaga w ogóle żadnej konfiguracji. Zobacz
[Bezpieczeństwo i sekrety](security.md).

Każdy profil **wiąże własne konto**. W Ustawienia → Integracje przycisk
**Zaloguj się przez gita** szuka logowania, które już jest na komputerze — w
credential helperze gita, potem aktywne konto **GitHub CLI**, potem okno
logowania samego helpera — i wiąże to konto z profilem. Nic nie jest dzielone
niejawnie: nowy profil zaczyna niepołączony, a konto powiązane już z innym
profilem zostaje odrzucone. Aby powiązać drugie konto GitHub, dodaj je do gh
(`gh auth login`), ustaw jako aktywne (`gh auth switch`) i zaloguj się z drugiego
profilu — albo wklej token tego konta. Git nigdy nie pyta w terminalu o nazwę
użytkownika i hasło.

Strona pokazuje, czy połączenie to token profilu, jego powiązanie z helperem gita
czy z GitHub CLI, a **Rozłącz** cofa je tylko dla tego profilu: token zostaje
usunięty (u dostawcy pozostaje ważny, dopóki go tam nie unieważnisz), powiązanie
zostaje zdjęte (logowanie zostaje w gh lub w helperze).

API dostawcy — pull requesty, issues, CI — oraz fetch, pull i push samego gita
przez https używają tokenu lub powiązanego konta profilu. Dane logowania
docierają do gita tylko dla tego jednego polecenia, ograniczone do hosta
zdalnego repozytorium, i nigdy nie trafiają do `.git/config`. Profil bez
żadnego z nich zostawia gita z jego własnym credential helperem. Azure DevOps,
GitLab i Bitbucket wiążą się przez credential helper gita — Git Credential
Manager przechowuje kilka kont na dostawcę — albo używają tokenu na profil.
Powiązanie wskazuje jedno konto na dostawcę, więc organizacje wymagające
różnych kont potrzebują osobnych profili.

**Zobacz też:** [Gałęzie w stosie](stacks.md) · [Funkcje AI](ai.md)
