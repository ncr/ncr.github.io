// Pokój = para dokumentów (netDoc po WebRTC, viewDoc zaufany w IndexedDB) spięta
// regułami z shared/replica.js. Używane przez komentarze, statystyki i profil.
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebrtcProvider } from 'y-webrtc'
import { wireReplica } from '../../../shared/replica.js'
import { wipeTsOf, purgeDoc } from '../../../shared/rules.js'
import { POW_BITS, VOTE_POW_BITS, OWNER_PUBKEY, ROOM_NS, signals } from './config'

// Wipe właściciela: pokój 'site' niesie mapę 'wipe'; wszystkie otwarte pokoje czyszczą
// wpisy sprzed wipeTs i replika nie przyjmuje starszych z sieci.
let wipeTs = Number(localStorage.getItem('blog:wipeTs') || 0)
const openRooms = new Set<Room>()
function applyWipe(ts: number) {
  if (ts <= wipeTs) return
  wipeTs = ts
  localStorage.setItem('blog:wipeTs', String(ts))
  for (const r of openRooms) purgeDoc(r.viewDoc, ts)
}

export interface Room {
  room: string
  viewDoc: Y.Doc
  netDoc: Y.Doc
  rtc: WebrtcProvider
  ready: Promise<void>
  destroy(): void
}

export function openRoom(room: string): Room {
  const viewDoc = new Y.Doc()
  const netDoc = new Y.Doc()
  const { seed } = wireReplica(Y, viewDoc, netDoc, { room, powBits: POW_BITS, votePowBits: VOTE_POW_BITS, ownerPubkey: OWNER_PUBKEY, minTs: () => wipeTs })
  const idb = new IndexeddbPersistence(`blog:v4:${room}`, viewDoc)
  // WebRTC od razu (mesh buduje się kilka sekund); seed netDoc po wczytaniu cache
  const rtc = new WebrtcProvider(`${ROOM_NS}:${room}`, netDoc, { signaling: signals() })
  const ready = idb.whenSynced.then(() => { purgeDoc(viewDoc, wipeTs); seed() })
  const r: Room = { room, viewDoc, netDoc, rtc, ready, destroy() { openRooms.delete(r); rtc.destroy(); idb.destroy(); viewDoc.destroy(); netDoc.destroy() } }
  openRooms.add(r)
  if (room === 'site') {
    const wipes = viewDoc.getMap('wipe')
    const check = () => applyWipe(wipeTsOf(wipes))
    wipes.observe(check)
    ready.then(check)
  }
  return r
}

/** Wpis własny: od razu do viewDoc (ważny, bo sami go zrobiliśmy) – rozejdzie się mostem do netDoc. */
export function publish(r: Room, map: string, key: string, value: unknown) {
  r.viewDoc.getMap(map).set(key, value as never)
}
