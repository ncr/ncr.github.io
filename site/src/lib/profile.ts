// Wszystkie komentarze jednej tożsamości (klucza) we wszystkich wpisach.
// Otwiera pokoje wpisów (cache + WebRTC), czeka chwilę na synchronizację i filtruje po kluczu.
import { openRoom } from './room'
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

  const posts: Post[] = await fetch('/posts.json').then(r => r.json()).catch(() => [])
  async function roomComments(post: Post): Promise<Comment[]> {
    const r = openRoom(`blog/${post.slug}`)
    await r.ready
    await new Promise(res => setTimeout(res, 4000)) // daj mesh WebRTC szansę się zsynchronizować
    const hidden = new Set<string>()
    for (const [id, m] of r.viewDoc.getMap<ModEntry>('mod')) if (m.action === 'hide') hidden.add(id)
    const out = [...r.viewDoc.getMap<Comment>('comments').values()].filter(c => c.pubkey === pubkey && !hidden.has(c.id))
    r.destroy()
    return out
  }

  const results: { post: Post; comments: Comment[] }[] = []
  const queue = [...posts]
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let p = queue.shift(); p; p = queue.shift()) results.push({ post: p, comments: await roomComments(p) })
  }))
  const all = results.flatMap(x => x.comments).sort((a, b) => b.ts - a.ts)
  const nick = all[0]?.author || t('profile.noComments')
  root.querySelector('.nick')!.textContent = nick
  document.title = `${nick} #${shortIdent(pubkey).id} — ${t('profile.title')}`
  const nicks = [...new Set(all.map(c => c.author))]
  const nPosts = results.filter(x => x.comments.length).length
  sub.textContent = all.length
    ? `${all.length} ${plural(all.length, { en: ['comment', 'comments'] })} in ${nPosts} ${plural(nPosts, { en: ['post', 'posts'] })}`
      + (nicks.length > 1 ? ` · ${t('profile.earlierAs')} ${nicks.slice(1).join(', ')}` : '')
    : t('profile.none')

  const fmt = (ts: number) => new Date(ts).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  for (const { post, comments } of results.filter(x => x.comments.length).sort((a, b) => b.post.date.localeCompare(a.post.date))) {
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
