#!/usr/bin/env node
// Moderacja: czyta dokument po WS (jak przeglądarka), a decyzje wysyła POST /moderate
// podpisane kluczem właściciela.
//   node tools/moderate.mjs list   <room>
//   node tools/moderate.mjs hide   <room> <commentId>
//   node tools/moderate.mjs unhide <room> <commentId>
// env: PEER_URL (domyślnie http://localhost:8080), OWNER_KEY (ścieżka do JWK, domyślnie owner-key.jwk.json)
import fs from 'node:fs'
import WebSocket from 'ws'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { importPrivateJwk, exportPublicKey, sign, verify, verifyAttest } from '../../shared/crypto.js'

const [cmd, room, commentId] = process.argv.slice(2)
if (!cmd || !room || (cmd !== 'list' && !commentId)) {
  console.error('użycie: moderate.mjs list|hide|unhide <room> [commentId]'); process.exit(2)
}
const PEER_URL = (process.env.PEER_URL || 'http://localhost:8080').replace(/\/$/, '')
const WS_URL = PEER_URL.replace(/^http/, 'ws')

if (cmd === 'list') {
  const peer = await (await fetch(`${PEER_URL}/peer.json`)).json()
  const doc = new Y.Doc()
  const provider = new WebsocketProvider(`${WS_URL}/sync`, room, doc, { WebSocketPolyfill: WebSocket, disableBc: true })
  await new Promise((res, rej) => {
    provider.on('sync', s => s && res())
    setTimeout(() => rej(new Error('timeout – peer nie odpowiada')), 10000)
  })
  const comments = doc.getMap('comments'), mod = doc.getMap('mod')
  for (const c of [...comments.values()].sort((a, b) => a.ts - b.ts)) {
    const ok = await verify(c), att = await verifyAttest(c, peer.pubkey)
    const hidden = mod.get(c.id)?.action === 'hide'
    console.log(`${c.id}  ${new Date(c.ts).toISOString()}  ${ok ? 'sig:ok ' : 'sig:BAD'} ${att ? 'att:ok ' : 'att:BAD'}  ${hidden ? '[HIDDEN] ' : ''}${c.author}: ${c.text.slice(0, 60).replace(/\n/g, ' ')}`)
  }
  provider.destroy(); doc.destroy(); process.exit(0)
}

const jwk = JSON.parse(fs.readFileSync(process.env.OWNER_KEY || 'owner-key.jwk.json', 'utf8'))
const priv = await importPrivateJwk(jwk)
const pubkey = await exportPublicKey(await crypto.subtle.importKey('jwk', { ...jwk, d: undefined, key_ops: ['verify'] }, { name: 'Ed25519' }, true, ['verify']))
const entry = { v: 1, room, id: commentId, action: cmd, ts: Date.now(), pubkey }
const signed = { ...entry, sig: await sign(priv, entry) }
const r = await fetch(`${PEER_URL}/moderate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(signed) })
const body = await r.json()
if (!r.ok) { console.error(`odrzucone (${r.status}):`, body.error); process.exit(1) }
console.log(`${cmd} ${commentId} – zapisane (owner ${pubkey.slice(0, 8)}…)`)
