import { describe, expect, it } from 'vitest'
import { checkPlacement, isFleetComplete, placeShip, randomFleet, shipCells } from './placement.ts'
import { createRng } from './rng.ts'
import { FLEET, TOTAL_SHIP_CELLS, type Orientation, type PlacedShip } from './types.ts'

const place = (ships: PlacedShip[], row: number, col: number, size: number, o: Orientation) =>
  checkPlacement(ships, shipCells({ row, col }, size, o))

describe('shipCells', () => {
  it('extends right for horizontal and down for vertical', () => {
    expect(shipCells({ row: 2, col: 3 }, 3, 'horizontal')).toEqual([
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 2, col: 5 },
    ])
    expect(shipCells({ row: 2, col: 3 }, 2, 'vertical')).toEqual([
      { row: 2, col: 3 },
      { row: 3, col: 3 },
    ])
  })
})

describe('checkPlacement edges', () => {
  it('accepts ships flush against every edge', () => {
    expect(place([], 0, 0, 5, 'horizontal')).toBe('ok') // top-left, along top
    expect(place([], 0, 5, 5, 'horizontal')).toBe('ok') // top-right
    expect(place([], 9, 0, 5, 'horizontal')).toBe('ok') // bottom
    expect(place([], 9, 5, 5, 'horizontal')).toBe('ok') // bottom-right
    expect(place([], 0, 0, 5, 'vertical')).toBe('ok') // left
    expect(place([], 5, 0, 5, 'vertical')).toBe('ok') // bottom-left
    expect(place([], 0, 9, 5, 'vertical')).toBe('ok') // right
    expect(place([], 5, 9, 5, 'vertical')).toBe('ok') // bottom-right
  })

  it('rejects ships past the right edge', () => {
    expect(place([], 0, 6, 5, 'horizontal')).toBe('out-of-bounds')
    expect(place([], 4, 9, 2, 'horizontal')).toBe('out-of-bounds')
  })

  it('rejects ships past the bottom edge', () => {
    expect(place([], 6, 0, 5, 'vertical')).toBe('out-of-bounds')
    expect(place([], 9, 4, 2, 'vertical')).toBe('out-of-bounds')
  })

  it('rejects ships starting off the top or left edge', () => {
    expect(place([], -1, 0, 2, 'vertical')).toBe('out-of-bounds')
    expect(place([], 0, -1, 2, 'horizontal')).toBe('out-of-bounds')
    expect(place([], 10, 0, 2, 'horizontal')).toBe('out-of-bounds')
    expect(place([], 0, 10, 2, 'vertical')).toBe('out-of-bounds')
  })

  it('does not wrap from column 10 to column 1', () => {
    const cells = shipCells({ row: 3, col: 8 }, 3, 'horizontal')
    expect(cells.map((c) => c.col)).toEqual([8, 9, 10])
    expect(checkPlacement([], cells)).toBe('out-of-bounds')
    expect(cells.some((c) => c.col === 0)).toBe(false)
  })

  it('does not wrap from row J to row A', () => {
    const cells = shipCells({ row: 8, col: 3 }, 3, 'vertical')
    expect(cells.map((c) => c.row)).toEqual([8, 9, 10])
    expect(checkPlacement([], cells)).toBe('out-of-bounds')
    expect(cells.some((c) => c.row === 0)).toBe(false)
  })
})

describe('overlaps', () => {
  const carrier: PlacedShip = { name: 'Carrier', cells: shipCells({ row: 4, col: 2 }, 5, 'horizontal') }

  it('rejects a crossing ship', () => {
    expect(place([carrier], 2, 4, 4, 'vertical')).toBe('overlap')
  })

  it('rejects a ship sharing an end cell', () => {
    expect(place([carrier], 4, 6, 2, 'horizontal')).toBe('overlap')
    expect(place([carrier], 3, 2, 2, 'vertical')).toBe('overlap')
  })

  it('allows touching ships', () => {
    expect(place([carrier], 4, 7, 3, 'horizontal')).toBe('ok')
    expect(place([carrier], 5, 2, 5, 'horizontal')).toBe('ok')
    expect(place([carrier], 0, 1, 4, 'vertical')).toBe('ok')
  })
})

describe('placeShip', () => {
  it('adds a valid ship and returns a new array', () => {
    const before: PlacedShip[] = []
    const after = placeShip(before, 'Destroyer', { row: 0, col: 0 }, 'horizontal')
    expect(after).toHaveLength(1)
    expect(before).toHaveLength(0)
  })

  it('returns null for invalid or duplicate placement', () => {
    const one = placeShip([], 'Destroyer', { row: 0, col: 0 }, 'horizontal')!
    expect(placeShip(one, 'Destroyer', { row: 5, col: 5 }, 'horizontal')).toBeNull()
    expect(placeShip(one, 'Cruiser', { row: 0, col: 1 }, 'horizontal')).toBeNull()
    expect(placeShip([], 'Carrier', { row: 0, col: 7 }, 'horizontal')).toBeNull()
  })
})

describe('randomFleet', () => {
  it('always produces a complete, valid, non-overlapping fleet', () => {
    for (let seed = 0; seed < 200; seed++) {
      const ships = randomFleet(createRng(seed))
      expect(isFleetComplete(ships)).toBe(true)
      expect(ships.map((s) => s.name)).toEqual(FLEET.map((s) => s.name))
      const keys = ships.flatMap((s) => s.cells.map((c) => `${c.row},${c.col}`))
      expect(keys).toHaveLength(TOTAL_SHIP_CELLS)
      expect(new Set(keys).size).toBe(TOTAL_SHIP_CELLS)
      for (const s of ships) {
        expect(s.cells).toHaveLength(FLEET.find((d) => d.name === s.name)!.size)
        for (const c of s.cells) {
          expect(c.row).toBeGreaterThanOrEqual(0)
          expect(c.row).toBeLessThan(10)
          expect(c.col).toBeGreaterThanOrEqual(0)
          expect(c.col).toBeLessThan(10)
        }
        const rows = new Set(s.cells.map((c) => c.row))
        const cols = new Set(s.cells.map((c) => c.col))
        expect(rows.size === 1 || cols.size === 1).toBe(true)
      }
    }
  })

  it('is repeatable for a seed', () => {
    expect(randomFleet(createRng(123))).toEqual(randomFleet(createRng(123)))
  })
})
