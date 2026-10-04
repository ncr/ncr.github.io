// /llms.txt in the llmstxt.org format: H1, blockquote summary, then sections of links.
import type { APIRoute } from 'astro'
import { site } from '../site'
import { published, pages, markdownPath } from '../agents'

export const GET: APIRoute = async ({ site: url }) => {
  const origin = url!.origin
  const posts = await published()
  const text = [
    `# ${site.name}`,
    '',
    `> ${site.intro}`,
    '',
    site.bio.replace(/\]\(\//g, `](${origin}/`),
    '',
    'Every post is also available as markdown at the links below (the HTML page is the same path without `.md`, ending in `/`).',
    '',
    '## Posts',
    '',
    ...posts.map(p => `- [${p.data.title}](${origin}${markdownPath(p)})${p.data.description ? `: ${p.data.description}` : ''}`),
    '',
    '## Pages',
    '',
    ...pages.filter(p => p.path !== '/').map(p => `- [${p.title}](${origin}${p.path}): ${p.description}`),
    `- [GitHub](${site.github}): code`,
    ...(site.x ? [`- [X](${site.x}): where posts get discussed`] : []),
    '',
    '## Optional',
    '',
    `- [RSS](${origin}/rss.xml): feed of all posts`,
    `- [Sitemap](${origin}/sitemap.xml): every page`,
    '',
  ].join('\n')
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
