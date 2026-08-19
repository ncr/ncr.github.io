// Krótki, czytelny identyfikator tożsamości: 16 bitów klucza publicznego jako 4 znaki hex
// (65 536 wartości) + kolor z kolejnego bajtu. To tylko pomoc dla oka – prawdziwą
// tożsamością jest cały klucz (pełny w `title` przy najechaniu).
import { b64u } from '../../../shared/crypto.js'

export interface ShortIdent { id: string; hue: number }

const cache = new Map<string, ShortIdent>()
export function shortIdent(pubkey: string): ShortIdent {
  let s = cache.get(pubkey)
  if (!s) {
    const b = b64u.dec(pubkey)
    s = { id: ((b[0] << 8) | b[1]).toString(16).padStart(4, '0'), hue: Math.round(b[2] * 360 / 256) }
    cache.set(pubkey, s)
  }
  return s
}

export function badge(pubkey: string, extraClass = ''): HTMLElement {
  const { id, hue } = shortIdent(pubkey)
  const el = document.createElement('span')
  el.className = `badge ${extraClass}`.trim()
  el.style.setProperty('--hue', String(hue))
  el.textContent = id
  el.title = `id ${id} · klucz ${pubkey}`
  return el
}
