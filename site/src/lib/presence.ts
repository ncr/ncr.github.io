// Obecność: awareness z y-webrtc. Każda karta ustawia {cid} (id przeglądarki z localStorage),
// liczba czytających = liczba różnych cid LUDZI (dwie karty = jedna osoba; wieczny czytelnik
// zgłasza cid 'keeper' i nie jest liczony). Dane ulotne i niepodpisane – każdy może zawyżyć
// licznik; przyjmujemy to świadomie, bo obecności nie da się zweryfikować bez centrali.
// Martwi peerzy znikają: łagodne zamknięcie czyści stan na pagehide, twarde – timeout 30 s
// wbudowany w protokół awareness.
import type { Room } from './room'

export function clientId(): string {
  let id = localStorage.getItem('blog:cid')
  if (!id || !/^[\w-]{8,32}$/.test(id)) {
    id = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(12)))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
    localStorage.setItem('blog:cid', id)
  }
  return id
}

/** Dołącza do obecności pokoju; onChange dostaje liczbę LUDZI (łącznie ze mną). */
export function joinPresence(r: Room, onChange: (count: number) => void) {
  const aw = r.rtc.awareness
  const join = () => aw.setLocalState({ cid: clientId() })
  join()
  // pagehide/pageshow: natychmiastowe zniknięcie przy zamknięciu karty, powrót przy bfcache
  window.addEventListener('pagehide', () => aw.setLocalState(null))
  window.addEventListener('pageshow', e => { if ((e as PageTransitionEvent).persisted) join() })
  const count = () => {
    const cids = new Set<string>()
    for (const st of aw.getStates().values()) if (st && typeof st.cid === 'string' && st.cid !== 'keeper') cids.add(st.cid)
    cids.add(clientId())
    return cids.size
  }
  aw.on('change', () => onChange(count()))
  onChange(count())
}

/** Ilu INNYCH ludzi (poza mną i keeperem) jest w tym pokoju. */
export function othersIn(r: Room): number {
  const me = clientId()
  const cids = new Set<string>()
  for (const st of r.rtc.awareness.getStates().values()) {
    if (st && typeof st.cid === 'string' && st.cid !== 'keeper' && st.cid !== me) cids.add(st.cid)
  }
  return cids.size
}
