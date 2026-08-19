// „Wieczny czytelnik": ten sam kod repliki co przeglądarka (shared/replica.js), uruchomiony
// w Node. Dołącza po WebRTC do pokojów (wpisy z posts.json + 'site'), weryfikuje wpisy jak
// każdy inny uczestnik i utrwala zaufaną kopię do pliku. Nie ma żadnej władzy – jest po
// prostu zawsze online, więc nowy czytelnik ma od kogo pobrać historię.
import fs from 'node:fs'
import path from 'node:path'
import wrtc from '@roamhq/wrtc'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { wireReplica } from '../shared/replica.js'

const STATIC_DIR = path.resolve(process.env.STATIC_DIR || '../site/dist')
const DATA_DIR = process.env.DATA_DIR || './data'
const SIGNALS = (process.env.SIGNALS || 'ws://localhost:8080/signal').split(',').map(s => s.trim()).filter(Boolean)
const ROOM_NS = process.env.ROOM_NS || 'ncr-blog'
const POW_BITS = Number(process.env.POW_BITS || 18)
const VOTE_POW_BITS = Math.max(8, POW_BITS - 4)
const OWNER_PUBKEY = process.env.OWNER_PUBKEY || ''

fs.mkdirSync(DATA_DIR, { recursive: true })

function rooms() {
  const list = ['site']
  try {
    const posts = JSON.parse(fs.readFileSync(path.join(STATIC_DIR, 'posts.json'), 'utf8'))
    for (const p of posts) list.push(`blog/${p.slug}`)
  } catch (e) { console.warn('posts.json nieczytelne:', e.message) }
  return list
}

const open = new Map()
function join(room) {
  if (open.has(room)) return
  const file = path.join(DATA_DIR, room.replaceAll('/', '__') + '.yupdate')
  const viewDoc = new Y.Doc()
  const netDoc = new Y.Doc()
  if (fs.existsSync(file)) {
    try { Y.applyUpdate(viewDoc, new Uint8Array(fs.readFileSync(file))) } catch (e) { console.error(`${room}: zepsuty plik, zaczynam od zera (${e.message})`) }
  }
  const { seed } = wireReplica(Y, viewDoc, netDoc, { room, powBits: POW_BITS, votePowBits: VOTE_POW_BITS, ownerPubkey: OWNER_PUBKEY })
  seed()
  // zapis: po każdej zmianie zaufanej kopii, z odstępem
  let timer = null
  viewDoc.on('update', () => {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      fs.writeFileSync(file, Buffer.from(Y.encodeStateAsUpdate(viewDoc)))
    }, 2000)
  })
  const rtc = new WebrtcProvider(`${ROOM_NS}:${room}`, netDoc, {
    signaling: SIGNALS,
    peerOpts: { wrtc }, // WebRTC w Node
  })
  rtc.awareness.setLocalState({ cid: 'keeper' }) // liczymy się jako jeden czytający
  rtc.on('peers', e => console.log(`${room}: peers=${e.webrtcPeers.length}`))
  open.set(room, { viewDoc, netDoc, rtc })
  console.log(`dołączyłem: ${room} (komentarzy w kopii: ${viewDoc.getMap('comments').size})`)
}

for (const room of rooms()) join(room)
setInterval(() => { for (const room of rooms()) join(room) }, 10 * 60_000).unref() // nowe wpisy po rebuildzie
console.log(`visitor: ns=${ROOM_NS} pow=${POW_BITS} signals=${SIGNALS.join(',')} data=${DATA_DIR}`)
