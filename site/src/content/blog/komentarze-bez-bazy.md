---
title: Comments without a database
date: 2026-08-18
description: How this blog keeps comments in readers' browsers and why nobody can spam them.
---

Every comment under a post is signed with a key generated in its author's browser,
paid for with proof of work (a few hundred thousand SHA-256 hashes) and signed a
second time by my server – one always-on container. Readers sync with each other
over WebRTC, and the container keeps a copy for whoever comes later.

There is no database. There is a CRDT (Yjs), a LevelDB file in the container and
IndexedDB in your browser.
