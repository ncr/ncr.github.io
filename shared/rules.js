// Reguły ważności – identyczne u każdego uczestnika (przeglądarka i wieczny peer).
// Nie ma atestacji ani bramki: każdy odbiorca sam sprawdza każdy wpis
// (kształt, dowód pracy, podpis autora; wpisy moderacji/reakcji – podpis właściciela).
import { verify, powBits } from './crypto.js'

export const LIMITS = { author: 40, text: 2000, id: 32 }
export const REACTIONS = ['❤️', '👍', '😂', '🎯', '🤔']
// Klucze wpisów zawierają ts: wpis jest niezmienny, zmiana = nowy wpis, a stan
// (aktualny głos, reakcja, ukrycie) to redukcja „najnowszy ts wygrywa" po wartościach.
// Dzięki temu nie ma nadpisań tego samego klucza w CRDT – nadpisanie może przegrać
// konflikt map Yjs (rozstrzygany po id klienta, nie po czasie) i zniknąć u części peerów.
export const voteKey = v => `${v.id}|${v.pubkey}|${v.ts}`
export const modKey = m => `${m.id}|${m.ts}`
export const reactionKey = r => `${r.id}|${r.ts}`

/** Najnowszy wpis per grupa (np. głos per komentarz+głosujący). */
export function latestBy(values, groupFn) {
  const out = new Map()
  for (const v of values) {
    const g = groupFn(v)
    const cur = out.get(g)
    if (!cur || v.ts > cur.ts || (v.ts === cur.ts && v.sig > cur.sig)) out.set(g, v)
  }
  return out
}
export const visitKey = v => `${v.day}|${v.path}|${v.pubkey}`
export const dayOf = ts => new Date(ts).toISOString().slice(0, 10)

const ID_RE = /^[\w-]{8,32}$/
const baseFields = (o) => typeof o.ts === 'number' && Number.isFinite(o.ts)
  && typeof o.pubkey === 'string' && o.pubkey.length === 43
  && typeof o.nonce === 'number' && Number.isInteger(o.nonce) && o.nonce >= 0
  && typeof o.sig === 'string' && o.sig.length === 86

// ---------- komentarz ----------
export function commentShape(c, room) {
  if (!c || typeof c !== 'object') return 'not-object'
  if (c.v !== 1) return 'version'
  if (c.room !== room) return 'room'
  if (typeof c.id !== 'string' || !ID_RE.test(c.id)) return 'id'
  if (typeof c.author !== 'string' || !c.author.trim() || c.author.length > LIMITS.author) return 'author'
  if (typeof c.text !== 'string' || !c.text.trim() || c.text.length > LIMITS.text) return 'text'
  if (!baseFields(c)) return 'fields'
  // wątek: opcjonalne `parent` = id komentarza pierwszego rzędu (jeden poziom; odbiorca
  // pokazuje odpowiedź tylko, gdy widzi rodzica pierwszego rzędu)
  const hasParent = c.parent !== undefined
  if (hasParent && (typeof c.parent !== 'string' || !ID_RE.test(c.parent) || c.parent === c.id)) return 'parent'
  if (Object.keys(c).length !== (hasParent ? 10 : 9)) return 'extra-fields' // v room id author text ts pubkey nonce sig [parent]
  return null
}
export async function checkComment(c, { room, powBits: bits }) {
  const shape = commentShape(c, room)
  if (shape) return `shape:${shape}`
  if (await powBits(c) < bits) return 'pow'
  if (!await verify(c)) return 'sig'
  return null
}

// ---------- głos (▲/▼); jeden na tożsamość i komentarz, klucz = `${id}|${pubkey}`, nowszy ts wygrywa ----------
export function voteShape(v, room) {
  if (!v || typeof v !== 'object') return 'not-object'
  if (v.v !== 1 || v.room !== room) return 'room'
  if (typeof v.id !== 'string' || !ID_RE.test(v.id)) return 'id'
  if (v.value !== 1 && v.value !== -1 && v.value !== 0) return 'value'
  if (!baseFields(v)) return 'fields'
  if (Object.keys(v).length !== 8) return 'extra-fields' // v room id value ts pubkey nonce sig
  return null
}
export async function checkVote(v, { room, powBits: bits }) {
  const shape = voteShape(v, room)
  if (shape) return `shape:${shape}`
  if (await powBits(v) < bits) return 'pow'
  if (!await verify(v)) return 'sig'
  return null
}

// ---------- wizyta: „tożsamość X była na stronie P w dniu D"; klucz = `${day}|${path}|${pubkey}` ----------
export function visitShape(x) {
  if (!x || typeof x !== 'object') return 'not-object'
  if (x.v !== 1 || x.room !== 'site') return 'room'
  if (typeof x.path !== 'string' || !/^\/([\w-]+\/)*$/.test(x.path) || x.path.length > 120) return 'path'
  if (typeof x.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.day)) return 'day'
  if (!baseFields(x)) return 'fields'
  if (x.day !== dayOf(x.ts)) return 'day-mismatch'
  if (Object.keys(x).length !== 8) return 'extra-fields' // v room path day ts pubkey nonce sig
  return null
}
export async function checkVisit(x, { powBits: bits }) {
  const shape = visitShape(x)
  if (shape) return `shape:${shape}`
  if (await powBits(x) < bits) return 'pow'
  if (!await verify(x)) return 'sig'
  return null
}

// ---------- moderacja (podpis właściciela; nowszy ts wygrywa) ----------
export function modShape(m, room) {
  if (!m || typeof m !== 'object') return 'not-object'
  if (m.v !== 1 || m.room !== room) return 'room'
  if (typeof m.id !== 'string' || !ID_RE.test(m.id)) return 'id'
  if (m.action !== 'hide' && m.action !== 'unhide') return 'action'
  if (typeof m.ts !== 'number') return 'ts'
  if (typeof m.pubkey !== 'string' || typeof m.sig !== 'string') return 'sig'
  return null
}
export async function checkMod(m, { room, ownerPubkey }) {
  const shape = modShape(m, room)
  if (shape) return `shape:${shape}`
  if (!ownerPubkey || m.pubkey !== ownerPubkey) return 'not-owner'
  if (!await verify(m)) return 'sig'
  return null
}

// ---------- reakcja właściciela (jedna na komentarz; emoji '' = zdjęta; nowszy ts wygrywa) ----------
export function reactionShape(r, room) {
  if (!r || typeof r !== 'object') return 'not-object'
  if (r.v !== 1 || r.room !== room) return 'room'
  if (typeof r.id !== 'string' || !ID_RE.test(r.id)) return 'id'
  if (r.emoji !== '' && !REACTIONS.includes(r.emoji)) return 'emoji'
  if (typeof r.ts !== 'number') return 'ts'
  if (typeof r.pubkey !== 'string' || typeof r.sig !== 'string') return 'sig'
  return null
}
export async function checkReaction(r, { room, ownerPubkey }) {
  const shape = reactionShape(r, room)
  if (shape) return `shape:${shape}`
  if (!ownerPubkey || r.pubkey !== ownerPubkey) return 'not-owner'
  if (!await verify(r)) return 'sig'
  return null
}

/**
 * Ten sam klucz publiczny może mieć najwyżej `max` widocznych komentarzy w oknie `windowMs`
 * (deterministyczne – u wszystkich ten sam wynik). Zwraca Set id ukrytych.
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
