# Hubalk Partners — instrukcja projektu

Poland · Hungary · Balkans  
Cross-Border Trade & Business Development

Rozwój sprzedaży i handel na rynkach Polski, Węgier i Bałkanów.

## Stan

Gotowe: branding, komunikacja zespołowa, formularz potrzeb klienta, backend e-mail pod Vercela, obsługa błędów i testy. Zachowano istniejący projekt graficzny oraz lokalne zdjęcie i fonty.

Wysyłka wymaga własnej konfiguracji Resend, docelowej skrzynki oraz pełnej informacji o przetwarzaniu danych. Brak konfiguracji blokuje wysyłanie. Obecny podgląd Sites jest statyczny: pokazuje stronę i formularz, ale nie uruchamia funkcji Vercela. Wysyłka będzie działać na Vercelu po konfiguracji. Nie wykonano rzeczywistej wysyłki ani wdrożenia na Twoim koncie Vercel.

## 1. VS Code

Rozpakuj ZIP. W VS Code wybierz File → Open Folder i otwórz folder `Hubalk-Partners`, w którym jest ten README oraz `package.json`. Nie otwieraj wyłącznie `dist`.

Projekt nie wymaga Reacta ani kompilowania. Do zmian tekstów i stylów wystarczą:

| Plik | Zawartość |
|---|---|
| `dist/index.html` | Teksty, sekcje, logo tekstowe, pola formularza |
| `dist/styles.css` | Wygląd, odstępy, rozmiary, wersja mobilna |
| `dist/app.js` | Menu, formularz, komunikaty, publiczne dane CONTACT |
| `dist/assets/` | Zdjęcie, favicon i fonty |
| `api/inquiry.js` | Funkcja Vercela |
| `lib/inquiry.js` | Walidacja i wysyłka uporządkowanej wiadomości |
| `.env.example` | Nazwy ustawień serwerowych; bez kluczy |
| `vercel.json` | Hosting statyczny i nagłówki |

Do lokalnego obejrzenia wyglądu użyj rozszerzenia Live Server na `dist/index.html`, z katalogiem głównym ustawionym na `dist`. Sam Live Server nie obsługuje API, więc formularz pokaże niedostępną wysyłkę. Do pracy z API po połączeniu projektu z Vercel użyj `npx vercel dev` w katalogu głównym. Ta komenda może zainstalować CLI i poprosić o logowanie. Dodaj lokalny origin wyświetlony przez CLI do ALLOWED_ORIGINS w lokalnych ustawieniach. Do testów kodu wystarczy Node.js 22 lub nowszy: `node --test tests/inquiry.test.js`. Testy korzystają z atrap poczty, nie wysyłają e-maili.

## 2. GitHub

Najłatwiej w VS Code: Source Control → Initialize Repository → wpisz opis → Commit → Publish to GitHub → wybierz prywatne repozytorium `hubalk-partners`. Zaloguj się, gdy poprosi VS Code. ZIP nie zawiera historii poprzedniego repozytorium.

Alternatywa w terminalu, po utworzeniu pustego repozytorium na GitHubie (bez README):

```bash
git init
git add .
git commit -m "Hubalk Partners: strona i formularz"
git branch -M main
git remote add origin https://github.com/TWOJ-LOGIN/hubalk-partners.git
git push -u origin main
```

Podmień TWOJ-LOGIN. Klucze wpisuj w ustawieniach Vercela albo lokalnym `.env.local`, nigdy w HTML/JS wysyłanym do przeglądarki. `.gitignore` wyklucza pliki z sekretami.

## 3. Vercel i domena

1. Vercel → Add New → Project → Import Git Repository → `hubalk-partners`.
2. Root Directory: katalog główny. Framework Preset: Other. Output Directory: `dist`. Build Command: pozostaw pustą; strona nie ma procesu kompilacji. Repozytorium zawiera odpowiedni `vercel.json`.
3. W Environment Variables ustaw wartości z tabeli poniżej dla Production. Dla Preview użyj osobnej skrzynki testowej i jawnie dodanych adresów podglądu.
4. Deploy. W projekcie → Settings → Domains dodaj `hubalk.pl` i `www.hubalk.pl`. U rejestratora wpisz dokładnie rekordy DNS pokazane przez Vercel; wybierz jeden główny adres i przekierowanie drugiego.
5. Po zmianach zmiennych zrób nowe wdrożenie. Wyślij własne zapytanie testowe, sprawdź odbiór oraz folder spam. Potwierdzenie z API oznacza przyjęcie wiadomości przez usługę pocztową, a nie gwarancję jej dostarczenia do skrzynki.

Vercel łączy repozytorium GitHub z wdrożeniami: push na gałąź produkcyjną aktualizuje stronę. Pozostałe gałęzie mogą tworzyć podglądy. Dokumentacja: https://vercel.com/docs/git/vercel-for-github oraz https://vercel.com/docs/project-configuration/vercel-json . Funkcja bazuje na wspieranym eksporcie fetch: https://vercel.com/docs/functions/runtimes/node-js .

## 4. Poczta

Załóż konto Resend, dodaj posiadaną domenę i zweryfikuj ją przez rekordy DNS wskazane przez usługę. Możesz użyć wydzielonej subdomeny do wysyłki. Zachowaj istniejące rekordy obsługujące Waszą skrzynkę. Resend w tym projekcie wysyła powiadomienia; nie zastępuje skrzynki odbiorczej.

| Zmienna | Co wpisać |
|---|---|
| RESEND_API_KEY | Klucz wysyłkowy Resend; sekret tylko na serwerze |
| CONTACT_FROM | Nadawca w zweryfikowanej domenie, np. `Hubalk Partners <formularz@hubalk.pl>` — przykład, nie utworzony adres |
| CONTACT_TO | Wasza istniejąca skrzynka, na którą mają trafiać zapytania |
| ALLOWED_ORIGINS | `https://hubalk.pl,https://www.hubalk.pl` oraz dokładny adres Vercela, jeśli z niego korzystasz |
| PRIVACY_NOTICE | Pełna, zatwierdzona informacja dla osoby wypełniającej formularz, z prawdziwymi danymi administratora |

Nie wysyłaj klucza API w rozmowie. Wklej go bezpośrednio do ustawień Vercela. PRIVACY_NOTICE jest publicznie pokazywane przy formularzu; nie jest sekretem. Nie uzupełniliśmy danych prawnych fikcyjnymi informacjami.

Dokumentacja nadawcy: https://resend.com/docs/dashboard/domains/introduction . Wysyłka: https://resend.com/docs/api-reference/emails/send-email . Ponawianie bez duplikatów: https://resend.com/docs/dashboard/emails/idempotency-keys . Zabezpieczenie przed duplikatami obowiązuje w oknie ważności kluczy po stronie Resend; nowa karta lub zmiana odpowiedzi tworzy nowe zapytanie.

Backend ogranicza wielkość żądania, waliduje pola, wymaga dozwolonego originu i zawiera honeypot. To podstawowe filtry, nie pełna ochrona przed automatycznym spamem: origin można podrobić poza przeglądarką. Przed kampanią ustaw ograniczenie liczby żądań POST do `/api/inquiry` w firewallu Vercela odpowiednie do wybranego planu. Nie ma bazy CRM, automatycznego newslettera ani załączników. Dane trafiają do Resend i docelowej skrzynki. Ustal z administratorem zasady przechowywania oraz docelową informację prywatności.

## 5. Co przychodzi w mailu

Temat: `Hubalk Partners — nowe zapytanie: Sprzedaż` (lub Zakup / Nowy rynek).

Treść zawiera podpisane pola: cel, imię, firma, telefon, e-mail, potrzeba, kierunek, ilość/termin/warunki, preferowany czas rozmowy i identyfikator. Brakujące pola opcjonalne pokazują „Nie podano”. Jeśli klient poda e-mail, przycisk Odpowiedz w Waszej poczcie kieruje odpowiedź do niego. Odbiorca powiadomienia jest stały, klient nie może go zmienić.

## 6. Przed startem publicznym

Uzupełnij rzeczywiste dane firmy i bezpośredni kontakt w CONTACT w `dist/app.js`. Wpisz pełną informację PRIVACY_NOTICE. Skonfiguruj pocztę i wykonaj rzeczywisty test odbioru. Strona ma obecnie celowo `noindex, nofollow` oraz blokadę w robots.txt. Dopiero po gotowości do indeksowania zmień meta robots i `dist/robots.txt`, dodaj canonical dla wybranej domeny. Sama zmiana logo nie podłącza domeny ani nie tworzy skrzynki.

## 7. Jak zgłaszać poprawki oszczędnie

Po przeniesieniu wybierz repozytorium GitHub jako jedyne źródło aktualnej wersji. Udostępniaj mi bieżący projekt lub konkretne pliki z niego. Zmiany wykonane lokalnie w VS Code nie pojawiają się automatycznie w tej rozmowie.

Najwydajniejszy format:

> Projekt Hubalk, aktualna wersja: [repozytorium/gałąź lub załączony plik].
> Tylko te 3 zmiany:
> 1. Sekcja kontakt: zamień „X” na „Y”.
> 2. Telefon: odstęp pod nagłówkiem zmniejsz z 24 do 16 px.
> 3. Przycisk formularza: tekst „Oddzwońcie do mnie”.
> Bez przebudowy pozostałych sekcji. Sprawdź tylko zmienione elementy. Krótkie podsumowanie; bez publikacji.

Zbieraj kilka drobnych uwag w jednym komunikacie. Przy wyglądzie dołącz zrzut z zaznaczeniem oraz szerokość ekranu. Podawaj docelowy tekst, jeśli już go znasz. Zmiany tekstowe oznaczaj jako „tylko treść”, wizualne jako „tylko CSS”. Oddziel etap korekt od publikacji. Nie proś o ponowne generowanie całej strony. Nie można obiecać stałej liczby tokenów: część odczytów i weryfikacji jest konieczna, szczególnie przy formularzu i wysyłce.

## Wersje językowe

Przełącznik pod menu wybiera PL, HU, SR/HR (serbsko-chorwacki, alfabet łaciński) lub EN. Parametr `?lang=hu`, `?lang=sh` albo `?lang=en` pozwala otworzyć i udostępnić konkretną wersję; bez parametru domyślny jest polski. Zmiana języka zachowuje wpisane dane. Teksty są w `dist/locales.js`; mechanizm w `dist/i18n.js`. Nowe polskie teksty trzeba dodać do słownika we wszystkich trzech językach. Stały angielski descriptor marki pozostaje taki sam.

Dodaj również pełne informacje prywatności w zmiennych `PRIVACY_NOTICE_HU`, `PRIVACY_NOTICE_SH`, `PRIVACY_NOTICE_EN`. Każda wersja formularza wymaga swojej informacji, aby włączyć wysyłkę. Wiadomość do zespołu ma polskie etykiety i wskazuje język formularza; odpowiedzi klienta pozostają w oryginale. Nie jest wysyłany automatyczny e-mail do klienta — potwierdzenie wyświetla się na stronie w wybranym języku. Flagi: lipis/flag-icons (MIT), źródło https://github.com/lipis/flag-icons ; licencja w `dist/assets/flags/LICENSE`.
