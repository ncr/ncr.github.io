// /sitemap.xml (sitemaps.org 0.9): the fixed pages and every published post.
import type { APIRoute } from 'astro'
import { published, pages, postPath, day } from '../agents'

export const GET: APIRoute = async ({ site }) => {
  const origin = site!.origin
  const posts = await published()
  const urls = [
    ...pages.map(p => ({ loc: origin + p.path, lastmod: p.lists && posts[0] ? day(posts[0].data.date) : undefined })),
    ...posts.map(p => ({ loc: origin + postPath(p), lastmod: day(p.data.date) })),
  ]
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`),
    '</urlset>',
    '',
  ].join('\n')
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
