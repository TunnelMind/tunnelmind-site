/**
 * Client-side Proof of Work — SHA-256 hash challenge.
 * Browser finds nonce such that SHA256(challenge + nonce) starts with `difficulty` zeros.
 * Phase 1: stub (returns immediately). Phase 3: enable.
 */
export async function solveChallenge(challenge, difficulty = 4) {
  const prefix = '0'.repeat(difficulty)
  let nonce = 0
  while (true) {
    const input = `${challenge}:${nonce}`
    const hash = await sha256hex(input)
    if (hash.startsWith(prefix)) {
      return { nonce, hash }
    }
    nonce++
    // Yield to event loop every 1000 iterations
    if (nonce % 1000 === 0) {
      await new Promise(r => setTimeout(r, 0))
    }
  }
}

export async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Phase 1 stub: always returns valid
export async function getPoWToken(action) {
  return { valid: true, action, ts: Date.now() }
}
