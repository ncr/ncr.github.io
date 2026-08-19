// Podpisy Ed25519 + proof-of-work przez WebCrypto. Jeden plik dla przeglądarki (site/)
// i Node (peer/), stąd zero zależności.

const subtle = globalThis.crypto.subtle
const te = new TextEncoder()

export const b64u = {
  enc: (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''),
  dec: (s) => Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0)),
}

/** Para kluczy; klucz prywatny nieeksportowalny (przeglądarka) albo eksportowalny (narzędzia). */
export async function generateKeyPair(extractable = false) {
  return subtle.generateKey({ name: 'Ed25519' }, extractable, ['sign', 'verify'])
}

export async function exportPublicKey(pub) {
  return b64u.enc(await subtle.exportKey('raw', pub))
}

export async function importPublicKey(pubB64u) {
  return subtle.importKey('raw', b64u.dec(pubB64u), { name: 'Ed25519' }, true, ['verify'])
}

export async function exportPrivateJwk(priv) { return subtle.exportKey('jwk', priv) }
export async function importPrivateJwk(jwk) {
  return subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['sign'])
}

/**
 * Kanoniczna serializacja do podpisu autora: klucze posortowane, bez `sig` i `attest`.
 * Obie strony muszą odtworzyć identyczne bajty.
 */
export function canonical(obj) {
  return canonicalExcept(obj, ['sig', 'attest'])
}

/** Atestacja peera: podpis nad wszystkim poza `attest` (obejmuje więc `sig` autora). */
export async function attest(priv, obj) {
  return b64u.enc(await subtle.sign({ name: 'Ed25519' }, priv, canonicalExcept(obj, ['attest'])))
}
export async function verifyAttest(obj, peerPubB64u) {
  try {
    if (typeof obj?.attest !== 'string') return false
    const pub = await importPublicKey(peerPubB64u)
    return await subtle.verify({ name: 'Ed25519' }, pub, b64u.dec(obj.attest), canonicalExcept(obj, ['attest']))
  } catch {
    return false
  }
}

export async function sign(priv, obj) {
  return b64u.enc(await subtle.sign({ name: 'Ed25519' }, priv, canonical(obj)))
}

/** Weryfikuje `obj.sig` kluczem `obj.pubkey` (albo podanym `pubB64u`). */
export async function verify(obj, pubB64u = obj.pubkey) {
  try {
    if (typeof obj?.sig !== 'string' || typeof pubB64u !== 'string') return false
    const pub = await importPublicKey(pubB64u)
    return await subtle.verify({ name: 'Ed25519' }, pub, b64u.dec(obj.sig), canonical(obj))
  } catch {
    return false
  }
}

export const randomId = () => b64u.enc(crypto.getRandomValues(new Uint8Array(12)))

// ---------- proof-of-work (hashcash) ----------
// Hash liczony z kanonicznej postaci bez `sig` i `attest` (ale z `nonce`).
// Wymagamy `bits` zer wiodących. Koszt ponosi autor, sprawdzenie jest darmowe.

export function canonicalExcept(obj, omit) {
  const rest = Object.fromEntries(Object.entries(obj).filter(([k]) => !omit.includes(k)).sort(([a], [b]) => a < b ? -1 : 1))
  return te.encode(JSON.stringify(rest))
}

export function leadingZeroBits(bytes) {
  let n = 0
  for (const b of bytes) {
    if (b === 0) { n += 8; continue }
    n += Math.clz32(b) - 24
    break
  }
  return n
}

export async function sha256(bytes) {
  return new Uint8Array(await subtle.digest('SHA-256', bytes))
}

export async function powBits(obj) {
  return leadingZeroBits(await sha256(canonicalExcept(obj, ['sig', 'attest'])))
}

/** Szuka nonce; `onProgress(n)` co 4096 prób. Mutuje i zwraca obj. */
export async function mine(obj, bits, onProgress) {
  obj.nonce = 0
  for (;;) {
    if (await powBits(obj) >= bits) return obj
    obj.nonce++
    if (onProgress && (obj.nonce & 4095) === 0) onProgress(obj.nonce)
  }
}
