#!/usr/bin/env node
// Generuje klucz właściciela. Prywatny -> plik JWK (trzymaj poza repo),
// publiczny -> wypisany; wklej do site/.env jako PUBLIC_OWNER_PUBKEY.
import fs from 'node:fs'
import { generateKeyPair, exportPublicKey, exportPrivateJwk } from '../../shared/crypto.js'

const out = process.argv[2] || 'owner-key.jwk.json'
if (fs.existsSync(out)) { console.error(`${out} już istnieje – nie nadpisuję`); process.exit(1) }
const pair = await generateKeyPair(true)
fs.writeFileSync(out, JSON.stringify(await exportPrivateJwk(pair.privateKey)), { mode: 0o600 })
console.log(`klucz prywatny: ${out}`)
console.log(`PUBLIC_OWNER_PUBKEY=${await exportPublicKey(pair.publicKey)}`)
