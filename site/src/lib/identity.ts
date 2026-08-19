// Tożsamość czytelnika: para kluczy Ed25519 generowana przy pierwszym komentarzu,
// trzymana w IndexedDB jako CryptoKey (klucz prywatny nieeksportowalny –
// skrypt na stronie może nim podpisywać, ale nie może go wyciągnąć).
import { generateKeyPair, exportPublicKey } from '../../../shared/crypto.js'

const DB = 'blog-identity', STORE = 'keys'

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    const r = f(db.transaction(STORE, mode).objectStore(STORE))
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

export interface Identity { priv: CryptoKey; pub: CryptoKey; pubkey: string }

let cached: Promise<Identity> | null = null
export function getIdentity(): Promise<Identity> {
  return cached ??= (async () => {
    const db = await openDb()
    let pair = await tx<CryptoKeyPair | undefined>(db, 'readonly', s => s.get('me'))
    if (!pair) {
      pair = await generateKeyPair(false)
      await tx(db, 'readwrite', s => s.put(pair, 'me'))
    }
    return { priv: pair.privateKey, pub: pair.publicKey, pubkey: await exportPublicKey(pair.publicKey) }
  })()
}

// --- klucz właściciela bloga (opcjonalnie, wklejany raz na /me/) ---
// Trzymany jak klucz czytelnika: CryptoKey nieeksportowalny w IndexedDB. Pozwala reagować
// na komentarze i moderować z przeglądarki, bez CLI.
import { importPrivateJwk } from '../../../shared/crypto.js'

export interface OwnerKey { priv: CryptoKey; pubkey: string }

export async function getOwnerKey(): Promise<OwnerKey | null> {
  const db = await openDb()
  const rec = await tx<{ priv: CryptoKey; pubkey: string } | undefined>(db, 'readonly', s => s.get('owner'))
  return rec ?? null
}
export async function setOwnerKey(jwk: JsonWebKey): Promise<OwnerKey> {
  const priv = await importPrivateJwk(jwk)
  const pub = await crypto.subtle.importKey('jwk', { ...jwk, d: undefined, key_ops: ['verify'] }, { name: 'Ed25519' }, true, ['verify'])
  const pubkey = await exportPublicKey(pub)
  const db = await openDb()
  await tx(db, 'readwrite', s => s.put({ priv, pubkey }, 'owner'))
  return { priv, pubkey }
}
export async function clearOwnerKey() {
  const db = await openDb()
  await tx(db, 'readwrite', s => s.delete('owner'))
}
