// What agents and crawlers read: the post list, markdown copies of posts, structured data.
import { getCollection, type CollectionEntry } from 'astro:content'
import { site } from './site'

export type Post = CollectionEntry<'blog'>

export const published = async () =>
  (await getCollection('blog', p => !p.data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())

// Pages that are neither posts nor drafts, in sitemap and llms.txt order. `lists`: shows the post list,
// so it changes when a post is published.
export const pages = [
  { path: '/', title: site.name, description: site.intro, lists: true },
  { path: '/writing/', title: 'Writing', description: 'Every post, newest first.', lists: true },
  { path: '/projects/', title: 'Projects', description: 'Things I build and maintain.' },
  { path: '/about/', title: 'About', description: 'Who I am and what this site is.' },
]

export const day = (d: Date) => d.toISOString().slice(0, 10)
export const postPath = (p: Post) => `/blog/${p.id}/`
export const markdownPath = (p: Post) => `/blog/${p.id}.md`

// Root-relative links in a post's markdown and HTML become absolute, so the copy works out of context.
export const absolutize = (text: string, origin: string) =>
  text
    .replace(/\]\(\//g, `](${origin}/`)
    .replace(/\b(src|href|poster)="\//g, `$1="${origin}/`)

export const postMarkdown = (p: Post, origin: string) => [
  `# ${p.data.title}`,
  '',
  `${day(p.data.date)} · ${site.name} · ${origin}${postPath(p)}`,
  ...(p.data.description ? ['', `> ${p.data.description}`] : []),
  '',
  absolutize((p.body ?? '').trim(), origin),
  '',
].join('\n')

// JSON-LD (schema.org). `<` is escaped so the JSON can't close its <script> tag.
export const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c')

export const person = (origin: string) => ({
  '@type': 'Person',
  '@id': `${origin}/#person`,
  name: site.name,
  url: `${origin}/`,
  image: `${origin}${site.avatar}`,
  description: site.intro,
  sameAs: [site.github, site.x].filter(Boolean),
  worksFor: { '@type': 'Organization', name: 'Trixbrix', url: 'https://trixbrix.eu' },
})

export const homeSchema = (origin: string) => ({
  '@context': 'https://schema.org',
  '@graph': [
    person(origin),
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: site.name,
      url: `${origin}/`,
      description: site.intro,
      inLanguage: 'en',
      author: { '@id': `${origin}/#person` },
    },
  ],
})

export const postSchema = (p: Post, origin: string, image?: string) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: p.data.title,
  ...(p.data.description && { description: p.data.description }),
  datePublished: day(p.data.date),
  url: `${origin}${postPath(p)}`,
  mainEntityOfPage: `${origin}${postPath(p)}`,
  ...(image && { image: new URL(image, origin).href }),
  inLanguage: 'en',
  author: { '@type': 'Person', name: site.name, url: `${origin}/` },
})
