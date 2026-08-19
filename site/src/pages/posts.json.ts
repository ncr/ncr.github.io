// Lista wpisów dla skryptów w przeglądarce (strona /u/ przegląda komentarze danej osoby we wszystkich wpisach).
import { getCollection } from 'astro:content'

export async function GET() {
  const posts = (await getCollection('blog', p => !p.data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map(p => ({ slug: p.id, title: p.data.title, date: p.data.date.toISOString() }))
  return new Response(JSON.stringify(posts), { headers: { 'Content-Type': 'application/json' } })
}
