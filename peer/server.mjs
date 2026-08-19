// Infrastruktura bez danych: serwuje statyczną stronę i przedstawia peerów sobie (signaling
// dla y-webrtc). Nie widzi komentarzy, nie podpisuje, nie filtruje – treść płynie po WebRTC
// bezpośrednio między uczestnikami. Wiecznym uczestnikiem jest visitor.mjs (osobny proces).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT || 8080)
const HOST = process.env.HOST || '0.0.0.0'
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || '../site/dist')

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
    // tylko /_astro/* ma hash w nazwie; reszta może się zmienić między buildami
    'Cache-Control': urlPath.startsWith('/_astro/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  fs.createReadStream(file).pipe(res)
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

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end() }
  serveStatic(req, res)
})
const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 })
server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://x')
  if (pathname === '/signal') wss.handleUpgrade(req, socket, head, ws => signaling(ws))
  else socket.destroy()
})
server.listen(PORT, HOST, () => console.log(`blog static+signal: http://${HOST}:${PORT} static=${STATIC_DIR}`))
