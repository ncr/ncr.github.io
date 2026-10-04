// /robots.txt: everyone may crawl; points at the sitemap.
import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) =>
  new Response(['User-agent: *', 'Allow: /', '', `Sitemap: ${site!.origin}/sitemap.xml`, ''].join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
