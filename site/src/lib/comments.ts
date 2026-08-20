// Komentarze pod wpisem – bez serwera. Każdy uczestnik (łącznie z wiecznym peerem autora)
// jest równorzędny: pisze u siebie (podpis + dowód pracy), rozgłasza po WebRTC, a każdy
// odbiorca sam weryfikuje wpisy zanim je pokaże i utrwali (shared/replica.js).
import { sign, randomId } from '../../../shared/crypto.js'
import { floodHidden, REACTIONS, LIMITS, voteKey, modKey, reactionKey, latestBy } from '../../../shared/rules.js'
import { getIdentity, getOwnerKey, type OwnerKey } from './identity'
import { badge, shortIdent } from './ident'
import { openRoom, publish, type Room } from './room'
import { POW_BITS, VOTE_POW_BITS, OWNER_PUBKEY } from './config'
import { t, locale } from './i18n'

export interface Comment {
  v: 1; room: string; id: string; author: string; text: string; ts: number; pubkey: string; nonce: number; sig: string
  parent?: string // odpowiedź w wątku (jeden poziom): id komentarza pierwszego rzędu
}
export interface ModEntry { v: 1; room: string; id: string; action: 'hide' | 'unhide'; ts: number; pubkey: string; sig: string }
export interface Vote { v: 1; room: string; id: string; value: 1 | -1 | 0; ts: number; pubkey: string; nonce: number; sig: string }
export interface Reaction { v: 1; room: string; id: string; emoji: string; ts: number; pubkey: string; sig: string }

export async function mountComments(rootEl: HTMLElement) {
  const roomName = rootEl.dataset.room!
  const status = rootEl.querySelector<HTMLElement>('.status')!
  const list = rootEl.querySelector<HTMLElement>('.list')!
  const count = rootEl.querySelector<HTMLElement>('.count')!
  const form = rootEl.querySelector<HTMLFormElement>('form')!
  const btn = form.querySelector<HTMLButtonElement>('button.send')!
  const authorInput = form.querySelector<HTMLInputElement>('[name=author]')!
  const textInput = form.querySelector<HTMLTextAreaElement>('[name=text]')!
  const say = (msg: string) => { status.textContent = msg }

  // --- ksywka: raz wpisana, pamiętana; „zmień ksywkę" pokazuje pole, blur/Enter zapisuje ---
  const NICK_KEY = 'blog:author'
  const nickEl = form.querySelector<HTMLElement>('.nick')!
  const showWho = () => {
    const nick = localStorage.getItem(NICK_KEY) || ''
    rootEl.classList.toggle('has-nick', !!nick)
    nickEl.textContent = nick
    authorInput.value = nick
  }
  form.querySelector('.change')!.addEventListener('click', () => { rootEl.classList.remove('has-nick'); authorInput.focus() })
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
  let owner: OwnerKey | null = null
  getOwnerKey().then(k => { if (k && k.pubkey === OWNER_PUBKEY) { owner = k; rootEl.classList.add('is-owner'); render() } })

  // --- pokój ---
  const r: Room = openRoom(roomName)
  r.ready.then(render)
  for (const m of ['comments', 'mod', 'votes', 'reactions']) r.viewDoc.getMap(m).observe(() => render())
  let rtcPeers = 0
  r.rtc.on('peers', (e: any) => { rtcPeers = e.webrtcPeers.length; showNet() })
  const showNet = () => say(rtcPeers ? `${rtcPeers} ${rtcPeers === 1 ? t('status.reading1') : t('status.readingN')}` : '')

  // --- formularz odpowiedzi (wątki, jeden poziom) ---
  const composerHome = form.parentElement!
  const replyBar = form.querySelector<HTMLElement>('.replying')!
  let replyTo: Comment | null = null
  function setReply(c: Comment | null, anchor?: HTMLElement) {
    replyTo = c
    rootEl.classList.toggle('replying', !!c)
    if (c && anchor) {
      replyBar.querySelector('.to')!.textContent = `${c.author} #${shortIdent(c.pubkey).id}`
      anchor.append(form)
      textInput.placeholder = t('comments.reply.placeholder')
      textInput.focus()
    } else {
      composerHome.append(form)
      textInput.placeholder = t('comments.placeholder')
    }
  }
  replyBar.querySelector('.cancel')!.addEventListener('click', () => setReply(null))
  textInput.placeholder = t('comments.placeholder')
  authorInput.placeholder = t('comments.nick.placeholder')
  list.dataset.empty = t('comments.empty')

  // --- render: wszystko z viewDoc (już zweryfikowane przez replikę) ---
  let scheduled = false
  function render() {
    if (scheduled) return
    scheduled = true
    setTimeout(() => {
      scheduled = false
      const comments = r.viewDoc.getMap<Comment>('comments')
      const mod = r.viewDoc.getMap<ModEntry>('mod')
      const votes = r.viewDoc.getMap<Vote>('votes')
      const reactions = r.viewDoc.getMap<Reaction>('reactions')

      // stan = redukcja niezmiennych wpisów: najnowszy per komentarz (mod, reakcje)
      const modNow = latestBy(mod.values(), (m: ModEntry) => m.id)
      const hidden = new Set<string>()
      for (const [id, m] of modNow) if (m.action === 'hide') hidden.add(id)
      const all = [...comments.values()]
      const flood = floodHidden(all) // ten sam klucz: max 5 widocznych na 10 min (deterministyczne)
      const rows = all.filter(c => (owner || !hidden.has(c.id)) && !flood.has(c.id)).sort((a, b) => a.ts - b.ts)

      // głos = najnowszy wpis danego głosującego dla danego komentarza
      const voteNow = latestBy(votes.values(), (v: Vote) => `${v.id}|${v.pubkey}`)
      const score = new Map<string, number>(), myVote = new Map<string, number>()
      for (const v of voteNow.values()) {
        score.set(v.id, (score.get(v.id) ?? 0) + v.value)
        if (v.pubkey === me) myVote.set(v.id, v.value)
      }
      const reactionNow = latestBy(reactions.values(), (x: Reaction) => x.id)
      const state = (c: Comment) => ({
        mine: c.pubkey === me, score: score.get(c.id) ?? 0, myVote: myVote.get(c.id) ?? 0,
        reaction: reactionNow.get(c.id)?.emoji || '', hidden: hidden.has(c.id),
      })
      count.textContent = rows.length ? String(rows.filter(c => !hidden.has(c.id)).length) : ''
      // wątki: pierwszy rząd chronologicznie, pod nim jego odpowiedzi liniowo
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
        if (replyTo?.id === c.id) thread.append(form)
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
    const who = document.createElement('a'); who.className = 'who'; who.href = `/u/?k=${c.pubkey}`; who.title = t('comments.allBy')
    const name = document.createElement('b'); name.textContent = c.author
    const id = document.createElement('span'); id.className = 'id'; id.textContent = `#${shortIdent(c.pubkey).id}`
    who.append(name, ' ', id)
    const time = document.createElement('time'); time.dateTime = new Date(c.ts).toISOString(); time.textContent = fmtDate(c.ts)
    meta.append(who, st.mine ? ` · ${t('comments.you')}` : '', ' · ', time, st.hidden ? ` · ${t('comments.hidden')}` : '')
    const text = document.createElement('p'); text.textContent = c.text
    body.append(meta, text)
    if (st.reaction) {
      const chip = document.createElement('div'); chip.className = 'reaction'
      chip.innerHTML = `<span class="emoji"></span> <span class="by"></span>`
      chip.querySelector('.emoji')!.textContent = st.reaction
      chip.querySelector('.by')!.textContent = t('comments.reaction')
      body.append(chip)
    }
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
      b.addEventListener('click', () => ownerWrite('reactions', { v: 1, room: roomName, id: c.id, emoji: st.reaction === e ? '' : e }))
      wrap.append(b)
    }
    const hide = document.createElement('button'); hide.type = 'button'; hide.className = 'link'
    hide.textContent = st.hidden ? t('comments.show') : t('comments.hide')
    hide.addEventListener('click', () => ownerWrite('mod', { v: 1, room: roomName, id: c.id, action: st.hidden ? 'unhide' : 'hide' }))
    wrap.append(hide)
    return wrap
  }
  async function ownerWrite(map: 'mod' | 'reactions', entry: Record<string, unknown>) {
    if (!owner) return
    const full = { ...entry, ts: Date.now(), pubkey: owner.pubkey }
    const signed = { ...full, sig: await sign(owner.priv, full) }
    publish(r, map, (map === 'mod' ? modKey : reactionKey)(signed as never), signed)
  }

  // --- dowód pracy w workerze ---
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

  async function castVote(c: Comment, value: number, current: number, el: HTMLElement) {
    const next = current === value ? 0 : value // drugie kliknięcie cofa głos
    el.classList.add('voting')
    try {
      const id = await getIdentity()
      const draft = { v: 1, room: roomName, id: c.id, value: next, ts: Date.now(), pubkey: id.pubkey, nonce: 0 }
      const mined = await mineInWorker(draft, VOTE_POW_BITS, () => {})
      const signed = { ...mined, sig: await sign(id.priv, mined) }
      publish(r, 'votes', voteKey(signed), signed)
    } catch (e) {
      say(`${t('status.failed')}: ${(e as Error).message}`)
    } finally {
      el.classList.remove('voting')
    }
  }

  form.addEventListener('submit', async ev => {
    ev.preventDefault()
    const author = authorInput.value.trim().slice(0, LIMITS.author)
    const text = textInput.value.trim().slice(0, LIMITS.text)
    if (!author) { rootEl.classList.remove('has-nick'); authorInput.focus(); return }
    if (!text) return
    btn.disabled = true
    try {
      const id = await getIdentity()
      const t0 = Date.now()
      const draft: Record<string, unknown> = { v: 1, room: roomName, id: randomId(), author, text, ts: Date.now(), pubkey: id.pubkey, nonce: 0 }
      if (replyTo) draft.parent = replyTo.id
      const mined = await mineInWorker(draft, POW_BITS, n => say(`${t('status.pow')} ${(n / 1000).toFixed(0)}${t('status.tries')}`))
      publish(r, 'comments', mined.id, { ...mined, sig: await sign(id.priv, mined) })
      textInput.value = ''
      localStorage.setItem(NICK_KEY, author)
      showWho()
      say(`${t('status.added')} (${t('status.powTook')}: ${((Date.now() - t0) / 1000).toFixed(1)} s)`)
      setReply(null)
    } catch (e) {
      say(`${t('status.failed')}: ${(e as Error).message} (${t('status.noEd25519')})`)
    } finally {
      btn.disabled = false
    }
  })
}
