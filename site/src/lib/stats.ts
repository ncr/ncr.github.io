// Statystyki bez serwera:
//   „czyta teraz"  – awareness w pokoju 'site' (ulotne, niepodpisane – patrz presence.ts)
//   wizyty         – podpisane wpisy „tożsamość X była na stronie P w dniu D" (PoW lekki),
//                    liczone jako unikalni odwiedzający; wykresy z dni/godzin tych wpisów
// Pokój 'site' działa jak każdy inny: replika weryfikuje wpisy, wieczny peer tylko przechowuje.
import { sign } from '../../../shared/crypto.js'
import { dayOf, visitKey } from '../../../shared/rules.js'
import { getIdentity } from './identity'
import { openRoom, publish } from './room'
import { joinPresence } from './presence'
import { VOTE_POW_BITS } from './config'
import { t, locale } from './i18n'

interface Visit { v: 1; room: 'site'; path: string; day: string; ts: number; pubkey: string; nonce: number; sig: string }

let siteRoom: ReturnType<typeof openRoom> | null = null

export async function mountStats(root: HTMLElement) {
  const page = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/'
  const r = siteRoom ??= openRoom('site')
  ;(window as any).__blogStats = r // do debugowania w konsoli

  const onlineEl = root.querySelector<HTMLElement>('.online .value')!
  const hereEl = root.querySelector<HTMLElement>('.visits .here')!
  const totalEl = root.querySelector<HTMLElement>('.visits .total')!
  const chartEl = root.querySelector<SVGSVGElement>('svg')!
  const steam = document.querySelector<HTMLElement>('.steam')

  let online = 1
  let scheduled = false // przed joinPresence: onChange woła render() synchronicznie
  joinPresence(r, n => { online = n; root.classList.add('live'); render() })
  r.viewDoc.getMap('visits').observe(() => render())
  r.ready.then(async () => {
    render()
    // odnotuj wizytę: raz dziennie na stronę (klucz deterministyczny, nadpisanie niczego nie zmienia)
    const id = await getIdentity()
    const day = dayOf(Date.now())
    const key = `${day}|${page}|${id.pubkey}`
    if (r.viewDoc.getMap('visits').has(key)) return
    const draft: Visit = { v: 1, room: 'site', path: page, day, ts: Date.now(), pubkey: id.pubkey, nonce: 0 }
    const { mine } = await import('../../../shared/crypto.js')
    await mine(draft, VOTE_POW_BITS) // lekki PoW, ~40 ms – bez workera
    publish(r, 'visits', visitKey(draft), { ...draft, sig: await sign(id.priv, draft) })
  })

  function render() {
    if (scheduled) return
    scheduled = true
    setTimeout(() => {
      scheduled = false
      const visits = [...r.viewDoc.getMap<Visit>('visits').values()]
      const now = Date.now()
      onlineEl.textContent = String(online)
      // „czytelnicy" = unikalne tożsamości (przeglądarki): na tej stronie / na całej stronie
      hereEl.textContent = String(new Set(visits.filter(v => v.path === page).map(v => v.pubkey)).size)
      totalEl.textContent = String(new Set(visits.map(v => v.pubkey)).size)
      drawChart(chartEl, visits, now, 24 * 3600e3, 3600e3) // stopka: 24 h co godzinę
      if (steam) {
        steam.hidden = false
        const perDay = new Map<string, Set<string>>()
        for (const v of visits) { if (!perDay.has(v.day)) perDay.set(v.day, new Set()); perDay.get(v.day)!.add(v.pubkey) }
        const today = perDay.get(dayOf(now))?.size ?? 0
        const days7 = [...perDay.entries()].filter(([d]) => now - Date.parse(d) < 7 * 24 * 3600e3)
        const peak7 = Math.max(0, ...days7.map(([, s]) => s.size))
        const record = [...perDay.entries()].reduce((best, [d, s]) => s.size > best.n ? { d, n: s.size } : best, { d: '', n: 0 })
        steam.querySelector('.now')!.textContent = String(online)
        steam.querySelector('.today')!.textContent = String(today)
        steam.querySelector('.peak7')!.textContent = String(peak7)
        steam.querySelector('.record')!.textContent = String(record.n)
        steam.querySelector('.when')!.textContent = record.d ? new Date(record.d).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : ''
        steam.querySelector('.visits')!.textContent = String(new Set(visits.map(v => v.pubkey)).size)
        drawChart(steam.querySelector('svg')!, visits, now, 7 * 24 * 3600e3, 24 * 3600e3) // 7 dni po dniach
      }
    }, 0)
  }
}

/** Słupki: unikalni odwiedzający w koszykach `bucket` z ostatnich `span` ms. */
function drawChart(svg: SVGSVGElement, visits: Visit[], now: number, span: number, bucket: number) {
  const W = Number(svg.getAttribute('width')) || 200, H = Number(svg.getAttribute('height')) || 28
  const nb = Math.round(span / bucket)
  const buckets: Set<string>[] = Array.from({ length: nb }, () => new Set())
  for (const v of visits) {
    const age = now - v.ts
    if (age < 0 || age >= span) continue
    buckets[nb - 1 - Math.floor(age / bucket)].add(v.pubkey)
  }
  const max = Math.max(1, ...buckets.map(s => s.size))
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  const bw = W / nb
  let bars = ''
  buckets.forEach((s, i) => {
    if (!s.size) return
    const h = (s.size / max) * (H - 4)
    bars += `<rect x="${(i * bw + bw * 0.15).toFixed(1)}" y="${(H - 1 - h).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${h.toFixed(1)}" fill="currentColor" opacity=".75" rx="1"/>`
  })
  const base = `<line x1="0" y1="${H - 1}" x2="${W}" y2="${H - 1}" stroke="currentColor" stroke-width=".75" opacity=".35"/>`
  svg.innerHTML = bars
    ? base + bars
    : base + `<text x="${W / 2}" y="${H / 2 + 1}" text-anchor="middle" font-size="${Math.min(10, H / 3)}" fill="currentColor" opacity=".45">${t('stats.noHistory')}</text>`
  const maxEl = svg.parentElement!.querySelector('.max'); if (maxEl) maxEl.textContent = bars ? `${t('stats.max')} ${max}` : ''
  svg.setAttribute('aria-label', bars ? `${t('stats.max')} ${max}` : t('stats.noHistory'))
}
