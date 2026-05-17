import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimiter } from '../workers/ratelimiter/src/index.js'

// A minimal stand-in for the Durable Object storage API: an in-memory
// map with the async get/put the RateLimiter relies on.
function fakeState() {
  const map = new Map()
  return {
    storage: {
      get: async (k) => map.get(k),
      put: async (k, v) => { map.set(k, v) },
    },
  }
}

const verdict = (rl) => rl.fetch().then((r) => r.json())

describe('RateLimiter durable object', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('allows the first 5 requests, then denies', async () => {
    const rl = new RateLimiter(fakeState())

    for (let i = 0; i < 5; i++) {
      const v = await verdict(rl)
      expect(v.allowed).toBe(true)
      expect(v.limit).toBe(5)
      expect(v.remaining).toBe(4 - i)
    }

    const sixth = await verdict(rl)
    expect(sixth.allowed).toBe(false)
    expect(sixth.remaining).toBe(0)
  })

  it('does not consume quota on a denied request', async () => {
    const rl = new RateLimiter(fakeState())
    for (let i = 0; i < 5; i++) await verdict(rl)

    // Several denied hits in a row must all stay denied — a rejected
    // request must never itself count toward (or reset) the window.
    for (let i = 0; i < 3; i++) {
      expect((await verdict(rl)).allowed).toBe(false)
    }
  })

  it('reports a reset timestamp one window ahead of the oldest hit', async () => {
    vi.setSystemTime(new Date('2026-05-17T00:00:00Z'))
    const rl = new RateLimiter(fakeState())
    const first = await verdict(rl)
    expect(first.reset_ms).toBe(Date.now() + 60 * 60 * 1000)
  })

  it('frees the window once the oldest hits age out (1 hour)', async () => {
    vi.setSystemTime(new Date('2026-05-17T00:00:00Z'))
    const rl = new RateLimiter(fakeState())
    for (let i = 0; i < 5; i++) await verdict(rl)
    expect((await verdict(rl)).allowed).toBe(false)

    // Advance just past the 1-hour window — the five hits expire.
    vi.setSystemTime(Date.now() + 60 * 60 * 1000 + 1)
    const after = await verdict(rl)
    expect(after.allowed).toBe(true)
    expect(after.remaining).toBe(4)
  })
})
