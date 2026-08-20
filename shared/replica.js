// Replika uczestnika – wspólna dla przeglądarki i wiecznego peera (Node).
// Dwa dokumenty Yjs na pokój:
//   netDoc  – to, co krąży po WebRTC; każdy może tam wpisać cokolwiek, żyje w pamięci
//   viewDoc – kopia zaufana i trwała; trafiają do niej wyłącznie wpisy, które przeszły reguły
// Zasady kopiowania netDoc -> viewDoc: KAŻDY wpis jest niezmienny (klucze zawierają ts),
// kopiujemy tylko nowe klucze po weryfikacji; stan bieżący to redukcja przy renderowaniu.
// viewDoc -> netDoc idzie w całości (rozdajemy dalej to, co sami uznaliśmy za ważne),
// więc dane wędrują zakaźnie między uczestnikami, nawet gdy autora już nie ma online.
// Moduł dostaje yjs z zewnątrz (Y), żeby istniała jedna instancja yjs na proces.
import { checkComment, checkVote, checkVisit, checkMod, checkReaction, checkWipe, voteKey, visitKey, modKey, reactionKey, wipeKey } from './rules.js'

const FROM_VIEW = 'replica-from-view'

/**
 * Spina netDoc z viewDoc. ctx: { room, powBits, votePowBits, ownerPubkey, minTs? }.
 * ctx.minTs() – wpisy użytkowników z ts <= minTs() są odrzucane (wipe właściciela).
 * Pokój 'site' replikuje też mapę 'wipe' (tylko podpis właściciela, bez minTs).
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
  const keyOf = { comments: c => c.id, votes: voteKey, visits: visitKey, mod: modKey, reactions: reactionKey }
  if (ctx.room === 'site') {
    checks.wipe = w => cached(w, x => checkWipe(x, { ownerPubkey: ctx.ownerPubkey }))
    keyOf.wipe = wipeKey
  }

  async function consider(map, key) {
    const value = netDoc.getMap(map).get(key)
    if (!value || keyOf[map](value) !== key) return
    if (map !== 'wipe' && ctx.minTs && value.ts <= ctx.minTs()) return
    const view = viewDoc.getMap(map)
    if (view.has(key)) return
    if (!await checks[map](value)) return
    if (!view.has(key)) view.set(key, value)
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
