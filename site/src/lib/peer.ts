// Wspólne dla wysp (komentarze, statystyki): adresy peera, /peer.json, id przeglądarki,
// nazwy cache. Cache w IndexedDB jest kluczowany kluczem publicznym peera: nowy /data
// w kontenerze = nowy klucz = świeży cache (stare wpisy nie „wygrywają" z nowymi w CRDT).
export interface PeerInfo { pubkey: string; ownerPubkey: string; powBits: number; online?: number }

export function endpoints(peerUrl = (document.documentElement.dataset.peer || '')) {
  // Domyślnie ten sam host co strona. PUBLIC_PEER_URL nadpisuje (astro dev na :4321, peer na :8080).
  const http = (peerUrl || location.origin).replace(/^ws/, 'http').replace(/\/$/, '')
  const ws = http.replace(/^http/, 'ws')
  return { http, sync: `${ws}/sync`, signal: `${ws}/signal` }
}

const LAST_PEER = 'blog:peer'
let peerPromise: Promise<PeerInfo | null> | null = null
/** /peer.json; gdy peer leży – ostatnia znana odpowiedź z localStorage (żeby czytać z cache). */
export function getPeerInfo(): Promise<PeerInfo | null> {
  return peerPromise ??= fetch(`${endpoints().http}/peer.json`).then(r => r.json())
    .then((p: PeerInfo) => { localStorage.setItem(LAST_PEER, JSON.stringify(p)); return p })
    .catch(() => { const last = localStorage.getItem(LAST_PEER); return last ? { ...JSON.parse(last), offline: true } : null })
}
export const peerIsLive = (p: PeerInfo | null) => !!p && !(p as any).offline

export const cacheName = (p: PeerInfo | null, kind: 'peer' | 'net', room: string) =>
  `blog:${p ? p.pubkey.slice(0, 8) : 'nopeer'}:${kind}:${room}`

/** Stałe id tej przeglądarki (do liczenia „online": dwie karty = jedna osoba). */
export function clientId(): string {
  let id = localStorage.getItem('blog:cid')
  if (!id || !/^[\w-]{8,32}$/.test(id)) {
    id = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(12)))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
    localStorage.setItem('blog:cid', id)
  }
  return id
}
