import { describe, expect, it } from 'vitest'
import { createRng } from './rng.ts'

describe('createRng', () => {
  it('is repeatable for the same seed', () => {
    const a = createRng(123)
    const b = createRng(123)
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next())
  })

  it('differs for different seeds', () => {
    const a = createRng(1)
    const b = createRng(2)
    expect([a.next(), a.next()]).not.toEqual([b.next(), b.next()])
  })

  it('continues the same sequence from a saved state', () => {
    const a = createRng(99)
    a.next()
    const resumed = createRng(a.state())
    expect(resumed.next()).toBe(a.next())
  })

  it('int stays within range', () => {
    const r = createRng(7)
    for (let i = 0; i < 1000; i++) {
      const n = r.int(10)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(10)
      expect(Number.isInteger(n)).toBe(true)
    }
  })
})
