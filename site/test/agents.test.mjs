// Checks the built site (dist/) for what agents and crawlers read. Run after `astro build`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const dist = new URL('../dist/', import.meta.url).pathname
const read = p => readFileSync(join(dist, p), 'utf8')
const origin = new URL(read('robots.txt').match(/^Sitemap: (.+)$/m)[1]).origin

const htmlFiles = dir => readdirSync(dir).flatMap(f => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? htmlFiles(p) : f.endsWith('.html') ? [p] : []
})
const pathOf = file => '/' + relative(dist, file).replace(/index\.html$/, '')
const pages = htmlFiles(dist).map(pathOf)
const posts = pages.filter(p => p.startsWith('/blog/')).map(p => p.split('/')[2])
const jsonLd = html => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]))
const visibleText = html => html
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, ' ')
  .replace(/<div class="theme-menu"[\s\S]*?<\/div>/, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

test('home page has an h1 and over 500 characters of text without JavaScript', () => {
  const html = read('index.html')
  assert.match(html, /<h1[^>]*>Jacek Becela<\/h1>/)
  const text = visibleText(html)
  assert.ok(text.length > 500, `${text.length} characters`)
  assert.match(html, /<p class="bio">I've been building <a href="https:\/\/trixbrix.eu">Trixbrix<\/a>/)
})

test('home page has Person and WebSite JSON-LD', () => {
  const [ld] = jsonLd(read('index.html'))
  assert.equal(ld['@context'], 'https://schema.org')
  const person = ld['@graph'].find(n => n['@type'] === 'Person')
  assert.equal(person.name, 'Jacek Becela')
  assert.equal(person.url, `${origin}/`)
  assert.ok(person.description)
  assert.ok(person.sameAs.includes('https://github.com/ncr'))
  assert.ok(ld['@graph'].some(n => n['@type'] === 'WebSite'))
})

test('every post has BlogPosting JSON-LD and a markdown copy linked from <head>', () => {
  assert.ok(posts.length > 0)
  for (const slug of posts) {
    const html = read(`blog/${slug}/index.html`)
    const [ld] = jsonLd(html)
    assert.equal(ld['@type'], 'BlogPosting', slug)
    assert.equal(ld.url, `${origin}/blog/${slug}/`)
    assert.match(ld.datePublished, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal(ld.author.name, 'Jacek Becela')
    assert.ok(html.includes(`<link rel="alternate" type="text/markdown" href="/blog/${slug}.md">`), slug)
    const md = read(`blog/${slug}.md`)
    assert.ok(md.startsWith(`# ${ld.headline}\n`), slug)
    assert.ok(!/\]\(\/|(src|href)="\//.test(md), `${slug}.md has root-relative links`)
  }
})

test('404.html exists, is noindex and points to sitemap and llms.txt', () => {
  const html = read('404.html')
  assert.match(html, /<meta name="robots" content="noindex">/)
  assert.match(html, /href="\/sitemap\.xml"/)
  assert.match(html, /href="\/llms\.txt"/)
})

test('llms.txt follows llmstxt.org: H1, blockquote, then link sections', () => {
  const lines = read('llms.txt').split('\n')
  assert.equal(lines[0], '# Jacek Becela')
  assert.match(lines.find(l => l.startsWith('>')), /^> \S/)
  const firstH2 = lines.findIndex(l => l.startsWith('## '))
  assert.ok(lines.slice(1, firstH2).every(l => !l.startsWith('#')), 'only one H1 before the sections')
  for (const l of lines.slice(firstH2)) {
    if (l === '' || l.startsWith('## ')) continue
    assert.match(l, /^- \[[^\]]+\]\(https?:\/\/[^)]+\)(: .+)?$/, l)
  }
  for (const slug of posts) assert.ok(lines.some(l => l.includes(`(${origin}/blog/${slug}.md)`)), slug)
})

test('sitemap.xml lists every public page and nothing else', () => {
  const xml = read('sitemap.xml')
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'))
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1])
  const expected = pages
    .filter(p => p !== '/404.html' && !p.startsWith('/draft/'))
    .map(p => origin + p)
  assert.deepEqual(locs.toSorted(), expected.toSorted())
  for (const m of xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)) assert.match(m[1], /^\d{4}-\d{2}-\d{2}$/)
})

test('robots.txt allows crawling and names the sitemap', () => {
  assert.equal(read('robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`)
  assert.ok(existsSync(join(dist, 'sitemap.xml')))
})
