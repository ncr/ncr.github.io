// Komentarze pod wpisem. Jeden dokument Yjs na wpis (room), w przeglądarce dwie kopie:
//   peerDoc – replika peera (WebSocket; peer jest jedynym „pisarzem", każdy wpis ma jego atestację)
//   netDoc  – to, co krąży po WebRTC między przeglądarkami; może dostać śmieci
// Obie w IndexedDB. Nic nie jest przepisywane między kopiami (przepisanie = nowy wpis
// w CRDT, który mógłby „wygrać" z wpisem peera). Renderowanie bierze sumę obu kopii
// i każdy wpis sprawdza (kształt, PoW, podpis autora, atestacja peera; wynik cache'owany).
// Nowy komentarz NIE jest wpisywany lokalnie: idzie POST /submit do peera, który go
// sprawdza, atestuje i wpisuje – wraca do nas normalną synchronizacją.
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebrtcProvider } from 'y-webrtc'
import { WebsocketProvider } from 'y-websocket'
import { sign, randomId } from '../../../shared/crypto.js'
import { checkComment, checkMod, checkVote, checkReaction, voteKey, floodHidden, REACTIONS, LIMITS } from '../../../shared/rules.js'
import { getIdentity, getOwnerKey, type OwnerKey } from './identity'
import { badge, shortIdent } from './ident'
import { endpoints, getPeerInfo, cacheName, peerIsLive, clientId } from './peer'
import { t, locale, type Key } from './i18n'

export interface Comment {
  v: 1; room: string; id: string; author: string; text: string; ts: number; pubkey: string; nonce: number; sig: string; attest: string
  parent?: string // odpowiedź w wątku (jeden poziom): id komentarza pierwszego rzędu
}
export interface ModEntry { v: 1; room: string; id: string; action: 'hide' | 'unhide'; ts: number; pubkey: string; sig: string }
export interface Vote { v: 1; room: string; id: string; value: 1 | -1 | 0; ts: number; pubkey: string; nonce: number; sig: string; attest: string }
export interface Reaction { v: 1; room: string; id: string; emoji: string; ts: number; pubkey: string; sig: string }

const errText = (code: string) => (t(`err.${code}` as Key) !== `err.${code}` ? t(`err.${code}` as Key) : code)

export async function mountComments(root: HTMLElement) {
  const room = root.dataset.room!
  const ep = endpoints()
  const status = root.querySelector<HTMLElement>('.status')!
  const list = root.querySelector<HTMLElement>('.list')!
  const count = root.querySelector<HTMLElement>('.count')!
  const form = root.querySelector<HTMLFormElement>('form')!
  const btn = form.querySelector<HTMLButtonElement>('button.send')!
  const authorInput = form.querySelector<HTMLInputElement>('[name=author]')!
  const textInput = form.querySelector<HTMLTextAreaElement>('[name=text]')!
  const say = (msg: string) => { status.textContent = msg }
  const composerHome = form.parentElement! // miejsce formularza, gdy nie odpowiadamy
  const replyBar = form.querySelector<HTMLElement>('.replying')!
  let replyTo: Comment | null = null
  function setReply(c: Comment | null, anchor?: HTMLElement) {
    replyTo = c
    root.classList.toggle('replying', !!c)
    if (c && anchor) {
      replyBar.querySelector('.to')!.textContent = `${c.author} #${shortIdent(c.pubkey).id}`
      anchor.append(form) // formularz wędruje pod wątek
      textInput.placeholder = t('comments.reply.placeholder')
      textInput.focus()
    } else {
      composerHome.append(form)
      textInput.placeholder = t('comments.placeholder')
    }
  }
  replyBar.querySelector('.cancel')!.addEventListener('click', () => setReply(null))
  const applyLang = () => {
    textInput.placeholder = replyTo ? t('comments.reply.placeholder') : t('comments.placeholder')
    authorInput.placeholder = t('comments.nick.placeholder')
    list.dataset.empty = t('comments.empty')
  }
  applyLang()
  document.addEventListener('blog:lang', () => { applyLang(); render() })

  // --- ksywka: raz wpisana, pamiętana (localStorage); „zmień ksywkę" pokazuje pole z powrotem ---
  const NICK_KEY = 'blog:author'
  const nickEl = form.querySelector<HTMLElement>('.nick')!
  const showWho = () => {
    const nick = localStorage.getItem(NICK_KEY) || ''
    root.classList.toggle('has-nick', !!nick)
    nickEl.textContent = nick
    authorInput.value = nick
  }
  form.querySelector('.change')!.addEventListener('click', () => { root.classList.remove('has-nick'); authorInput.focus() })
  const commitNick = () => {
    const nick = authorInput.value.trim().slice(0, LIMITS.author)
    if (nick) localStorage.setItem(NICK_KEY, nick)
    showWho()
  }
  authorInput.addEventListener('blur', commitNick)
  authorInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); authorInput.blur() } })
  showWho()
  let me = ''
  getIdentity().then(id => {
    me = id.pubkey
    form.querySelector('.me-badge')!.replaceWith(badge(id.pubkey, 'me-badge'))
    const my = form.querySelector<HTMLElement>('.myid')!
    const link = document.createElement('a'); link.href = `/u/?k=${id.pubkey}`; link.textContent = `#${shortIdent(id.pubkey).id}`; link.title = t('comments.mine')
    my.replaceChildren(link)
    render()
  })

  const peer = await getPeerInfo()
  if (!peer) say(t('status.peerDown'))
  else if (!peerIsLive(peer)) say(t('status.peerOffline'))

  // --- dokumenty ---
  const peerDoc = new Y.Doc(), netDoc = new Y.Doc()
  const okCache = new Map<string, Promise<boolean>>()
  const commentOk = (c: Comment) => {
    const k = `c|${c.id}|${c.sig}|${c.attest}`
    if (!okCache.has(k)) okCache.set(k, peer ? checkComment(c, { room, powBits: peer.powBits, peerPubkey: peer.pubkey }).then(r => r === null) : Promise.resolve(false))
    return okCache.get(k)!
  }
  const modOk = (m: ModEntry) => {
    const k = `m|${m.id}|${m.sig}`
    if (!okCache.has(k)) okCache.set(k, peer?.ownerPubkey ? checkMod(m, { room, ownerPubkey: peer.ownerPubkey }).then(r => r === null) : Promise.resolve(false))
    return okCache.get(k)!
  }
  const voteOk = (v: Vote) => {
    const k = `v|${v.attest}`
    if (!okCache.has(k)) okCache.set(k, peer ? checkVote(v, { room, powBits: (peer as any).votePowBits ?? Math.max(8, peer.powBits - 4), peerPubkey: peer.pubkey }).then(r => r === null) : Promise.resolve(false))
    return okCache.get(k)!
  }
  const reactionOk = (r: Reaction) => {
    const k = `r|${r.id}|${r.sig}`
    if (!okCache.has(k)) okCache.set(k, peer?.ownerPubkey ? checkReaction(r, { room, ownerPubkey: peer.ownerPubkey }).then(x => x === null) : Promise.resolve(false))
    return okCache.get(k)!
  }
  // klucz właściciela (jeśli wklejony na /me/) – odblokowuje reakcje i moderację z przeglądarki
  let owner: OwnerKey | null = null
  getOwnerKey().then(k => { if (k && k.pubkey === peer?.ownerPubkey) { owner = k; root.classList.add('is-owner'); render() } })
  /** Najnowszy ważny wpis pod kluczem z obu kopii (dla map, które peer nadpisuje: votes, reactions). */
  async function newest<T extends { ts: number }>(map: string, key: string, ok: (v: T) => Promise<boolean>): Promise<T | null> {
    let best: T | null = null
    for (const d of [peerDoc, netDoc]) {
      const v = d.getMap<T>(map).get(key)
      if (v && (!best || v.ts > best.ts) && await ok(v)) best = v
    }
    return best
  }
  const FROM_PEER = Symbol('from-peer')
  peerDoc.on('update', (u: Uint8Array, origin: unknown) => { if (origin !== FROM_PEER) Y.applyUpdate(netDoc, u, FROM_PEER) })

  let rtcPeers = 0, wsUp = false
  const showStatus = () => {
    if (!wsUp) return say(peer ? t('status.peerOffline') : t('status.peerDown'))
    say(rtcPeers ? `${rtcPeers} ${rtcPeers === 1 ? t('status.reading1') : t('status.readingN')}` : '')
  }
  Promise.all([
    new IndexeddbPersistence(cacheName(peer, 'peer', room), peerDoc).whenSynced,
    new IndexeddbPersistence(cacheName(peer, 'net', room), netDoc).whenSynced,
  ]).then(() => {
    Y.applyUpdate(netDoc, Y.encodeStateAsUpdate(peerDoc), FROM_PEER)
    render()
    const wsp = new WebsocketProvider(ep.sync, room, peerDoc, { params: { c: clientId() }, disableBc: true }) // bez BroadcastChannel – replika peera tylko od peera
    const rtc = new WebrtcProvider(`${location.host}:${room}`, netDoc, { signaling: [ep.signal] })
    rtc.on('peers', (e: any) => { rtcPeers = e.webrtcPeers.length; showStatus() })
    wsp.on('status', (e: any) => { wsUp = e.status === 'connected'; showStatus() })
  })
  for (const d of [peerDoc, netDoc]) for (const m of ['comments', 'mod', 'votes', 'reactions']) d.getMap(m).observe(() => render())

  // --- render: suma obu kopii, każdy wpis sprawdzony ---
  let scheduled = false
  function render() {
    if (scheduled) return
    scheduled = true
    setTimeout(async () => {
      scheduled = false
      const hidden = new Set<string>()
      for (const d of [peerDoc, netDoc]) for (const [id, m] of d.getMap<ModEntry>('mod')) {
        if (m?.action === 'hide' && m.id === id && await modOk(m)) hidden.add(id)
      }
      const byId = new Map<string, Comment>()
      for (const d of [peerDoc, netDoc]) for (const [id, c] of d.getMap<Comment>('comments')) {
        if (byId.has(id) || !c || c.id !== id) continue
        if (await commentOk(c)) byId.set(id, c)
      }
      const all = [...byId.values()]
      const flood = floodHidden(all) // ten sam klucz: max 5 widocznych na 10 min (deterministyczne u wszystkich)
      // właściciel widzi też ukryte (wyszarzone), żeby móc je odkryć
      const rows = all.filter(c => (owner || !hidden.has(c.id)) && !flood.has(c.id)).sort((a, b) => a.ts - b.ts)
      // głosy: najnowszy ważny głos per (komentarz, głosujący); suma = wynik
      const score = new Map<string, number>(), myVote = new Map<string, number>()
      const voteKeys = new Set<string>()
      for (const d of [peerDoc, netDoc]) for (const k of d.getMap('votes').keys()) voteKeys.add(k)
      for (const k of voteKeys) {
        const v = await newest<Vote>('votes', k, voteOk)
        if (!v || voteKey(v) !== k) continue
        score.set(v.id, (score.get(v.id) ?? 0) + v.value)
        if (v.pubkey === me) myVote.set(v.id, v.value)
      }
      const reactions = new Map<string, string>()
      for (const c of rows) { const r = await newest<Reaction>('reactions', c.id, reactionOk); if (r?.emoji) reactions.set(c.id, r.emoji) }
      count.textContent = rows.length ? String(rows.filter(c => !hidden.has(c.id)).length) : ''
      // wątki: pierwszy rząd chronologicznie, pod każdym jego odpowiedzi (liniowo, chronologicznie);
      // odpowiedź bez widocznego rodzica nie jest pokazywana
      const state = (c: Comment) => ({ mine: c.pubkey === me, score: score.get(c.id) ?? 0, myVote: myVote.get(c.id) ?? 0, reaction: reactions.get(c.id) || '', hidden: hidden.has(c.id) })
      const top = rows.filter(c => c.parent === undefined)
      const replies = new Map<string, Comment[]>()
      for (const c of rows) if (c.parent !== undefined) { if (!replies.has(c.parent)) replies.set(c.parent, []); replies.get(c.parent)!.push(c) }
      const nodes: HTMLElement[] = []
      for (const c of top) {
        const thread = document.createElement('div'); thread.className = 'thread'
        thread.append(renderOne(c, state(c)))
        const kids = replies.get(c.id) || []
        if (kids.length) {
          const rep = document.createElement('div'); rep.className = 'replies'
          rep.append(...kids.map(k => renderOne(k, state(k))))
          thread.append(rep)
        }
        if (replyTo?.id === c.id) thread.append(form) // formularz zostaje w wątku po przerenderowaniu
        nodes.push(thread)
      }
      list.replaceChildren(...nodes)
      list.classList.toggle('empty', rows.length === 0)
    }, 0)
  }

  const fmtDate = (ts: number) => new Date(ts).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  interface RowState { mine: boolean; score: number; myVote: number; reaction: string; hidden: boolean }
  function renderOne(c: Comment, st: RowState) {
    const el = document.createElement('article')
    el.className = 'comment' + (st.mine ? ' mine' : '') + (st.reaction ? ' reacted' : '') + (st.hidden ? ' hidden-by-owner' : '')
    const body = document.createElement('div'); body.className = 'body'
    const meta = document.createElement('div'); meta.className = 'meta'
    // ksywka + id prowadzą do /u/?k=<klucz> – wszystkie komentarze tej tożsamości
    const who = document.createElement('a'); who.className = 'who'; who.href = `/u/?k=${c.pubkey}`; who.title = t('comments.allBy')
    const name = document.createElement('b'); name.textContent = c.author
    const id = document.createElement('span'); id.className = 'id'; id.textContent = `#${shortIdent(c.pubkey).id}`
    who.append(name, ' ', id)
    const time = document.createElement('time'); time.dateTime = new Date(c.ts).toISOString(); time.textContent = fmtDate(c.ts)
    meta.append(who, st.mine ? ` · ${t('comments.you')}` : '', ' · ', time, st.hidden ? ` · ${t('comments.hidden')}` : '')
    const text = document.createElement('p'); text.textContent = c.text
    body.append(meta, text)
    // reakcja autora bloga – widoczna od razu pod treścią
    if (st.reaction) {
      const chip = document.createElement('div'); chip.className = 'reaction'
      chip.innerHTML = `<span class="emoji"></span> <span class="by"></span>`
      chip.querySelector('.emoji')!.textContent = st.reaction
      chip.querySelector('.by')!.textContent = t('comments.reaction')
      body.append(chip)
    }
    // pasek: ▲ wynik ▼ (+ narzędzia właściciela)
    const bar = document.createElement('div'); bar.className = 'bar'
    const up = voteBtn('▲', 1, st), down = voteBtn('▼', -1, st)
    const sc = document.createElement('span'); sc.className = 'score' + (st.score > 0 ? ' pos' : st.score < 0 ? ' neg' : ''); sc.textContent = String(st.score)
    bar.append(up, sc, down)
    for (const b of [up, down]) b.addEventListener('click', () => castVote(c, b === up ? 1 : -1, st.myVote, el))
    if (c.parent === undefined) {
      const reply = document.createElement('button'); reply.type = 'button'; reply.className = 'link reply'; reply.textContent = t('comments.reply')
      reply.addEventListener('click', () => setReply(c, el.parentElement!))
      bar.append(reply)
    }
    if (owner) bar.append(ownerTools(c, st))
    body.append(bar)
    const av = document.createElement('a'); av.href = who.href; av.className = 'badge-link'; av.append(badge(c.pubkey))
    el.append(av, body)
    return el
  }
  function voteBtn(label: string, value: number, st: RowState) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'vote' + (st.myVote === value ? ' active' : '')
    b.textContent = label; b.title = value > 0 ? t('comments.up') : t('comments.down')
    return b
  }
  function ownerTools(c: Comment, st: RowState) {
    const wrap = document.createElement('span'); wrap.className = 'owner-tools'
    for (const e of REACTIONS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'react' + (st.reaction === e ? ' active' : ''); b.textContent = e
      b.title = st.reaction === e ? t('comments.unreact') : t('comments.react')
      b.addEventListener('click', () => ownerPost('/react', { v: 1, room, id: c.id, emoji: st.reaction === e ? '' : e }))
      wrap.append(b)
    }
    const hide = document.createElement('button'); hide.type = 'button'; hide.className = 'link'
    hide.textContent = st.hidden ? t('comments.show') : t('comments.hide')
    hide.addEventListener('click', () => ownerPost('/moderate', { v: 1, room, id: c.id, action: st.hidden ? 'unhide' : 'hide' }))
    wrap.append(hide)
    return wrap
  }
  async function ownerPost(path: string, entry: Record<string, unknown>) {
    if (!owner) return
    const full = { ...entry, ts: Date.now(), pubkey: owner.pubkey }
    const signed = { ...full, sig: await sign(owner.priv, full) }
    const r = await fetch(`${ep.http}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(signed) })
    if (!r.ok) { const b = await r.json().catch(() => ({})); say(`${t('status.rejected')}: ${errText(b.error || String(r.status))}`) }
  }
  async function castVote(c: Comment, value: number, current: number, el: HTMLElement) {
    if (!peerIsLive(peer)) return say(t('status.peerOfflineNoVote'))
    const next = current === value ? 0 : value // drugie kliknięcie cofa głos
    el.classList.add('voting')
    try {
      const id = await getIdentity()
      const draft = { v: 1, room, id: c.id, value: next, ts: Date.now(), pubkey: id.pubkey, nonce: 0 }
      const mined = await mineInWorker(draft, (peer as any).votePowBits ?? Math.max(8, peer!.powBits - 4), () => {})
      const signed = { ...mined, sig: await sign(id.priv, mined) }
      const r = await fetch(`${ep.http}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(signed) })
      if (!r.ok) { const b = await r.json().catch(() => ({})); say(`${t('status.voteRejected')}: ${errText(b.error || String(r.status))}`) }
    } catch (e) {
      say(`${t('status.failed')}: ${(e as Error).message}`)
    } finally {
      el.classList.remove('voting')
    }
  }

  // --- wysyłka: PoW w workerze -> podpis -> POST /submit ---
  function mineInWorker(obj: object, bits: number, onProgress: (n: number) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const w = new Worker(new URL('./pow.worker.ts', import.meta.url), { type: 'module' })
      w.onmessage = e => {
        if (e.data.progress !== undefined) onProgress(e.data.progress)
        else { resolve(e.data.done); w.terminate() }
      }
      w.onerror = e => { reject(new Error(e.message)); w.terminate() }
      w.postMessage({ obj, bits })
    })
  }

  form.addEventListener('submit', async ev => {
    ev.preventDefault()
    const author = authorInput.value.trim().slice(0, LIMITS.author)
    const text = textInput.value.trim().slice(0, LIMITS.text)
    if (!author) { root.classList.remove('has-nick'); authorInput.focus(); return }
    if (!text) return
    if (!peerIsLive(peer)) return say(t('status.peerOfflineNoPost'))
    btn.disabled = true
    try {
      const id = await getIdentity()
      const t0 = Date.now()
      const draft: Record<string, unknown> = { v: 1, room, id: randomId(), author, text, ts: Date.now(), pubkey: id.pubkey, nonce: 0 }
      if (replyTo) draft.parent = replyTo.id
      const mined = await mineInWorker(draft, peer!.powBits, n => say(`${t('status.pow')} ${(n / 1000).toFixed(0)}${t('status.tries')}`))
      const signed = { ...mined, sig: await sign(id.priv, mined) }
      say(`${t('status.sending')} (${t('status.powTook')}: ${((Date.now() - t0) / 1000).toFixed(1)} s)`)
      const r = await fetch(`${ep.http}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(signed) })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) return say(`${t('status.rejected')}: ${errText(body.error || String(r.status))}`)
      textInput.value = ''
      localStorage.setItem(NICK_KEY, author)
      showWho()
      say(t('status.added'))
      setReply(null)
    } catch (e) {
      say(`${t('status.failed')}: ${(e as Error).message} (${t('status.noEd25519')})`)
    } finally {
      btn.disabled = false
    }
  })
}
