// Replika uczestnika – wspólna dla przeglądarki i wiecznego peera (Node).
// Dwa dokumenty Yjs na pokój:
//   netDoc  – to, co krąży po WebRTC; każdy może tam wpisać cokolwiek, żyje w pamięci
//   viewDoc – kopia zaufana i trwała; trafiają do niej wyłącznie wpisy, które przeszły reguły
// Zasady kopiowania netDoc -> viewDoc (per mapa):
//   comments, visits – wpis pod danym kluczem jest niezmienny: kopiujemy tylko nowe klucze
//   votes, mod, reactions – „nowszy ts wygrywa": kopiujemy, gdy ważny i nowszy niż obecny
// viewDoc -> netDoc idzie w całości (rozdajemy dalej to, co sami uznaliśmy za ważne),
// więc dane wędrują zakaźnie między uczestnikami, nawet gdy autora już nie ma online.
// Moduł dostaje yjs z zewnątrz (Y), żeby istniała jedna instancja yjs na proces.
import { checkComment, checkVote, checkVisit, checkMod, checkReaction, voteKey, visitKey } from './rules.js'

const FROM_VIEW = 'replica-from-view'

/**
 * Spina netDoc z viewDoc. ctx: { room, powBits, votePowBits, ownerPubkey }.
 * Zwraca { verdicts } – cache wyników weryfikacji (klucz: sig).
 */
export function wireReplica(Y, viewDoc, netDoc, ctx) {
  const verdicts = new Map() // sig -> Promise<boolean>
  const cached = (obj, check) => {
    if (typeof obj?.sig !== 'string') return Promise.resolve(false)
    let p = verdicts.get(obj.sig)
    if (!p) { p = check(obj).then(r => r === null); verdicts.set(obj.sig, p) }
    return p
  }
  const checks = {
    comments: c => cached(c, x => checkComment(x, { room: ctx.room, powBits: ctx.powBits })),
    votes: v => cached(v, x => checkVote(x, { room: ctx.room, powBits: ctx.votePowBits })),
    visits: x => cached(x, y => checkVisit(y, { powBits: ctx.votePowBits })),
    mod: m => cached(m, x => checkMod(x, { room: ctx.room, ownerPubkey: ctx.ownerPubkey })),
    reactions: r => cached(r, x => checkReaction(x, { room: ctx.room, ownerPubkey: ctx.ownerPubkey })),
  }
  const keyOf = { comments: c => c.id, votes: voteKey, visits: visitKey, mod: m => m.id, reactions: r => r.id }
  const immutable = { comments: true, visits: true, votes: false, mod: false, reactions: false }

  async function consider(map, key) {
    const value = netDoc.getMap(map).get(key)
    if (!value || keyOf[map](value) !== key) return
    const view = viewDoc.getMap(map)
    const current = view.get(key)
    if (current && (immutable[map] || current.ts >= value.ts)) return
    if (!await checks[map](value)) return
    const again = view.get(key) // stan mógł się zmienić w trakcie weryfikacji
    if (again && (immutable[map] || again.ts >= value.ts)) return
    view.set(key, value)
  }

  for (const map of Object.keys(checks)) {
    netDoc.getMap(map).observe(ev => { for (const key of ev.keysChanged) consider(map, key) })
  }
  viewDoc.on('update', (update, origin) => { if (origin !== FROM_VIEW) Y.applyUpdate(netDoc, update, FROM_VIEW) })
  const seed = () => {
    Y.applyUpdate(netDoc, Y.encodeStateAsUpdate(viewDoc), FROM_VIEW)
    for (const map of Object.keys(checks)) for (const key of netDoc.getMap(map).keys()) consider(map, key)
  }
  return { verdicts, seed, checks }
}
