// Wieczny peer bloga – jedyny „pisarz" dokumentów Yjs. W jednym procesie:
//   GET  /*              statyczna strona z STATIC_DIR (build Astro)
//   GET  /peer.json      klucz publiczny peera, klucz właściciela, trudność PoW
//   POST /submit         zgłoszenie komentarza: walidacja, limity, screening, atestacja, zapis
//   POST /moderate       wpis moderacyjny podpisany kluczem właściciela
//   POST /vote           głos ▲/▼ na komentarz (PoW lżejszy niż komentarz, limity, atestacja)
//   POST /react          reakcja autora bloga na komentarz (podpis kluczem właściciela)
//   POST /visit          zaliczenie wizyty na stronie (licznik w dokumencie 'site')
//   WS   /sync/<room>    Yjs TYLKO DO ODCZYTU dla klientów (update'y od klientów są ignorowane);
//                        połączenia z ?c=<id przeglądarki> do pokoju 'site' liczą się jako „online"
//   WS   /signal         signaling dla y-webrtc
// Dokument 'site' (statystyki) pisze wyłącznie peer: mapy 'online' (klucz 'now'),
// 'history' (klucz = minuta od epoki) i 'visits' (klucz = ścieżka, plus '_total'); każdy wpis atestowany.
// Komentarze trafiają do dokumentu wyłącznie przez /submit, więc każdy wpis u peera
// przeszedł PoW, podpis, limity i screening – i nosi atestację (podpis peera).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { WebSocketServer } from 'ws'
import {
  generateKeyPair, exportPublicKey, exportPrivateJwk, importPrivateJwk, attest, randomId,
} from '../shared/crypto.js'
import { checkComment, checkMod, checkVote, checkReaction, voteKey, screenText, LIMITS } from '../shared/rules.js'

const require = createRequire(import.meta.url)
// utils z y-websocket same otwierają LevelDB, gdy widzą YPERSISTENCE – nie chcemy tego,
// bo trwałość podpinamy sami niżej (żeby móc poczekać na wczytanie dokumentu).
delete process.env.YPERSISTENCE
const { getYDoc, setPersistence } = require('y-websocket/bin/utils')
const { LeveldbPersistence } = require('y-leveldb')
// yjs/y-protocols/lib0 przez require, z tej samej (CJS) instancji co utils – podwójny import yjs psuje instanceof
const Y = require('yjs')
const syncProtocol = require('y-protocols/sync')
const encoding = require('lib0/encoding')
const decoding = require('lib0/decoding')

// ---------- konfiguracja ----------
const PORT = Number(process.env.PORT || 8080)
const HOST = process.env.HOST || '0.0.0.0'
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || '../site/dist')
const DATA_DIR = process.env.DATA_DIR || null
const OWNER_PUBKEY = process.env.OWNER_PUBKEY || ''
const POW_BITS = Number(process.env.POW_BITS || 18)
const VOTE_POW_BITS = Math.max(8, POW_BITS - 4) // głos: 16× tańszy niż komentarz
const RATE = {
  ip: Number(process.env.RATE_IP || 5),         // komentarzy na IP w oknie
  key: Number(process.env.RATE_KEY || 3),       // komentarzy na klucz autora w oknie
  voteIp: Number(process.env.RATE_VOTE_IP || 30), voteKey: Number(process.env.RATE_VOTE_KEY || 20),
  windowMs: Number(process.env.RATE_WINDOW_MIN || 10) * 60 * 1000,
  global: Number(process.env.RATE_GLOBAL || 60), // komentarzy łącznie na minutę (zawór bezpieczeństwa)
}
const TRUST_PROXY = process.env.TRUST_PROXY === '1'
const AKISMET_KEY = process.env.AKISMET_KEY || ''
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`

if (!DATA_DIR) console.warn('DATA_DIR nie ustawione – komentarze i klucz peera znikną po restarcie')

// ---------- trwałość (LevelDB) ----------
const loaded = new Map() // room -> Promise, rozwiązany gdy dokument wczytany z dysku
if (DATA_DIR) {
  const ldb = new LeveldbPersistence(path.join(DATA_DIR, 'yjs'))
  setPersistence({
    provider: ldb,
    bindState: (docName, ydoc) => {
      const p = (async () => {
        const persisted = await ldb.getYDoc(docName)
        Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persisted))
        ydoc.on('update', update => ldb.storeUpdate(docName, update))
      })()
      loaded.set(docName, p)
    },
    writeState: async () => {},
  })
}
/** Dokument pokoju, gotowy do użycia (wczytany z dysku). */
async function roomDoc(room) {
  const doc = getYDoc(room)
  await loaded.get(room)
  return doc
}
if (!OWNER_PUBKEY) console.warn('OWNER_PUBKEY nie ustawione – moderacja wyłączona')

// ---------- klucz peera (atestacje) ----------
const keyPath = process.env.PEER_KEY || (DATA_DIR ? path.join(DATA_DIR, 'peer-key.jwk.json') : null)
let peerPriv, peerPubkey
if (keyPath && fs.existsSync(keyPath)) {
  const jwk = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
  peerPriv = await importPrivateJwk(jwk)
  peerPubkey = await exportPublicKey(await crypto.subtle.importKey('jwk', { ...jwk, d: undefined, key_ops: ['verify'] }, { name: 'Ed25519' }, true, ['verify']))
} else {
  const pair = await generateKeyPair(true)
  peerPriv = pair.privateKey
  peerPubkey = await exportPublicKey(pair.publicKey)
  if (keyPath) {
    fs.mkdirSync(path.dirname(keyPath), { recursive: true })
    fs.writeFileSync(keyPath, JSON.stringify(await exportPrivateJwk(pair.privateKey)), { mode: 0o600 })
    console.log(`wygenerowano klucz peera: ${keyPath}`)
  }
}

// ---------- pomocnicze ----------
const ROOM_RE = /^blog\/[\w-]{1,100}$/
const SITE_ROOM = 'site'
const roomExists = room => room === SITE_ROOM || (ROOM_RE.test(room) && fs.existsSync(path.join(STATIC_DIR, room, 'index.html')))
const pageExists = p => /^\/([\w-]+\/)*$/.test(p) && fs.existsSync(path.join(STATIC_DIR, p, 'index.html'))
const stamp = async obj => { obj.attest = await attest(peerPriv, obj); return obj }
const clientIp = req => (TRUST_PROXY && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress || '?'

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(body))
}
function readJson(req, max = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = []
    req.on('data', c => { size += c.length; if (size > max) { reject(new Error('too-large')); req.destroy() } else chunks.push(c) })
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { reject(new Error('bad-json')) } })
    req.on('error', reject)
  })
}

// okna przesuwne: klucz -> lista znaczników czasu. `hit` sprawdza i zużywa,
// `peek` tylko sprawdza (zużywamy dopiero po przyjęciu komentarza).
const windows = new Map()
function peek(bucket, limit, windowMs, now = Date.now()) {
  const list = (windows.get(bucket) || []).filter(t => now - t < windowMs)
  windows.set(bucket, list)
  return list.length < limit
}
function hit(bucket, limit, windowMs, now = Date.now()) {
  if (!peek(bucket, limit, windowMs, now)) return false
  windows.get(bucket).push(now); return true
}
const MAX_WINDOW_MS = 60 * 60 * 1000 // najdłuższe okno (dedupe wizyt = 30 min)
setInterval(() => { const now = Date.now(); for (const [k, l] of windows) if (!l.some(t => now - t < MAX_WINDOW_MS)) windows.delete(k) }, 60_000).unref()

async function akismetSpam(c, ip, ua) {
  if (!AKISMET_KEY) return false
  try {
    const body = new URLSearchParams({
      blog: SITE_URL, user_ip: ip, user_agent: ua || '', comment_type: 'comment',
      comment_author: c.author, comment_content: c.text, comment_date_gmt: new Date(c.ts).toISOString(),
    })
    const r = await fetch(`https://${AKISMET_KEY}.rest.akismet.com/1.1/comment-check`, {
      method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(5000),
    })
    return (await r.text()).trim() === 'true'
  } catch (e) {
    console.warn('akismet niedostępny, przepuszczam:', e.message)
    return false // fail-open: awaria Akismetu nie blokuje komentowania
  }
}

// ---------- /submit ----------
async function handleSubmit(req, res) {
  let c
  try { c = await readJson(req) } catch (e) { return json(res, 400, { error: e.message }) }
  const room = c?.room
  if (typeof room !== 'string' || !roomExists(room)) return json(res, 404, { error: 'room' })
  delete c.attest
  const bad = await checkComment(c, { room, powBits: POW_BITS, attested: false })
  if (bad) return json(res, 400, { error: bad })
  if (Math.abs(Date.now() - c.ts) > LIMITS.skewMs) return json(res, 400, { error: 'clock' })

  const doc = await roomDoc(room)
  const comments = doc.getMap('comments')
  if (comments.has(c.id)) return json(res, 409, { error: 'exists' })
  if (c.parent !== undefined) {
    const parent = comments.get(c.parent)
    if (!parent) return json(res, 404, { error: 'parent' })
    if (parent.parent !== undefined) return json(res, 400, { error: 'depth' }) // tylko jeden poziom
  }

  const ip = clientIp(req)
  // odrzucone próby też liczymy, ale luźniej (4x) – żeby nie dało się mielić peera w nieskończoność
  if (!hit(`try:${ip}`, RATE.ip * 4, RATE.windowMs)) return json(res, 429, { error: 'rate-ip' })
  if (!peek('global', RATE.global, 60_000)) return json(res, 429, { error: 'busy' })
  if (!peek(`ip:${ip}`, RATE.ip, RATE.windowMs)) return json(res, 429, { error: 'rate-ip' })
  if (!peek(`key:${c.pubkey}`, RATE.key, RATE.windowMs)) return json(res, 429, { error: 'rate-key' })

  const recent = [...comments.values()].filter(r => r.pubkey === c.pubkey || Date.now() - r.ts < 24 * 3600e3)
  const screened = screenText(c, recent)
  if (screened) return json(res, 422, { error: `screen:${screened}` })
  if (await akismetSpam(c, ip, req.headers['user-agent'])) return json(res, 422, { error: 'screen:akismet' })

  c.attest = await attest(peerPriv, c)
  comments.set(c.id, c)
  hit('global', RATE.global, 60_000); hit(`ip:${ip}`, RATE.ip, RATE.windowMs); hit(`key:${c.pubkey}`, RATE.key, RATE.windowMs)
  console.log(`+ ${room} ${c.id} ${ip} ${c.pubkey.slice(0, 8)} ${c.author}`)
  json(res, 200, { ok: true, id: c.id })
}

// ---------- /vote ----------
async function handleVote(req, res) {
  let v
  try { v = await readJson(req, 2048) } catch (e) { return json(res, 400, { error: e.message }) }
  const room = v?.room
  if (typeof room !== 'string' || !roomExists(room) || room === SITE_ROOM) return json(res, 404, { error: 'room' })
  delete v.attest
  const bad = await checkVote(v, { room, powBits: VOTE_POW_BITS, attested: false })
  if (bad) return json(res, 400, { error: bad })
  if (Math.abs(Date.now() - v.ts) > LIMITS.skewMs) return json(res, 400, { error: 'clock' })
  const doc = await roomDoc(room)
  if (!doc.getMap('comments').has(v.id)) return json(res, 404, { error: 'comment' })
  const ip = clientIp(req)
  if (!hit(`vote-try:${ip}`, RATE.voteIp * 4, RATE.windowMs)) return json(res, 429, { error: 'rate-ip' })
  if (!peek(`vote-ip:${ip}`, RATE.voteIp, RATE.windowMs)) return json(res, 429, { error: 'rate-ip' })
  if (!peek(`vote-key:${v.pubkey}`, RATE.voteKey, RATE.windowMs)) return json(res, 429, { error: 'rate-key' })
  const votes = doc.getMap('votes'), key = voteKey(v)
  const prev = votes.get(key)
  if (prev && prev.ts >= v.ts) return json(res, 409, { error: 'stale' })
  v.attest = await attest(peerPriv, v)
  votes.set(key, v)
  hit(`vote-ip:${ip}`, RATE.voteIp, RATE.windowMs); hit(`vote-key:${v.pubkey}`, RATE.voteKey, RATE.windowMs)
  json(res, 200, { ok: true })
}

// ---------- /react ----------
async function handleReact(req, res) {
  if (!OWNER_PUBKEY) return json(res, 403, { error: 'no-owner' })
  let r
  try { r = await readJson(req, 2048) } catch (e) { return json(res, 400, { error: e.message }) }
  const room = r?.room
  if (typeof room !== 'string' || !roomExists(room) || room === SITE_ROOM) return json(res, 404, { error: 'room' })
  const bad = await checkReaction(r, { room, ownerPubkey: OWNER_PUBKEY })
  if (bad) return json(res, 400, { error: bad })
  if (!hit('react', 60, 60_000)) return json(res, 429, { error: 'busy' })
  const doc = await roomDoc(room)
  if (!doc.getMap('comments').has(r.id)) return json(res, 404, { error: 'comment' })
  const prev = doc.getMap('reactions').get(r.id)
  if (prev && prev.ts >= r.ts) return json(res, 409, { error: 'stale' })
  doc.getMap('reactions').set(r.id, r)
  json(res, 200, { ok: true })
}

// ---------- /moderate ----------
async function handleModerate(req, res) {
  if (!OWNER_PUBKEY) return json(res, 403, { error: 'no-owner' })
  let m
  try { m = await readJson(req) } catch (e) { return json(res, 400, { error: e.message }) }
  const room = m?.room
  if (typeof room !== 'string' || !roomExists(room)) return json(res, 404, { error: 'room' })
  const bad = await checkMod(m, { room, ownerPubkey: OWNER_PUBKEY })
  if (bad) return json(res, 400, { error: bad })
  if (!hit('mod', 60, 60_000)) return json(res, 429, { error: 'busy' })
  const doc = await roomDoc(room)
  doc.getMap('mod').set(m.id, m)
  console.log(`mod ${room} ${m.action} ${m.id}`)
  json(res, 200, { ok: true })
}

// ---------- obecność (online) i historia ----------
const presence = new Map() // id przeglądarki -> liczba otwartych połączeń do 'site'
const onlineNow = () => presence.size
let publishTimer = null
function schedulePublishOnline() {
  if (publishTimer) return
  publishTimer = setTimeout(async () => {
    publishTimer = null
    const doc = await roomDoc(SITE_ROOM)
    const online = doc.getMap('online'), n = onlineNow(), now = Date.now()
    online.set('now', await stamp({ n, ts: now }))
    // rekord wszech czasów (jak „peak" w Steam Charts)
    if (n > (online.get('peak')?.n || 0)) online.set('peak', await stamp({ n, ts: now }))
  }, 1000)
}
function presenceAdd(id) { presence.set(id, (presence.get(id) || 0) + 1); schedulePublishOnline() }
function presenceRemove(id) {
  const n = (presence.get(id) || 1) - 1
  if (n <= 0) presence.delete(id); else presence.set(id, n)
  schedulePublishOnline()
}
const HISTORY_KEEP_MS = 7 * 24 * 3600e3
async function recordHistory() {
  const doc = await roomDoc(SITE_ROOM)
  const history = doc.getMap('history')
  const now = Date.now(), minute = String(Math.floor(now / 60000))
  doc.transact(() => {
    for (const [k, v] of history) if (!v || now - v.ts > HISTORY_KEEP_MS) history.delete(k)
  })
  history.set(minute, await stamp({ ts: now, n: onlineNow() }))
}
setInterval(() => recordHistory().catch(e => console.error('history:', e)), 60_000).unref()
roomDoc(SITE_ROOM).then(() => { schedulePublishOnline(); return recordHistory() }).catch(e => console.error(e))

// ---------- /visit ----------
const VISIT_DEDUPE_MS = 30 * 60 * 1000
async function handleVisit(req, res) {
  let body
  try { body = await readJson(req, 1024) } catch (e) { return json(res, 400, { error: e.message }) }
  const page = body?.path
  if (typeof page !== 'string' || !pageExists(page)) return json(res, 404, { error: 'page' })
  const ip = clientIp(req)
  if (!hit(`visit-try:${ip}`, 120, 60_000)) return json(res, 429, { error: 'busy' })
  if (!hit(`visit:${ip}:${page}`, 1, VISIT_DEDUPE_MS)) return json(res, 200, { ok: true, counted: false })
  const doc = await roomDoc(SITE_ROOM)
  const visits = doc.getMap('visits')
  const now = Date.now()
  const cur = visits.get(page)?.n || 0, total = visits.get('_total')?.n || 0
  visits.set(page, await stamp({ path: page, n: cur + 1, ts: now }))
  visits.set('_total', await stamp({ path: '_total', n: total + 1, ts: now }))
  json(res, 200, { ok: true, counted: true })
}

// ---------- statyka ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.map': 'application/json',
}
function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (urlPath.endsWith('/')) urlPath += 'index.html'
  let file = path.join(STATIC_DIR, urlPath)
  if (!file.startsWith(STATIC_DIR)) { res.writeHead(403); return res.end() }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const asDir = path.join(file, 'index.html')
    if (fs.existsSync(asDir)) file = asDir
    else {
      const notFound = path.join(STATIC_DIR, '404.html')
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      return fs.existsSync(notFound) ? fs.createReadStream(notFound).pipe(res) : res.end('404')
    }
  }
  const ext = path.extname(file)
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    // tylko /_astro/* ma hash w nazwie; reszta (styles.css, avatar) może się zmienić między buildami
    'Cache-Control': urlPath.startsWith('/_astro/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  fs.createReadStream(file).pipe(res)
}

// ---------- WS /sync – tylko odczyt ----------
const messageSync = 0
function send(conn, m) { try { conn.send(m, {}, err => { if (err) conn.close() }) } catch { conn.close() } }
function syncReadOnly(conn, room, clientId) {
  conn.binaryType = 'arraybuffer'
  const doc = getYDoc(room)
  doc.conns.set(conn, new Set()) // updateHandler z y-websocket rozgłasza do doc.conns
  const counted = room === SITE_ROOM && clientId
  if (counted) presenceAdd(clientId)
  conn.on('message', async raw => {
    try {
      await loaded.get(room)
      const decoder = decoding.createDecoder(new Uint8Array(raw))
      if (decoding.readVarUint(decoder) !== messageSync) return // awareness itp. – ignorujemy
      const type = decoding.readVarUint(decoder)
      if (type !== syncProtocol.messageYjsSyncStep1) return // Step2/Update od klienta: IGNORUJEMY
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.writeSyncStep2(encoder, doc, decoding.readVarUint8Array(decoder))
      send(conn, encoding.toUint8Array(encoder))
    } catch (e) { conn.close() }
  })
  let pong = true
  const iv = setInterval(() => {
    if (!pong) { conn.close(); return }
    pong = false; try { conn.ping() } catch { conn.close() }
  }, 30_000)
  conn.on('pong', () => { pong = true })
  conn.on('close', () => { doc.conns.delete(conn); clearInterval(iv); if (counted) presenceRemove(clientId) })
}

// ---------- signaling (port z y-webrtc/bin/server.js) ----------
const topics = new Map()
const sendJson = (conn, msg) => { if (conn.readyState > 1) return conn.close(); try { conn.send(JSON.stringify(msg)) } catch { conn.close() } }
function signaling(conn) {
  const subscribed = new Set()
  let closed = false, pong = true
  const iv = setInterval(() => {
    if (!pong) { conn.close(); clearInterval(iv); return }
    pong = false; try { conn.ping() } catch { conn.close() }
  }, 30_000)
  conn.on('pong', () => { pong = true })
  conn.on('close', () => {
    for (const t of subscribed) { const s = topics.get(t); if (s) { s.delete(conn); if (!s.size) topics.delete(t) } }
    subscribed.clear(); closed = true; clearInterval(iv)
  })
  conn.on('message', raw => {
    let msg; try { msg = JSON.parse(raw) } catch { return }
    if (!msg || !msg.type || closed) return
    switch (msg.type) {
      case 'subscribe':
        for (const t of msg.topics || []) if (typeof t === 'string' && subscribed.size < 50) {
          if (!topics.has(t)) topics.set(t, new Set())
          topics.get(t).add(conn); subscribed.add(t)
        }
        break
      case 'unsubscribe':
        for (const t of msg.topics || []) topics.get(t)?.delete(conn)
        break
      case 'publish':
        if (msg.topic) { const r = topics.get(msg.topic); if (r) { msg.clients = r.size; r.forEach(x => sendJson(x, msg)) } }
        break
      case 'ping':
        sendJson(conn, { type: 'pong' })
    }
  })
}

// ---------- http ----------
const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x')
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, GET' })
    return res.end()
  }
  if (pathname === '/peer.json') return json(res, 200, { pubkey: peerPubkey, ownerPubkey: OWNER_PUBKEY, powBits: POW_BITS, votePowBits: VOTE_POW_BITS, limits: LIMITS, online: onlineNow() })
  if (pathname === '/submit' && req.method === 'POST') return handleSubmit(req, res).catch(e => { console.error(e); json(res, 500, { error: 'internal' }) })
  if (pathname === '/vote' && req.method === 'POST') return handleVote(req, res).catch(e => { console.error(e); json(res, 500, { error: 'internal' }) })
  if (pathname === '/react' && req.method === 'POST') return handleReact(req, res).catch(e => { console.error(e); json(res, 500, { error: 'internal' }) })
  if (pathname === '/visit' && req.method === 'POST') return handleVisit(req, res).catch(e => { console.error(e); json(res, 500, { error: 'internal' }) })
  if (pathname === '/moderate' && req.method === 'POST') return handleModerate(req, res).catch(e => { console.error(e); json(res, 500, { error: 'internal' }) })
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end() }
  serveStatic(req, res)
})
const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 })
server.on('upgrade', (req, socket, head) => {
  const { pathname, searchParams } = new URL(req.url, 'http://x')
  if (pathname === '/signal') {
    wss.handleUpgrade(req, socket, head, ws => signaling(ws))
  } else if (pathname.startsWith('/sync/')) {
    const room = decodeURIComponent(pathname.slice('/sync/'.length))
    if (!roomExists(room)) return socket.destroy()
    const cid = (searchParams.get('c') || '').slice(0, 32)
    wss.handleUpgrade(req, socket, head, ws => syncReadOnly(ws, room, /^[\w-]{8,32}$/.test(cid) ? cid : null))
  } else {
    socket.destroy()
  }
})
server.listen(PORT, HOST, () => {
  console.log(`blog peer: http://${HOST}:${PORT} static=${STATIC_DIR} data=${DATA_DIR || 'NONE'} pow=${POW_BITS} peer=${peerPubkey.slice(0, 8)}… owner=${OWNER_PUBKEY.slice(0, 8) || '-'}`)
})
