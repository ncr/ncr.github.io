// /blog/<slug>.md: the post as markdown, for agents.
import type { APIRoute, GetStaticPaths } from 'astro'
import { published, postMarkdown, type Post } from '../../agents'

export const getStaticPaths = (async () =>
  (await published()).map(post => ({ params: { slug: post.id }, props: { post } }))) satisfies GetStaticPaths

export const GET: APIRoute = ({ props, site }) =>
  new Response(postMarkdown(props.post as Post, site!.origin), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
