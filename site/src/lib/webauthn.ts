// Klucz właściciela z passkeya (WebAuthn + rozszerzenie PRF).
// Passkey liczy PRF(salt) → HKDF → seed Ed25519 → ten sam klucz przy każdym odblokowaniu.
// Nic nie jest nigdzie rejestrowane: „logowanie" to wyprowadzenie klucza i porównanie
// z PUBLIC_OWNER_PUBKEY wbudowanym w stronę. PRF jest związany z domeną (RP ID), więc
// passkey założony na ncr.github.io działa tylko tam – do dev/localhost służy backup JWK.
import * as ed from '@noble/ed25519'
import { b64u } from '../../../shared/crypto.js'

const concat = (...arrs: Uint8Array[]) => {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0))
  let o = 0; for (const a of arrs) { out.set(a, o); o += a.length }
  return out
}
ed.etc.sha512Async = async (...m: Uint8Array[]) => new Uint8Array(await crypto.subtle.digest('SHA-512', concat(...m)))

const PRF_SALT = new TextEncoder().encode('blog-owner-key-v1')

/** Zakłada passkey właściciela (raz, na docelowej domenie). Wymaga dotknięcia klucza/zgody. */
export async function createOwnerPasskey(): Promise<void> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: 'blog', id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'owner', displayName: 'Blog owner' },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [{ type: 'public-key', alg: -8 }, { type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      extensions: { prf: {} } as any,
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('passkey creation cancelled')
  const ext: any = cred.getClientExtensionResults()
  if (!ext.prf?.enabled) throw new Error('this authenticator does not support the PRF extension')
}

/** Odblokowuje: liczy PRF na passkeyu i wyprowadza JWK klucza właściciela. */
export async function deriveOwnerJwk(): Promise<JsonWebKey> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      userVerification: 'required',
      extensions: { prf: { eval: { first: PRF_SALT } } } as any,
    },
  })) as PublicKeyCredential | null
  if (!assertion) throw new Error('cancelled')
  const ext: any = assertion.getClientExtensionResults()
  const secret = ext.prf?.results?.first
  if (!secret) throw new Error('this passkey does not support the PRF extension')
  const hkdf = await crypto.subtle.importKey('raw', new Uint8Array(secret), 'HKDF', false, ['deriveBits'])
  const seed = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode('blog-owner-ed25519'), info: new Uint8Array(0) },
    hkdf, 256,
  ))
  const pub = await ed.getPublicKeyAsync(seed)
  return { kty: 'OKP', crv: 'Ed25519', d: b64u.enc(seed.buffer), x: b64u.enc(pub.buffer), key_ops: ['sign'], ext: true }
}
