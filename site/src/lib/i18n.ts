// Dwa języki: pl i en. Wybór: localStorage 'blog:lang' → język przeglądarki (pl → pl, inaczej en).
// Statyczne napisy są w HTML w obu wersjach (<T pl en/>), CSS pokazuje jedną wg <html lang>.
// Napisy generowane w JS biorą t('klucz'). Zmiana języka: setLang() → event 'blog:lang', wyspy re-renderują.
export type Lang = 'pl' | 'en'
const KEY = 'blog:lang'

export function detectLang(): Lang {
  const saved = localStorage.getItem(KEY)
  if (saved === 'pl' || saved === 'en') return saved
  return navigator.languages.some(l => l.toLowerCase().startsWith('pl')) ? 'pl' : 'en'
}
export function getLang(): Lang { return (document.documentElement.lang as Lang) === 'en' ? 'en' : 'pl' }
export function setLang(l: Lang) {
  localStorage.setItem(KEY, l)
  document.documentElement.lang = l
  document.dispatchEvent(new CustomEvent('blog:lang', { detail: l }))
}
export const locale = () => getLang() === 'pl' ? 'pl-PL' : 'en-GB'

const dict = {
  pl: {
    'comments.placeholder': 'Napisz komentarz…', 'comments.reply.placeholder': 'Odpowiedz…',
    'comments.nick.placeholder': 'Twoja ksywka', 'comments.send': 'Dodaj komentarz',
    'comments.writingAs': 'Piszesz jako', 'comments.changeNick': 'zmień ksywkę', 'comments.replyingTo': 'Odpowiadasz na', 'cancel': 'anuluj',
    'comments.empty': 'Jeszcze nikt nie skomentował. Bądź pierwszy.', 'comments.you': 'ty', 'comments.hidden': 'ukryty',
    'comments.reply': 'odpowiedz', 'comments.up': 'w górę', 'comments.down': 'w dół', 'comments.reaction': 'reakcja autora',
    'comments.hide': 'ukryj', 'comments.show': 'pokaż', 'comments.react': 'zareaguj jako autor', 'comments.unreact': 'zdejmij reakcję',
    'comments.allBy': 'wszystkie komentarze tej osoby', 'comments.mine': 'twoje komentarze',
    'status.added': 'dodane', 'status.rejected': 'odrzucone', 'status.voteRejected': 'głos odrzucony', 'status.sending': 'wysyłam…',
    'status.pow': 'liczę dowód pracy…', 'status.tries': 'k prób', 'status.powTook': 'dowód pracy',
    'status.peerDown': 'peer niedostępny', 'status.peerOffline': 'peer offline – pokazuję zapamiętane komentarze',
    'status.peerOfflineNoPost': 'peer jest offline – nie mogę teraz dodać komentarza', 'status.peerOfflineNoVote': 'peer jest offline – nie mogę teraz głosować',
    'status.failed': 'nie udało się', 'status.noEd25519': 'przeglądarka bez Ed25519 w WebCrypto?',
    'status.reading1': 'osoba czyta razem z tobą', 'status.readingN': 'osób czyta razem z tobą',
    'err.rate-ip': 'za dużo komentarzy z tego adresu – spróbuj za kilka minut', 'err.rate-key': 'za dużo komentarzy z tej tożsamości – spróbuj za kilka minut',
    'err.busy': 'peer ma chwilowo za duży ruch – spróbuj za chwilę', 'err.screen:too-many-links': 'za dużo linków', 'err.screen:duplicate': 'taki komentarz już jest',
    'err.screen:not-text': 'to nie wygląda na tekst', 'err.screen:repetition': 'za dużo powtórzeń', 'err.screen:akismet': 'filtr antyspamowy odrzucił komentarz',
    'err.clock': 'zegar w tej przeglądarce odbiega od zegara peera o ponad 10 minut', 'err.exists': 'ten komentarz już jest',
    'err.comment': 'tego komentarza nie ma u peera', 'err.parent': 'komentarza, na który odpowiadasz, nie ma u peera', 'err.depth': 'można odpowiadać tylko na komentarze pierwszego rzędu',
    'err.stale': 'peer ma już nowszy wpis – odśwież',
    'profile.loading': 'ładuję komentarze…', 'profile.badId': 'nieprawidłowy identyfikator', 'profile.none': 'ta tożsamość nie ma jeszcze widocznych komentarzy',
    'profile.noComments': 'bez komentarzy', 'profile.earlierAs': 'wcześniej jako', 'profile.title': 'komentarze',
    'stats.noHistory': 'brak historii', 'stats.max': 'max', 'stats.readingNow': 'czyta teraz', 'stats.peak24': 'szczyt 24 h', 'stats.peak7': 'szczyt 7 dni',
    'stats.record': 'rekord', 'stats.visits': 'wizyt łącznie', 'stats.last7': 'ostatnie 7 dni',
  },
  en: {
    'comments.placeholder': 'Write a comment…', 'comments.reply.placeholder': 'Reply…',
    'comments.nick.placeholder': 'Your nickname', 'comments.send': 'Post comment',
    'comments.writingAs': 'Posting as', 'comments.changeNick': 'change nickname', 'comments.replyingTo': 'Replying to', 'cancel': 'cancel',
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
    'stats.noHistory': 'no history', 'stats.max': 'max', 'stats.readingNow': 'reading now', 'stats.peak24': '24 h peak', 'stats.peak7': '7-day peak',
    'stats.record': 'all-time peak', 'stats.visits': 'total visits', 'stats.last7': 'last 7 days',
  },
} as const
export type Key = keyof typeof dict.pl
export const t = (k: Key): string => (dict[getLang()] as Record<string, string>)[k] ?? (dict.pl as Record<string, string>)[k] ?? k

/** Polskie formy liczebnika: 1 komentarz, 2 komentarze, 5 komentarzy. en: one/many. */
export function plural(n: number, forms: { pl: [string, string, string]; en: [string, string] }): string {
  if (getLang() === 'en') return n === 1 ? forms.en[0] : forms.en[1]
  const [one, few, many] = forms.pl
  if (n === 1) return one
  const m10 = n % 10, m100 = n % 100
  return m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14) ? few : many
}
