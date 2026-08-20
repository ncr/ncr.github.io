// Signaling dla y-webrtc na Cloudflare Workers (darmowy plan, adres *.workers.dev).
// Czysta infrastruktura: przekazuje wiadomości subscribe/publish między peerami tego samego
// tematu, nie widzi i nie przechowuje treści bloga. Jeden Durable Object trzyma wszystkie
// tematy; WebSocket hibernation, więc bezczynne połączenia nie zżerają limitu CPU.

export class SignalHub {
  constructor(state) {
    this.state = state
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('signal', { status: 200 })
    const pair = new WebSocketPair()
    this.state.acceptWebSocket(pair[1])
    pair[1].serializeAttachment({ topics: [] })
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  topicsOf(ws) {
    try { return ws.deserializeAttachment()?.topics ?? [] } catch { return [] }
  }

  webSocketMessage(ws, raw) {
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    if (!msg || typeof msg.type !== 'string') return
    const topics = new Set(this.topicsOf(ws))
    switch (msg.type) {
      case 'subscribe':
        for (const t of msg.topics || []) if (typeof t === 'string' && t.length <= 200 && topics.size < 50) topics.add(t)
        ws.serializeAttachment({ topics: [...topics] })
        break
      case 'unsubscribe':
        for (const t of msg.topics || []) topics.delete(t)
        ws.serializeAttachment({ topics: [...topics] })
        break
      case 'publish': {
        if (typeof msg.topic !== 'string') return
        const receivers = this.state.getWebSockets().filter(peer => this.topicsOf(peer).includes(msg.topic))
        msg.clients = receivers.length
        const data = JSON.stringify(msg)
        for (const peer of receivers) { try { peer.send(data) } catch { /* zamknięte */ } }
        break
      }
      case 'ping':
        try { ws.send('{"type":"pong"}') } catch { /* zamknięte */ }
    }
  }

  webSocketClose(ws) { try { ws.close() } catch { /* już zamknięte */ } }
  webSocketError(ws) { try { ws.close() } catch { /* już zamknięte */ } }
}

export default {
  fetch(request, env) {
    return env.HUB.get(env.HUB.idFromName('global')).fetch(request)
  },
}
