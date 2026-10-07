import { describe, expect, it } from 'vitest'
import { allShipsSunk, createBoard, isShipSunk, type Board } from './board.ts'
import { fire } from './firing.ts'
import { shipCells } from './placement.ts'
import { FLEET, type Coord, type PlacedShip } from './types.ts'

// Each ship on its own row, starting at column 0.
const ships: PlacedShip[] = FLEET.map((def, i) => ({
  name: def.name,
  cells: shipCells({ row: i * 2, col: 0 }, def.size, 'horizontal'),
}))

function fireAll(board: Board, coords: readonly Coord[]): Board {
  return coords.reduce((b, c) => {
    const r = fire(b, c)
    if (!r.ok) throw new Error(r.reason)
    return r.board
  }, board)
}

describe('fire', () => {
  it('reports a miss on water', () => {
    const r = fire(createBoard(ships), { row: 1, col: 0 })
    expect(r.ok && r.result).toEqual({ coord: { row: 1, col: 0 }, outcome: 'miss' })
    expect(r.ok && r.board.shots[1][0]).toBe('miss')
  })

  it('reports a hit with the ship name', () => {
    const r = fire(createBoard(ships), { row: 0, col: 2 })
    expect(r.ok && r.result).toEqual({ coord: { row: 0, col: 2 }, outcome: 'hit', ship: 'Carrier' })
    expect(r.ok && r.board.shots[0][2]).toBe('hit')
  })

  it('rejects a repeated shot on a miss or a hit', () => {
    const b = fireAll(createBoard(ships), [
      { row: 1, col: 0 },
      { row: 0, col: 0 },
    ])
    expect(fire(b, { row: 1, col: 0 })).toEqual({ ok: false, reason: 'already-fired' })
    expect(fire(b, { row: 0, col: 0 })).toEqual({ ok: false, reason: 'already-fired' })
  })

  it('rejects shots off the board', () => {
    const b = createBoard(ships)
    for (const c of [
      { row: -1, col: 0 },
      { row: 0, col: 10 },
      { row: 10, col: 0 },
      { row: 0, col: -1 },
    ]) {
      expect(fire(b, c)).toEqual({ ok: false, reason: 'out-of-bounds' })
    }
  })

  it('does not mutate the input board', () => {
    const b = createBoard(ships)
    fire(b, { row: 0, col: 0 })
    expect(b.shots[0][0]).toBe('none')
  })
})

describe('sunk detection', () => {
  for (const ship of ships) {
    it(`sinks the ${ship.name} only on its last cell`, () => {
      let board = createBoard(ships)
      ship.cells.forEach((c, i) => {
        const r = fire(board, c)
        if (!r.ok) throw new Error(r.reason)
        board = r.board
        const last = i === ship.cells.length - 1
        expect(r.result.outcome).toBe(last ? 'sunk' : 'hit')
        expect(r.result.ship).toBe(ship.name)
        expect(isShipSunk(board, ship)).toBe(last)
        if (last) expect(r.result.sunkCells).toEqual(ship.cells)
      })
    })
  }

  it('sinks a ship when hit out of order', () => {
    const cruiser = ships.find((s) => s.name === 'Cruiser')!
    const [a, b, c] = cruiser.cells
    const board = fireAll(createBoard(ships), [a, c])
    const r = fire(board, b)
    expect(r.ok && r.result.outcome).toBe('sunk')
  })
})

describe('win detection', () => {
  it('is not won until all 17 cells are hit', () => {
    const all = ships.flatMap((s) => s.cells)
    expect(all).toHaveLength(17)
    let board = createBoard(ships)
    for (const [i, c] of all.entries()) {
      expect(allShipsSunk(board)).toBe(false)
      board = fireAll(board, [c])
      expect(allShipsSunk(board)).toBe(i === all.length - 1)
    }
  })

  it('misses never win', () => {
    let board = createBoard(ships)
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if (board.ships.some((s) => s.cells.some((c) => c.row === row && c.col === col))) continue
        board = fireAll(board, [{ row, col }])
      }
    }
    expect(allShipsSunk(board)).toBe(false)
  })

  it('an empty board is never won', () => {
    expect(allShipsSunk(createBoard())).toBe(false)
  })
})
