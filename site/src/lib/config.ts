// Stałe wbudowywane w build – u wszystkich uczestników muszą być takie same,
// bo każdy weryfikuje wpisy lokalnie (inne POW_BITS = wzajemne odrzucanie wpisów).
export const POW_BITS = Number(import.meta.env.PUBLIC_POW_BITS || 18)
export const VOTE_POW_BITS = Math.max(8, POW_BITS - 4) // głos/wizyta: 16× tańsze niż komentarz
export const OWNER_PUBKEY: string = import.meta.env.PUBLIC_OWNER_PUBKEY || ''
// Przestrzeń nazw pokojów – stała, żeby localhost i produkcja widziały te same dane.
export const ROOM_NS: string = import.meta.env.PUBLIC_ROOM_NS || 'ncr-blog'

/** Adresy signalingu (przedstawianie peerów; zero danych). CSV z builda albo ten sam host. */
export function signals(): string[] {
  const env = (import.meta.env.PUBLIC_SIGNALS || '').split(',').map((s: string) => s.trim()).filter(Boolean)
  if (env.length) return env
  return [`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/signal`]
}
