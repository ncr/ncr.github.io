// Obecność: awareness z y-webrtc w pokoju 'site'. Każda karta ustawia {cid} (id przeglądarki
// z localStorage), liczba czytających = liczba różnych cid (dwie karty = jedna osoba).
// To dane ulotne i niepodpisane – każdy może zawyżyć licznik; przyjmujemy to świadomie,
// bo obecność jest z natury chwilowa i nieweryfikowalna bez centralnego punktu.
import type { Room } from './room'

export function clientId(): string {
  let id = localStorage.getItem('blog:cid')
  if (!id || !/^[\w-]{8,32}$/.test(id)) {
    id = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(12)))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
    localStorage.setItem('blog:cid', id)
  }
  return id
}

export function joinPresence(r: Room, onChange: (count: number) => void) {
  const aw = r.rtc.awareness
  aw.setLocalState({ cid: clientId() })
  const count = () => {
    const cids = new Set<string>()
    for (const st of aw.getStates().values()) if (st && typeof st.cid === 'string') cids.add(st.cid)
    return Math.max(1, cids.size)
  }
  aw.on('change', () => onChange(count()))
  onChange(count())
}
