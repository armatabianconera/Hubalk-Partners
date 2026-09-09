# Hubalk Partners — publikacja na hubalk.pl

Paczka zawiera aktualną stronę w czterech językach, wszystkie lokalne zasoby oraz backend formularza. Wygląd strony nie został zmieniony. Szczegóły techniczne: README.md.

1. Zainstaluj Git (https://git-scm.com/downloads). Użyj VS Code. Node.js LTS (https://nodejs.org/) jest potrzebny tylko do lokalnego API/testów, a nie do publikacji przez panel Vercel.
2. Rozpakuj ZIP. W VS Code otwórz folder Hubalk-Partners zawierający package.json, vercel.json, dist, api i lib. Nie otwieraj wyłącznie dist.
3. Source Control → Initialize Repository → Stage All Changes → Commit → Publish to GitHub → prywatne repozytorium hubalk-partners. Jeśli Git poprosi o nazwę i e-mail autora, ustaw własne dane. Pliki .env z sekretami są wykluczone przez .gitignore.
4. Vercel → Add New → Project → zaimportuj repozytorium. Wybierz plan komercyjny, np. Pro: Hobby nie dopuszcza firmowego zastosowania (https://vercel.com/docs/limits/fair-use-guidelines).
5. Framework: Other; Root Directory: główny folder repozytorium; Output Directory: dist; Build Command: pusta. Projekt nie ma kompilacji ani zależności do instalacji. Pozostaw automatyczne ustawienia instalacji. Deploy.
6. Otwórz otrzymany adres vercel.app. Sprawdź wygląd, menu, cztery języki i telefon. Bez ustawień z punktu 9 wysyłka formularza pozostaje wyłączona.
7. Settings → Domains: dodaj hubalk.pl oraz www.hubalk.pl. Ustaw hubalk.pl jako adres docelowy, a www jako przekierowanie do niego. Skopiuj dokładne rekordy DNS pokazane przez Vercel, nie wartości z cudzych poradników.
8. nazwa.pl: Panel Klienta → Usługi → Domeny → hubalk.pl → konfiguruj → Ręczna konfiguracja DNS → ZMIEŃ. Ustaw rekord domeny głównej i rekord www zgodnie z Vercel. Jeśli nazwa.pl wymaga pełnej nazwy hosta, wpisz hubalk.pl lub www.hubalk.pl zamiast symbolu @. Usuń tylko sprzeczne rekordy dla tych samych hostów. Zachowaj rekordy poczty i weryfikacji; jeśli masz już pocztę w nazwa.pl, sprawdź wpływ przejścia na tryb ręczny na zarządzany DKIM. Nie zmieniaj serwerów nazw i nie kupuj osobnego hostingu ani SSL na potrzeby tego wdrożenia. Poczekaj na Valid Configuration w Vercel i automatyczny HTTPS.
9. Formularz: załóż Resend, zweryfikuj domenę nadawcy rekordami DNS wskazanymi przez Resend. W Vercel → Settings → Environment Variables dodaj dla Production:
   - RESEND_API_KEY: klucz Resend.
   - CONTACT_FROM: nadawca w zweryfikowanej domenie, np. Hubalk Partners <formularz@hubalk.pl>.
   - CONTACT_TO: istniejąca skrzynka odbiorcza zespołu.
   - ALLOWED_ORIGINS: https://hubalk.pl,https://www.hubalk.pl (dodaj dokładny adres vercel.app tylko jeśli chcesz z niego wysyłać testy).
   - PRIVACY_NOTICE, PRIVACY_NOTICE_HU, PRIVACY_NOTICE_SH, PRIVACY_NOTICE_EN: pełne informacje o przetwarzaniu danych, odpowiednio po polsku, węgiersku, serbsko-chorwacku i angielsku, z rzeczywistymi danymi administratora.
10. Po zmianie zmiennych wybierz Deployments → ostatnie wdrożenie → Redeploy. Kluczy API nie wklejaj do kodu ani rozmowy. Resend wysyła wiadomości; nie tworzy skrzynki odbiorczej.
11. Uzupełnij rzeczywisty kontakt w obiekcie CONTACT w dist/app.js. Przetestuj formularz z własnymi danymi we wszystkich czterech językach i potwierdź odbiór wiadomości. Sprawdź domenę główną i przekierowanie www w oknie prywatnym, bez logowania do Vercela.
12. Obecnie meta robots i dist/robots.txt blokują indeksowanie. Nie przeszkadza to w otwieraniu strony pod domeną. Gdy strona ma trafić do Google, usuń blokady i dodaj właściwy canonical dla hubalk.pl.
13. Kolejne poprawki: zmień pliki → zapisz → Stage → Commit → Push/Sync Changes. Push na gałąź produkcyjną uruchamia nowe wdrożenie w Vercel.

Dokumentacja domeny: https://vercel.com/docs/domains/working-with-domains/add-a-domain
Panel DNS nazwa.pl: https://www.nazwa.pl/pomoc/baza-wiedzy/jak-wlaczyc-reczna-konfiguracje-strefy-dns-domeny-zarejestrowanej-w-nazwa-pl/
Resend: https://resend.com/docs/dashboard/domains/introduction

Nie wykonano wdrożenia na Twoim koncie Vercel, zmian DNS ani rzeczywistej wysyłki e-mail. Te czynności wykonasz w swoich panelach według powyższych kroków.
