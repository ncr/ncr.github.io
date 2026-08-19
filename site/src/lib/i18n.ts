// Strona jest po angielsku; ten moduł trzyma napisy generowane w JS w jednym miejscu.
export const locale = () => 'en-GB'

const dict = {
  'comments.placeholder': 'Write a comment…', 'comments.reply.placeholder': 'Reply…',
  'comments.nick.placeholder': 'Your nickname', 'comments.send': 'Post comment',
  'comments.empty': 'No comments yet. Be the first.', 'comments.you': 'you', 'comments.hidden': 'hidden',
  'comments.reply': 'reply', 'comments.up': 'upvote', 'comments.down': 'downvote', 'comments.reaction': "author's reaction",
  'comments.hide': 'hide', 'comments.show': 'show', 'comments.react': 'react as author', 'comments.unreact': 'remove reaction',
  'comments.allBy': 'all comments by this person', 'comments.mine': 'your comments',
  'status.added': 'posted', 'status.rejected': 'rejected', 'status.voteRejected': 'vote rejected', 'status.sending': 'sending…',
  'status.pow': 'computing proof of work…', 'status.tries': 'k tries', 'status.powTook': 'proof of work',
  'status.peerDown': 'peer unavailable', 'status.peerOffline': 'peer offline – showing cached comments',
  'status.peerOfflineNoPost': 'peer is offline – cannot post right now', 'status.peerOfflineNoVote': 'peer is offline – cannot vote right now',
  'status.failed': 'failed', 'status.noEd25519': 'browser without Ed25519 in WebCrypto?',
  'status.reading1': 'person reading with you', 'status.readingN': 'people reading with you',
  'err.rate-ip': 'too many comments from this address – try again in a few minutes', 'err.rate-key': 'too many comments from this identity – try again in a few minutes',
  'err.busy': 'peer is busy – try again shortly', 'err.screen:too-many-links': 'too many links', 'err.screen:duplicate': 'this comment already exists',
  'err.screen:not-text': "this doesn't look like text", 'err.screen:repetition': 'too much repetition', 'err.screen:akismet': 'spam filter rejected the comment',
  'err.clock': "this browser's clock is more than 10 minutes off the peer's", 'err.exists': 'this comment already exists',
  'err.comment': 'the peer does not have this comment', 'err.parent': 'the peer does not have the comment you are replying to', 'err.depth': 'you can only reply to top-level comments',
  'err.stale': 'the peer already has a newer entry – refresh',
  'profile.loading': 'loading comments…', 'profile.badId': 'invalid identifier', 'profile.none': 'this identity has no visible comments yet',
  'profile.noComments': 'no comments', 'profile.earlierAs': 'earlier as', 'profile.title': 'comments',
  'stats.noHistory': 'no history', 'stats.max': 'max',
} as const
export type Key = keyof typeof dict
export const t = (k: Key): string => (dict as Record<string, string>)[k] ?? k

export function plural(n: number, forms: { en: [string, string] }): string {
  return n === 1 ? forms.en[0] : forms.en[1]
}
