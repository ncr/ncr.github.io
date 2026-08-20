# blog

Statyczny blog + strona „o mnie" (ncr.github.io). Astro, układ wzorowany na world.hey.com.

```
site/src/site.ts            nazwisko, avatar, bio
site/src/content/blog/*.md  wpisy (frontmatter: title, date, description, draft)
site/public/                avatar.jpg, styles.css
```

Nowy wpis = plik `.md` + push na `main`; `.github/workflows/pages.yml` buduje i publikuje.

Dev: `cd site && npm i && npm run dev`.

Historia: wersje z komentarzami P2P (Yjs/WebRTC, podpisy, proof-of-work, wieczny czytelnik)
żyją w historii gita do 2026-08-20 – wycięte świadomie, ślepy zaułek.
