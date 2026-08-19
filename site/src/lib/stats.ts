// Statystyki (online teraz, online w czasie, wizyty) – ten sam schemat co komentarze:
// pisze wyłącznie peer (każdy wpis atestowany). Przeglądarka trzyma dwie kopie:
//   peerDoc – replika peera (WebSocket), IndexedDB
//   netDoc  – to, co krąży po WebRTC między przeglądarkami, IndexedDB
// Nic nie jest przepisywane między kopiami (przepisanie = nowy wpis w CRDT i konflikt
// z wpisem peera). Renderowanie bierze z obu najnowszy wpis z ważną atestacją.
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebrtcProvider } from 'y-webrtc'
import { WebsocketProvider } from 'y-websocket'
import { verifyAttest } from '../../../shared/crypto.js'
import { endpoints, getPeerInfo, clientId, cacheName, peerIsLive } from './peer'
import { t, locale } from './i18n'

interface Stamped { ts: number; n: number; attest: string; path?: string }
const ROOM = 'site'

export async function mountStats(root: HTMLElement) {
  const ep = endpoints()
  const page = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/'
  const peer = await getPeerInfo()
  const peerDoc = new Y.Doc(), netDoc = new Y.Doc()
  ;(window as any).__blogStats = { peerDoc, netDoc } // do debugowania w konsoli
  const okCache = new Map<string, Promise<boolean>>()
  const valid = (v: any): Promise<boolean> => {
    if (!peer || !v || typeof v.ts !== 'number' || typeof v.n !== 'number' || typeof v.attest !== 'string') return Promise.resolve(false)
    if (!okCache.has(v.attest)) okCache.set(v.attest, verifyAttest(v, peer.pubkey))
    return okCache.get(v.attest)!
  }
  /** Najnowszy ważny wpis pod kluczem, z obu kopii. */
  async function newest(map: string, key: string): Promise<Stamped | null> {
    let best: Stamped | null = null
    for (const d of [peerDoc, netDoc]) {
      const v = d.getMap<Stamped>(map).get(key)
      if (v && (!best || v.ts > best.ts) && await valid(v)) best = v
    }
    return best
  }

  const FROM_PEER = Symbol('from-peer')
  peerDoc.on('update', (u: Uint8Array, origin: unknown) => { if (origin !== FROM_PEER) Y.applyUpdate(netDoc, u, FROM_PEER) })
  let wsUp = false
  Promise.all([
    new IndexeddbPersistence(cacheName(peer, 'peer', ROOM), peerDoc).whenSynced,
    new IndexeddbPersistence(cacheName(peer, 'net', ROOM), netDoc).whenSynced,
  ]).then(() => {
    Y.applyUpdate(netDoc, Y.encodeStateAsUpdate(peerDoc), FROM_PEER)
    render()
    const wsp = new WebsocketProvider(ep.sync, ROOM, peerDoc, { params: { c: clientId() }, disableBc: true }) // bez BroadcastChannel: replika peera ma pochodzić TYLKO od peera (inne karty mogą mieć stary stan)
    new WebrtcProvider(`${location.host}:${ROOM}`, netDoc, { signaling: [ep.signal] })
    wsp.on('status', (e: any) => { wsUp = e.status === 'connected'; render() })
  })
  for (const d of [peerDoc, netDoc]) for (const m of ['online', 'history', 'visits']) d.getMap(m).observe(() => render())

  // wizyta – raz na kartę na stronę (peer i tak dedupluje po IP na 30 min)
  const visitKey = `blog:visited:${page}`
  if (peerIsLive(peer) && !sessionStorage.getItem(visitKey)) {
    fetch(`${ep.http}/visit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: page }) })
      .then(r => { if (r.ok) sessionStorage.setItem(visitKey, '1') }).catch(() => {})
  }

  // --- render ---
  const onlineEl = root.querySelector<HTMLElement>('.online .value')!
  const hereEl = root.querySelector<HTMLElement>('.visits .here')!
  const totalEl = root.querySelector<HTMLElement>('.visits .total')!
  const chartEl = root.querySelector<SVGSVGElement>('svg')!
  const steam = document.querySelector<HTMLElement>('.steam') // blok „Steam Charts" na stronie głównej
  document.addEventListener('blog:lang', () => render())
  let scheduled = false
  function render() {
    if (scheduled) return
    scheduled = true
    setTimeout(async () => {
      scheduled = false
      const now = await newest('online', 'now')
      const here = await newest('visits', page)
      const total = await newest('visits', '_total')
      const hist: Stamped[] = []
      const seen = new Set<string>()
      for (const d of [peerDoc, netDoc]) for (const [k, v] of d.getMap<Stamped>('history')) {
        if (seen.has(k)) continue
        const best = await newest('history', k); if (best) { hist.push(best); seen.add(k) }
      }
      const live = wsUp && !!now && Date.now() - now.ts < 5 * 60e3
      root.classList.toggle('live', live)
      onlineEl.textContent = now ? String(now.n) : '–'
      hereEl.textContent = here ? String(here.n) : '–'
      totalEl.textContent = total ? String(total.n) : '–'
      drawChart(chartEl, hist, 24 * 3600e3, 15 * 60e3)
      if (steam) {
        const peak = await newest('online', 'peak')
        const nowMs = Date.now()
        const maxIn = (ms: number) => hist.filter(h => nowMs - h.ts <= ms).reduce((m, h) => Math.max(m, h.n), 0)
        steam.hidden = false
        steam.querySelector('.now')!.textContent = now ? String(now.n) : '–'
        steam.querySelector('.peak24')!.textContent = hist.length ? String(Math.max(maxIn(24 * 3600e3), now?.n ?? 0)) : '–'
        steam.querySelector('.peak7')!.textContent = hist.length ? String(Math.max(maxIn(7 * 24 * 3600e3), now?.n ?? 0)) : '–'
        steam.querySelector('.record')!.textContent = peak ? String(peak.n) : '–'
        steam.querySelector('.when')!.textContent = peak ? new Date(peak.ts).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : ''
        steam.querySelector('.visits')!.textContent = total ? String(total.n) : '–'
        drawChart(steam.querySelector('svg')!, hist, 7 * 24 * 3600e3, 3600e3)
      }
    }, 0)
  }
}

/** Wykres „online": maksimum w koszykach `bucket` z ostatnich `span` ms. Pusty = sama linia bazowa. */
function drawChart(svg: SVGSVGElement, hist: Stamped[], span: number, bucket: number) {
  const W = Number(svg.getAttribute('width')) || 200, H = Number(svg.getAttribute('height')) || 28, now = Date.now(), nb = span / bucket
  const buckets = new Map<number, number>()
  for (const h of hist) {
    if (now - h.ts > span) continue
    const b = Math.min(nb - 1, Math.floor((h.ts - (now - span)) / bucket))
    buckets.set(b, Math.max(buckets.get(b) ?? 0, h.n))
  }
  const max = Math.max(1, ...buckets.values())
  const pts: string[] = []
  for (let b = 0; b < nb; b++) {
    if (!buckets.has(b)) continue
    pts.push(`${((b / (nb - 1)) * W).toFixed(1)},${(H - 1.5 - (buckets.get(b)! / max) * (H - 4)).toFixed(1)}`)
  }
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  const base = `<line x1="0" y1="${H - 1}" x2="${W}" y2="${H - 1}" stroke="currentColor" stroke-width=".75" opacity=".35"/>`
  if (!pts.length) { svg.innerHTML = base; svg.setAttribute('aria-label', t('stats.noHistory')); return }
  const [lx, ly] = pts[pts.length - 1].split(',')
  svg.innerHTML = base
    + `<polyline fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" points="${pts.join(' ')}"/>`
    + `<circle cx="${lx}" cy="${ly}" r="2" fill="currentColor"/>`
  svg.setAttribute('aria-label', `${t('stats.max')} ${max}`)
  const maxEl = svg.parentElement!.querySelector('.max'); if (maxEl) maxEl.textContent = `${t('stats.max')} ${max}`
}
