import { describe, expect, it } from 'vitest'
import { aiMode, chooseShot, createAi, recordShot, type AiState } from './ai.ts'
import { allShipsSunk, createBoard, hitCount, inBounds, isShipSunk, type Board } from './board.ts'
import { fire } from './firing.ts'
import { randomFleet, shipCells } from './placement.ts'
import { createRng, type Rng } from './rng.ts'
import type { Coord, PlacedShip } from './types.ts'

function step(board: Board, ai: AiState, rng: Rng) {
  const shot = chooseShot(ai, rng)
  const r = fire(board, shot.coord)
  if (!r.ok) throw new Error(`invalid shot ${JSON.stringify(shot.coord)}: ${r.reason}`)
  const { coord, outcome, sunkCells } = r.result
  return { shot, board: r.board, ai: recordShot(ai, { coord, outcome, sunkCells }), result: r.result }
}

describe('computer opponent: 100 simulated games', () => {
  it('never repeats, never fires off the board, never hunts with an unsunk ship hit', () => {
    for (let game = 0; game < 100; game++) {
      let board = createBoard(randomFleet(createRng(10_000 + game)))
      let ai = createAi()
      const rng = createRng(game)
      const fired = new Set<string>()
      let shots = 0
      while (!allShipsSunk(board)) {
        const woundedShipExists = board.ships.some((s) => hitCount(board, s) > 0 && !isShipSunk(board, s))
        const next = step(board, ai, rng)
        const key = `${next.shot.coord.row},${next.shot.coord.col}`
        expect(inBounds(next.shot.coord)).toBe(true)
        expect(fired.has(key)).toBe(false)
        if (woundedShipExists) expect(next.shot.mode).toBe('target')
        fired.add(key)
        board = next.board
        ai = next.ai
        shots++
        expect(shots).toBeLessThanOrEqual(100)
      }
      expect(aiMode(ai)).toBe('hunt')
    }
  })

  it('is repeatable for the same seed', () => {
    const play = (seed: number) => {
      let board = createBoard(randomFleet(createRng(42)))
      let ai = createAi()
      const rng = createRng(seed)
      const coords: Coord[] = []
      while (!allShipsSunk(board)) {
        const next = step(board, ai, rng)
        coords.push(next.shot.coord)
        board = next.board
        ai = next.ai
      }
      return coords
    }
    expect(play(123)).toEqual(play(123))
  })
})

describe('computer opponent: strategy', () => {
  const ship = (name: PlacedShip['name'], row: number, col: number, size: number, o: 'horizontal' | 'vertical') => ({
    name,
    cells: shipCells({ row, col }, size, o),
  })

  it('hunts on a checkerboard', () => {
    const rng = createRng(5)
    let ai = createAi()
    for (let i = 0; i < 50; i++) {
      const { coord, mode } = chooseShot(ai, rng)
      expect(mode).toBe('hunt')
      expect((coord.row + coord.col) % 2).toBe(0)
      ai = recordShot(ai, { coord, outcome: 'miss' })
    }
    // every checkerboard cell is used; it falls back to the remaining cells
    const fallback = chooseShot(ai, rng)
    expect(fallback.mode).toBe('hunt')
    expect((fallback.coord.row + fallback.coord.col) % 2).toBe(1)
  })

  it('tries up, down, left, right after a first hit', () => {
    let ai = recordShot(createAi(), { coord: { row: 4, col: 4 }, outcome: 'hit' })
    const rng = createRng(1)
    const order: Coord[] = []
    for (let i = 0; i < 4; i++) {
      const s = chooseShot(ai, rng)
      expect(s.mode).toBe('target')
      order.push(s.coord)
      ai = recordShot(ai, { coord: s.coord, outcome: 'miss' })
    }
    expect(order).toEqual([
      { row: 3, col: 4 },
      { row: 5, col: 4 },
      { row: 4, col: 3 },
      { row: 4, col: 5 },
    ])
  })

  it('skips neighbours that are off the board', () => {
    const ai = recordShot(createAi(), { coord: { row: 0, col: 0 }, outcome: 'hit' })
    expect(chooseShot(ai, createRng(1)).coord).toEqual({ row: 1, col: 0 })
  })

  it('follows a line of hits in both directions', () => {
    let ai = createAi()
    ai = recordShot(ai, { coord: { row: 5, col: 4 }, outcome: 'hit' })
    ai = recordShot(ai, { coord: { row: 5, col: 5 }, outcome: 'hit' })
    const rng = createRng(1)
    const first = chooseShot(ai, rng)
    expect([{ row: 5, col: 3 }, { row: 5, col: 6 }]).toContainEqual(first.coord)
    ai = recordShot(ai, { coord: first.coord, outcome: 'miss' })
    const second = chooseShot(ai, rng)
    expect([{ row: 5, col: 3 }, { row: 5, col: 6 }]).toContainEqual(second.coord)
    expect(second.coord).not.toEqual(first.coord)
  })

  it('keeps targeting leftover hits after a sink', () => {
    // Destroyer at row 2 cols 3-4, Cruiser directly below at row 3 cols 3-5.
    const board0 = createBoard([ship('Destroyer', 2, 3, 2, 'horizontal'), ship('Cruiser', 3, 3, 3, 'horizontal')])
    let board = board0
    let ai = createAi()
    for (const coord of [
      { row: 3, col: 3 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ]) {
      const r = fire(board, coord)
      if (!r.ok) throw new Error()
      board = r.board
      ai = recordShot(ai, { coord, outcome: r.result.outcome, sunkCells: r.result.sunkCells })
    }
    // Destroyer is sunk; the Cruiser hit at D4 is unresolved.
    expect(aiMode(ai)).toBe('target')
    const rng = createRng(3)
    while (!isShipSunk(board, board.ships[1])) {
      const next = step(board, ai, rng)
      expect(next.shot.mode).toBe('target')
      board = next.board
      ai = next.ai
    }
    expect(aiMode(ai)).toBe('hunt')
  })

  it('falls back to neighbours when a line is blocked at both ends', () => {
    // Two vertical ships side by side; horizontal "line" of hits belongs to two ships.
    let ai = createAi()
    ai = recordShot(ai, { coord: { row: 4, col: 3 }, outcome: 'hit' })
    ai = recordShot(ai, { coord: { row: 4, col: 4 }, outcome: 'hit' })
    ai = recordShot(ai, { coord: { row: 4, col: 2 }, outcome: 'miss' })
    ai = recordShot(ai, { coord: { row: 4, col: 5 }, outcome: 'miss' })
    const s = chooseShot(ai, createRng(1))
    expect(s.mode).toBe('target')
    expect([
      { row: 3, col: 3 },
      { row: 5, col: 3 },
      { row: 3, col: 4 },
      { row: 5, col: 4 },
    ]).toContainEqual(s.coord)
  })
})
