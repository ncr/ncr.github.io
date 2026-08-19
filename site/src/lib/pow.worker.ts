// Liczy proof-of-work poza głównym wątkiem, żeby strona nie zamarzała.
import { mine } from '../../../shared/crypto.js'

self.onmessage = async (e: MessageEvent<{ obj: any; bits: number }>) => {
  const { obj, bits } = e.data
  const done = await mine(obj, bits, (n: number) => self.postMessage({ progress: n }))
  self.postMessage({ done })
}
