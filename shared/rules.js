// Reguły ważności – te same w przeglądarce i u peera. Bez zależności (yjs podaje wołający).
import { verify, verifyAttest, powBits } from './crypto.js'

export const LIMITS = { author: 40, text: 2000, id: 32, skewMs: 10 * 60 * 1000 }

/** Kształt komentarza (bez kryptografii). */
export function commentShape(c, room) {
  if (!c || typeof c !== 'object') return 'not-object'
  if (c.v !== 1) return 'version'
  if (c.room !== room) return 'room'
  if (typeof c.id !== 'string' || !/^[\w-]{8,32}$/.test(c.id)) return 'id'
  if (typeof c.author !== 'string' || !c.author.trim() || c.author.length > LIMITS.author) return 'author'
  if (typeof c.text !== 'string' || !c.text.trim() || c.text.length > LIMITS.text) return 'text'
  if (typeof c.ts !== 'number' || !Number.isFinite(c.ts)) return 'ts'
  if (typeof c.pubkey !== 'string' || c.pubkey.length !== 43) return 'pubkey'
  if (typeof c.nonce !== 'number' || !Number.isInteger(c.nonce) || c.nonce < 0) return 'nonce'
  if (typeof c.sig !== 'string' || c.sig.length !== 86) return 'sig'
  // wątek: opcjonalne `parent` = id komentarza pierwszego rzędu (jeden poziom zagnieżdżenia;
  // że rodzic istnieje i sam nie jest odpowiedzią, sprawdza peer przy /submit)
  const hasParent = c.parent !== undefined
  if (hasParent && (typeof c.parent !== 'string' || !/^[\w-]{8,32}$/.test(c.parent) || c.parent === c.id)) return 'parent'
  const keys = Object.keys(c).filter(k => k !== 'attest')
  if (keys.length !== (hasParent ? 10 : 9)) return 'extra-fields' // v room id author text ts pubkey nonce sig [parent]
  return null
}

export function modShape(m, room) {
  if (!m || typeof m !== 'object') return 'not-object'
  if (m.v !== 1 || m.room !== room) return 'room'
  if (typeof m.id !== 'string' || !/^[\w-]{8,32}$/.test(m.id)) return 'id'
  if (m.action !== 'hide' && m.action !== 'unhide') return 'action'
  if (typeof m.ts !== 'number') return 'ts'
  if (typeof m.pubkey !== 'string' || typeof m.sig !== 'string') return 'sig'
  return null
}

/**
 * Pełna weryfikacja komentarza: kształt, PoW, podpis autora, atestacja peera.
 * `attested=false` – bez atestacji (peer sprawdza świeże zgłoszenie przed podpisaniem).
 */
export async function checkComment(c, { room, powBits: bits, peerPubkey, attested = true }) {
  const shape = commentShape(c, room)
  if (shape) return `shape:${shape}`
  if (await powBits(c) < bits) return 'pow'
  if (!await verify(c)) return 'sig'
  if (attested && !await verifyAttest(c, peerPubkey)) return 'attest'
  return null
}

export async function checkMod(m, { room, ownerPubkey }) {
  const shape = modShape(m, room)
  if (shape) return `shape:${shape}`
  if (m.pubkey !== ownerPubkey) return 'not-owner'
  if (!await verify(m)) return 'sig'
  return null
}

/**
 * Reguła widoczności liczona z całego zbioru (deterministyczna, więc u wszystkich taka sama):
 * ten sam klucz publiczny może mieć najwyżej `max` widocznych komentarzy w oknie `windowMs`.
 * Zwraca Set id ukrytych.
 */
export function floodHidden(comments, { max = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const byKey = new Map()
  for (const c of comments) {
    if (!byKey.has(c.pubkey)) byKey.set(c.pubkey, [])
    byKey.get(c.pubkey).push(c)
  }
  const hidden = new Set()
  for (const list of byKey.values()) {
    list.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1))
    const shown = []
    for (const c of list) {
      while (shown.length && c.ts - shown[0].ts > windowMs) shown.shift()
      if (shown.length >= max) hidden.add(c.id)
      else shown.push(c)
    }
  }
  return hidden
}

// ---------- heurystyki treści (tani „screener") ----------
const URL_RE = /https?:\/\/|www\.|\.(com|net|org|ru|cn|xyz|top|info|biz|pl)\b/gi

/** Zwraca powód odrzucenia albo null. `recent` = wcześniejsze komentarze w tym wpisie. */
export function screenText(c, recent = []) {
  const text = c.text
  const links = (text.match(URL_RE) || []).length
  if (links >= 3) return 'too-many-links'
  const letters = (text.match(/\p{L}/gu) || []).length
  if (text.length >= 20 && letters / text.length < 0.3) return 'not-text'
  const norm = text.toLowerCase().replace(/\s+/g, ' ').trim()
  if (recent.some(r => r.text.toLowerCase().replace(/\s+/g, ' ').trim() === norm)) return 'duplicate'
  if (/(.)\1{30,}/.test(text)) return 'repetition'
  return null
}

// ---------- głosy (▲/▼) ----------
// Jeden głos na tożsamość i komentarz; klucz w mapie 'votes' = `${commentId}|${pubkey}`.
// Wartość 0 = cofnięty głos. Peer nadpisuje poprzedni (jest jedynym pisarzem), przeglądarka
// bierze najnowszy `ts` z ważną atestacją.
export function voteShape(v, room) {
  if (!v || typeof v !== 'object') return 'not-object'
  if (v.v !== 1 || v.room !== room) return 'room'
  if (typeof v.id !== 'string' || !/^[\w-]{8,32}$/.test(v.id)) return 'id'
  if (v.value !== 1 && v.value !== -1 && v.value !== 0) return 'value'
  if (typeof v.ts !== 'number' || !Number.isFinite(v.ts)) return 'ts'
  if (typeof v.pubkey !== 'string' || v.pubkey.length !== 43) return 'pubkey'
  if (typeof v.nonce !== 'number' || !Number.isInteger(v.nonce) || v.nonce < 0) return 'nonce'
  if (typeof v.sig !== 'string' || v.sig.length !== 86) return 'sig'
  if (Object.keys(v).filter(k => k !== 'attest').length !== 8) return 'extra-fields' // v room id value ts pubkey nonce sig
  return null
}
export async function checkVote(v, { room, powBits: bits, peerPubkey, attested = true }) {
  const shape = voteShape(v, room)
  if (shape) return `shape:${shape}`
  if (await powBits(v) < bits) return 'pow'
  if (!await verify(v)) return 'sig'
  if (attested && !await verifyAttest(v, peerPubkey)) return 'attest'
  return null
}
export const voteKey = v => `${v.id}|${v.pubkey}`

// ---------- reakcja autora bloga ----------
// Jedna na komentarz, podpisana kluczem właściciela; emoji '' = zdjęcie reakcji.
export const REACTIONS = ['❤️', '👍', '😂', '🎯', '🤔']
export function reactionShape(r, room) {
  if (!r || typeof r !== 'object') return 'not-object'
  if (r.v !== 1 || r.room !== room) return 'room'
  if (typeof r.id !== 'string' || !/^[\w-]{8,32}$/.test(r.id)) return 'id'
  if (r.emoji !== '' && !REACTIONS.includes(r.emoji)) return 'emoji'
  if (typeof r.ts !== 'number') return 'ts'
  if (typeof r.pubkey !== 'string' || typeof r.sig !== 'string') return 'sig'
  return null
}
export async function checkReaction(r, { room, ownerPubkey }) {
  const shape = reactionShape(r, room)
  if (shape) return `shape:${shape}`
  if (r.pubkey !== ownerPubkey) return 'not-owner'
  if (!await verify(r)) return 'sig'
  return null
}
