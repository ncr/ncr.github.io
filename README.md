# blog

Strona „o mnie" + blog (Astro, statyka; układ wzorowany na world.hey.com) z komentarzami,
głosami i statystykami **bez serwera**: dane żyją w przeglądarkach czytelników, synchronizują
się bezpośrednio po WebRTC (CRDT – Yjs) i każdy uczestnik sam weryfikuje każdy wpis.
Autor bloga utrzymuje jednego zawsze-włączonego uczestnika („wiecznego czytelnika"), ale ten
niczym nie różni się od pozostałych – wykonuje ten sam kod weryfikacji i nie ma żadnej władzy.

```
site/            Astro – strona, wpisy (src/content/blog/*.md), wyspy (src/lib/*)
shared/          crypto.js (Ed25519, PoW), rules.js (reguły ważności), replica.js (kopiowanie
                 net->view po weryfikacji) – wspólne dla przeglądarki i wiecznego czytelnika
peer/server.mjs  infrastruktura bez danych: statyka + signaling WebRTC (/signal)
peer/visitor.mjs wieczny czytelnik: replika w Node (WebRTC przez @roamhq/wrtc), zapis do pliku
peer/tools/      keygen.mjs – klucz właściciela
```

## Model danych

Jeden pokój na wpis (`blog/<slug>`) + pokój `site` (statystyki). Każdy uczestnik trzyma dwa
dokumenty Yjs na pokój:

- **netDoc** – to, co krąży po WebRTC; każdy może tam wpisać cokolwiek, żyje w pamięci
- **viewDoc** – kopia zaufana i trwała (IndexedDB / plik u wiecznego czytelnika); trafiają
  do niej wyłącznie wpisy, które przeszły reguły z `shared/rules.js`

Zasady kopiowania (`shared/replica.js`): komentarze i wizyty są niezmienne per klucz
(pierwszy ważny wygrywa), głosy/moderacja/reakcje – „nowszy ts wygrywa". viewDoc jest
rozgłaszany dalej, więc dane wędrują zakaźnie i autor nie musi być online.

Ważny wpis musi mieć: poprawny kształt (limity długości), **dowód pracy** (SHA-256 z
`POW_BITS` zer wiodących; komentarz ~1 s, głos/wizyta 16× lżejsze) i **podpis Ed25519**
kluczem wygenerowanym w przeglądarce autora (nieeksportowalnym). Moderacja i reakcje
dodatkowo muszą być podpisane kluczem właściciela (`PUBLIC_OWNER_PUBKEY` wbudowany w build).
Do tego reguła przeciw zalewowi: ten sam klucz > 5 widocznych komentarzy / 10 min → ukryte.

Czego ten model NIE daje: limitów na adres IP (nie ma bramki). Ktoś z botnetem może
generować klucze i płacić PoW; obroną jest podnoszenie `POW_BITS` i moderacja. Statystyka
„czyta teraz" (awareness WebRTC) jest ulotna i niepodpisana – da się ją zawyżyć; wizyty są
podpisane i opłacone PoW (liczymy unikalne tożsamości dziennie), ale tożsamości można mnożyć.

## Uruchomienie

```bash
node peer/tools/keygen.mjs ~/.config/blog-owner.jwk.json   # raz; prywatny JWK poza repo
cp .env.example .env                                         # wpisz OWNER_PUBKEY
docker compose up -d --build                                 # http://localhost:8080
```

Kontener = statyka + signaling + wieczny czytelnik (dwa procesy node). Zaufane kopie pokojów
w wolumenie `/data` (pliki `*.yupdate`). `POW_BITS`, `ROOM_NS` i klucz właściciela wchodzą
w build strony i muszą być identyczne we wszystkich kopiach (inaczej wzajemne odrzucanie wpisów).

Dev bez dockera:

```bash
cd site && npm i && PUBLIC_POW_BITS=12 PUBLIC_OWNER_PUBKEY=... npm run build
cd peer && npm i
STATIC_DIR=../site/dist node server.mjs &
STATIC_DIR=../site/dist DATA_DIR=./data POW_BITS=12 OWNER_PUBKEY=... node visitor.mjs
```

Moderacja i reakcje: wklej JWK właściciela na `/me/` (import jako nieeksportowalny CryptoKey);
przy komentarzach pojawią się reakcje ❤️👍😂🎯🤔 i „ukryj/pokaż".

## GitHub Pages (ncr.github.io)

`.github/workflows/pages.yml` publikuje statykę przy pushu na `main`. Zmienne repozytorium
(Settings → Variables): `OWNER_PUBKEY`, `SIGNALS` (CSV adresów `wss://…/signal` – np. tunel
do kontenera). Signaling to jedyna infrastruktura: przedstawia peerów sobie, nie widzi treści.
Bez działającego signalingu czytelnicy widzą tylko swój lokalny cache.
