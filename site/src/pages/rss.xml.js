import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { site } from '../site'

export async function GET(context) {
  const posts = (await getCollection('blog', p => !p.data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
  return rss({
    title: site.name,
    description: site.intro,
    site: context.site,
    items: posts.map(p => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description,
      link: `/blog/${p.id}/`,
    })),
  })
}
