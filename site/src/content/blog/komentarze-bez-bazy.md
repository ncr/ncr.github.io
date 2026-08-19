---
title: Komentarze bez bazy danych
date: 2026-08-18
description: Jak ten blog trzyma komentarze w przeglądarkach czytelników i dlaczego nikt ich nie zaspamuje.
---

Każdy komentarz pod wpisem jest podpisany kluczem wygenerowanym w przeglądarce autora,
opłacony dowodem pracy (kilkaset tysięcy hashy SHA-256) i podpisany drugi raz przez
mój serwer – jeden wiecznie włączony kontener. Czytelnicy synchronizują się między sobą
przez WebRTC, a kontener trzyma kopię dla tych, którzy przyjdą później.

Bazy danych nie ma. Jest CRDT (Yjs), plik LevelDB w kontenerze i IndexedDB w twojej przeglądarce.
