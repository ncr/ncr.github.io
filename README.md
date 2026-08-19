# blog

Strona „o mnie" + blog (Astro, statyka; układ wzorowany na world.hey.com) z komentarzami
i statystykami bez bazy danych: dane żyją w przeglądarkach czytelników i synchronizują się
przez CRDT (Yjs). Treść „o mnie" edytujesz w `site/src/site.ts`, awatar w `site/public/avatar.svg`.

```
site/         Astro – strona, wpisy (src/content/blog/*.md), wyspy: komentarze (src/lib/comments.ts), statystyki (src/lib/stats.ts)
shared/       crypto.js (Ed25519, PoW, atestacja) i rules.js (reguły ważności) – wspólne dla przeglądarki i peera
peer/         „wieczny peer": jeden proces Node = statyka + /submit + /visit + /sync (odczyt) + /signal
peer/tools/   keygen.mjs (klucz właściciela), moderate.mjs (list/hide/unhide), selftest.mjs (test bramki)
```

## Jak to działa

Jeden dokument Yjs na wpis (`room = blog/<slug>`).

| warstwa | co robi |
|---|---|
| peer (kontener) | **jedyny pisarz.** `POST /submit` sprawdza komentarz, atestuje go swoim kluczem i wpisuje do dokumentu. `WS /sync` tylko rozdaje – update'y od klientów ignoruje. Trwałość: LevelDB w `/data`. |
| przeglądarka, `viewDoc` | kopia zaufana, w IndexedDB; podpięty WebSocket do peera; renderowana |
| przeglądarka, `netDoc` | kopia sieciowa w pamięci; WebRTC do innych przeglądarek; do `viewDoc` przechodzą z niej tylko pojedyncze, sprawdzone wpisy (nigdy nadpisania ani usunięcia) |

Co musi spełniać komentarz, żeby go ktokolwiek zobaczył:

1. **Kształt**: ≤40 znaków nick, ≤2000 znaków treść, dokładnie 9 pól, `room` zgodny z wpisem.
2. **Proof-of-work**: SHA-256 kanonicznej postaci ma `POW_BITS` zer wiodących (liczone w Web Workerze).
3. **Podpis autora** (Ed25519, klucz generowany w przeglądarce, nieeksportowalny).
4. **Atestacja peera** – podpis peera nad całością. Bez niej wpis jest niewidoczny, więc
   wstrzyknięcie czegokolwiek z pominięciem `/submit` (np. po WebRTC) nic nie daje.
5. **Nieukryty** przez właściciela (`mod`, podpis kluczem `OWNER_PUBKEY`) i nie powyżej
   5 komentarzy z tego samego klucza na 10 minut (reguła liczona lokalnie, deterministyczna).

Dodatkowo w `/submit`: limity na IP i na klucz autora (okno przesuwne), limit globalny
na minutę, tani screener treści (≥3 linki, duplikat, nie-tekst, powtórzenia) i opcjonalnie
Akismet. Odrzucenie wraca do przeglądarki jako komunikat („za dużo linków" itd.).

Czego to nie daje: komentowania, gdy peer leży (czytanie działa z cache i po WebRTC).
Spam tani jak ziemia (botnet, dużo IP) nadal może się przebić w tempie
`RATE_IP` × liczba adresów – wtedy podnieś `POW_BITS` albo włącz Akismet.

## Dwa języki, wątki, „Steam Charts"

- **PL/EN**: przełącznik w prawym górnym rogu, wybór pamiętany (`localStorage blog:lang`), domyślnie z języka
  przeglądarki. Statyczne napisy są w HTML w obu wersjach (`<T pl en/>`, CSS pokazuje jedną wg `<html lang>`,
  bez mignięcia – język ustawia inline skrypt w `<head>`); napisy z JS przez `t()` w `src/lib/i18n.ts`.
  Bio w `src/site.ts` ma `pl` i `en`. Wpis może mieć wersję w drugim języku: drugi plik `.md` z `lang: en`
  i tym samym `key` – lista pokazuje wersję w języku strony, strona wpisu linkuje do drugiej; komentarze
  są wspólne (room = `key`).
- **Wątki**: jeden poziom – „odpowiedz" pod komentarzem pierwszego rzędu, odpowiedzi liniowo pod nim
  (`parent` w komentarzu; peer sprawdza, że rodzic istnieje i sam nie jest odpowiedzią).
- **Strona główna**: blok w duchu Steam Charts – czyta teraz, szczyt 24 h, szczyt 7 dni, rekord z datą
  (`online.peak`, pisze peer), wizyt łącznie, wykres 7 dni.

## Głosy, reakcje autora, profile, ksywki

- **▲/▼** – mapa `votes`, klucz `<komentarz>|<głosujący>`, jeden głos na tożsamość, drugie
  kliknięcie cofa. `POST /vote`: PoW 16× lżejszy niż komentarz (`votePowBits`), limity na IP i klucz,
  atestacja. Wynik = suma najnowszych ważnych głosów (liczona u czytelnika).
- **Reakcja autora** – mapa `reactions`, jedna na komentarz, podpisana kluczem właściciela
  (`POST /react`), pokazywana jako wyróżniona plakietka pod treścią. Żeby reagować i moderować
  z przeglądarki: wklej JWK właściciela na `/me/` (importowany jako nieeksportowalny CryptoKey).
  Właściciel widzi też ukryte komentarze (wyszarzone) i może je odkryć.
- **Profil** `/u/?k=<klucz>` – wszystkie komentarze jednej tożsamości; strona statyczna, skrypt
  przegląda repliki wszystkich wpisów (lista z `/posts.json`).
- **Ksywka** pamiętana w localStorage po pierwszym komentarzu; „zmień ksywkę" → pole, blur/Enter zapisuje.
  Obok ksywki krótkie id `#xxxx` (16 bitów klucza, 65 536 wartości) i kolorowa plakietka z klucza.

## Statystyki (online, online w czasie, wizyty)

Ten sam schemat co komentarze, dokument `site`, pisze tylko peer, każdy wpis atestowany:

- `online.now` – liczba przeglądarek podłączonych po WebSocket do `site` (dwie karty = jedna osoba,
  id przeglądarki w `?c=`), odświeżane przy każdej zmianie;
- `history.<minuta>` – próbka co minutę, trzymana 7 dni; stopka rysuje z tego ostatnie 24 h
  (maksimum w koszykach 15-minutowych);
- `visits.<ścieżka>` i `visits._total` – `POST /visit` z każdej strony, liczone raz na IP i stronę na 30 min.

Przeglądarka przyjmuje po WebRTC tylko wpisy z ważną atestacją i nowszym `ts`, więc nikt nie
„dopisze" sobie wizyt ani osób online z pominięciem peera.

## Uruchomienie

```bash
node peer/tools/keygen.mjs ~/.config/blog-owner.jwk.json   # raz; prywatny JWK poza repo
cp .env.example .env                                         # wpisz OWNER_PUBKEY
docker compose up -d --build                                 # http://localhost:8080
```

Dev bez dockera:

```bash
cd peer && npm i && DATA_DIR=./data OWNER_PUBKEY=... POW_BITS=12 node server.mjs   # :8080
cd site && npm i && cp .env.example .env && npm run dev                           # :4321 → peer :8080
```

Moderacja i test (z dowolnej maszyny, która widzi peera):

```bash
cd peer
PEER_URL=https://twoja-domena node tools/moderate.mjs list blog/pierwszy-wpis
OWNER_KEY=~/.config/blog-owner.jwk.json PEER_URL=https://twoja-domena node tools/moderate.mjs hide blog/pierwszy-wpis <id>
PEER_URL=http://localhost:8080 node tools/selftest.mjs     # bramka: PoW, podpis, linki, duplikat, limity, wizyty, głosy, WS read-only
```

Za HTTPS odpowiada reverse proxy przed kontenerem (Caddy/Traefik): przepuszcza WebSocket
na `/sync/*` i `/signal`; ustaw wtedy `TRUST_PROXY=1`.
