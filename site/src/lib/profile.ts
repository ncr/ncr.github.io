// Wszystkie komentarze jednej tożsamości (klucza) we wszystkich wpisach.
// Dla każdego wpisu otwiera replikę peera (IndexedDB + WebSocket, tylko odczyt), czeka na
// synchronizację (albo 4 s), filtruje po kluczu i zamyka połączenie. Maks. 4 naraz.
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'
import { checkComment, checkMod } from '../../../shared/rules.js'
import { endpoints, getPeerInfo, cacheName, clientId } from './peer'
import { badge, shortIdent } from './ident'
import { t, locale, plural } from './i18n'
import type { Comment, ModEntry } from './comments'

interface Post { slug: string; title: string; date: string }

export async function mountProfile(root: HTMLElement) {
  const pubkey = new URLSearchParams(location.search).get('k') || ''
  const sub = root.querySelector<HTMLElement>('.sub')!
  const list = root.querySelector<HTMLElement>('.list')!
  sub.textContent = t('profile.loading')
  if (!/^[\w-]{43}$/.test(pubkey)) { sub.textContent = t('profile.badId'); return }
  root.querySelector('.badge')!.replaceWith(badge(pubkey, 'big'))
  root.querySelector('.myid')!.textContent = `#${shortIdent(pubkey).id}`
  document.title = `#${shortIdent(pubkey).id} — ${t('profile.title')}`

  const peer = await getPeerInfo()
  if (!peer) { sub.textContent = t('status.peerDown'); return }
  const ep = endpoints()
  const posts: Post[] = await fetch('/posts.json').then(r => r.json()).catch(() => [])

  async function roomComments(post: Post): Promise<Comment[]> {
    const room = `blog/${post.slug}`
    const doc = new Y.Doc()
    const idb = new IndexeddbPersistence(cacheName(peer, 'peer', room), doc)
    await idb.whenSynced
    const wsp = new WebsocketProvider(ep.sync, room, doc, { params: { c: clientId() }, disableBc: true })
    await new Promise<void>(res => { wsp.on('sync', (s: boolean) => s && res()); setTimeout(res, 4000) })
    const hidden = new Set<string>()
    for (const [id, m] of doc.getMap<ModEntry>('mod')) {
      if (m?.action === 'hide' && m.id === id && peer!.ownerPubkey && await checkMod(m, { room, ownerPubkey: peer!.ownerPubkey }) === null) hidden.add(id)
    }
    const out: Comment[] = []
    for (const [id, c] of doc.getMap<Comment>('comments')) {
      if (!c || c.id !== id || c.pubkey !== pubkey || hidden.has(id)) continue
      if (await checkComment(c, { room, powBits: peer!.powBits, peerPubkey: peer!.pubkey }) === null) out.push(c)
    }
    wsp.destroy(); idb.destroy(); doc.destroy()
    return out
  }

  // maks. 4 pokoje naraz
  const results: { post: Post; comments: Comment[] }[] = []
  const queue = [...posts]
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let p = queue.shift(); p; p = queue.shift()) results.push({ post: p, comments: await roomComments(p) })
  }))
  const all = results.flatMap(r => r.comments).sort((a, b) => b.ts - a.ts)
  const nick = all[0]?.author || t('profile.noComments')
  root.querySelector('.nick')!.textContent = nick
  document.title = `${nick} #${shortIdent(pubkey).id} — ${t('profile.title')}`
  const nicks = [...new Set(all.map(c => c.author))]
  const nPosts = results.filter(r => r.comments.length).length
  const renderSub = () => {
    sub.textContent = all.length
      ? `${all.length} ${plural(all.length, { en: ['comment', 'comments'] })} in ${nPosts} ${plural(nPosts, { en: ['post', 'posts'] })}`
        + (nicks.length > 1 ? ` · ${t('profile.earlierAs')} ${nicks.slice(1).join(', ')}` : '')
      : t('profile.none')
  }
  renderSub()

  const fmt = (ts: number) => new Date(ts).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  for (const { post, comments } of results.filter(r => r.comments.length).sort((a, b) => b.post.date.localeCompare(a.post.date))) {
    const group = document.createElement('section'); group.className = 'group'
    const h = document.createElement('h2'); const a = document.createElement('a'); a.href = `/blog/${post.slug}/`; a.textContent = post.title; h.append(a)
    group.append(h)
    for (const c of comments.sort((x, y) => x.ts - y.ts)) {
      const el = document.createElement('article'); el.className = 'comment'
      const body = document.createElement('div'); body.className = 'body'
      const meta = document.createElement('div'); meta.className = 'meta'
      const who = document.createElement('b'); who.textContent = c.author
      const time = document.createElement('time'); time.dateTime = new Date(c.ts).toISOString(); time.textContent = fmt(c.ts)
      meta.append(who, ' · ', time)
      const text = document.createElement('p'); text.textContent = c.text
      body.append(meta, text); el.append(badge(c.pubkey), body); group.append(el)
    }
    list.append(group)
  }
}
