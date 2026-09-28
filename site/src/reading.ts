// Minutes to read a post's text at ~220 words per minute (markup, code and URLs don't count).
export function readingMinutes(body: string = ''): number {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/https?:\/\/\S+/g, ' ')
  const words = text.match(/[\p{L}\p{N}’'-]+/gu)?.length ?? 0
  return Math.max(1, Math.round(words / 220))
}
export const readingLabel = (body?: string) => `${readingMinutes(body)} min read`
