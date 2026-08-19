// Test bramki peera: odpala się przeciw działającemu peerowi (PEER_URL), zostawia po sobie 3 komentarze testowe.
import WebSocket from 'ws'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { generateKeyPair, exportPublicKey, sign, mine, randomId, verifyAttest } from '../../shared/crypto.js'
const PEER = (process.env.PEER_URL || 'http://localhost:8080').replace(/\/$/, ''), room = process.env.ROOM || 'blog/pierwszy-wpis'
const peer = await (await fetch(`${PEER}/peer.json`)).json()
const post = (path, body) => fetch(`${PEER}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async r => [r.status, await r.json()])
const kp = await generateKeyPair(false); const pubkey = await exportPublicKey(kp.publicKey)
const run = randomId().slice(0, 6) // żeby test dało się powtarzać (screener odrzuca duplikaty)
async function make(text, opts = {}) {
  const c = { v: 1, room, id: randomId(), author: 'tester', text: `${text} [${run}]`, ts: Date.now(), pubkey, ...opts }
  await mine(c, opts.bits ?? peer.powBits); delete c.bits
  c.sig = await sign(kp.privateKey, c)
  return c
}
const results = {}
results.ok = await post('/submit', await make('porządny komentarz numer jeden'))
results.badPow = await post('/submit', await make('za słaby pow', { bits: 1 }))
const tampered = await make('oryginał'); tampered.text = 'podmieniony'
results.badSig = await post('/submit', tampered)
results.badRoom = await post('/submit', await make('x', { room: 'blog/nie-ma' }))
results.links = await post('/submit', await make('kup http://a.com http://b.com http://c.com'))
results.dup = await post('/submit', await make('porządny komentarz numer jeden'))
// wizyty
results.visit = await post('/visit', { path: '/' })
results.visitAgain = await post('/visit', { path: '/' })
results.visitBadPage = await post('/visit', { path: '/nie-ma/' })
results.ok2 = await post('/submit', await make('drugi porządny'))
results.ok3 = await post('/submit', await make('trzeci porządny'))
results.rateKey = await post('/submit', await make('czwarty – powinien odbić'))
results.fakeAttest = await post('/submit', await make('z fałszywą atestacją', { attest: 'AAAA' }))
results.garbage = await post('/submit', { hello: 'world' })
// głosy: na komentarz `ok` (PoW lżejszy), drugi raz nadpisuje, zły PoW odbija, nieistniejący komentarz 404
async function vote(id, value, bits = peer.votePowBits) {
  const v = { v: 1, room, id, value, ts: Date.now(), pubkey, nonce: 0 }
  await mine(v, bits); v.sig = await sign(kp.privateKey, v); return v
}
results.voteUp = await post('/vote', await vote(results.ok[1].id, 1))
results.voteChange = await post('/vote', await vote(results.ok[1].id, -1))
results.voteBadPow = await post('/vote', await vote(results.ok[1].id, 1, 1))
results.voteNoComment = await post('/vote', await vote('nie-ma-takiego', 1))
// reakcja bez klucza właściciela -> odrzucona
results.reactNotOwner = await post('/react', { v: 1, room, id: results.ok[1].id, emoji: '❤️', ts: Date.now(), pubkey, sig: 'x'.repeat(86) })
// WS: próba wpisania przez sync (powinna być zignorowana)
const doc = new Y.Doc(); const prov = new WebsocketProvider(`ws://localhost:8080/sync`, room, doc, { WebSocketPolyfill: WebSocket, disableBc: true })
await new Promise(r => prov.on('sync', s => s && r()))
const before = doc.getMap('comments').size
doc.getMap('comments').set('wsspam', { v: 1, id: 'wsspam', text: 'przez ws' })
const firstId = [...doc.getMap('comments').keys()][0]
doc.getMap('comments').delete(firstId) // próba skasowania cudzego
await new Promise(r => setTimeout(r, 500))
const doc2 = new Y.Doc(); const prov2 = new WebsocketProvider(`ws://localhost:8080/sync`, room, doc2, { WebSocketPolyfill: WebSocket, disableBc: true })
await new Promise(r => prov2.on('sync', s => s && r()))
results.wsReadOnly = { before, secondClientSees: doc2.getMap('comments').size, hasSpam: doc2.getMap('comments').has('wsspam'), stillHasFirst: doc2.getMap('comments').has(firstId) }
results.allAttested = (await Promise.all([...doc2.getMap('comments').values()].map(c => verifyAttest(c, peer.pubkey)))).every(Boolean)
console.log(JSON.stringify(results, null, 1))
prov.destroy(); prov2.destroy(); process.exit(0)
