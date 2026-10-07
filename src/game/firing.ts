import { inBounds, isShipSunk, shipAt, type Board } from './board.ts'
import type { Coord, ShotResult } from './types.ts'

export type FireOutcome =
  | { readonly ok: true; readonly board: Board; readonly result: ShotResult }
  | { readonly ok: false; readonly reason: 'out-of-bounds' | 'already-fired' }

export function fire(board: Board, coord: Coord): FireOutcome {
  if (!inBounds(coord)) return { ok: false, reason: 'out-of-bounds' }
  if (board.shots[coord.row][coord.col] !== 'none') return { ok: false, reason: 'already-fired' }

  const ship = shipAt(board.ships, coord)
  const shots = board.shots.map((row, r) =>
    r === coord.row ? row.map((cell, c) => (c === coord.col ? (ship ? 'hit' : 'miss') : cell)) : row,
  )
  const next: Board = { ...board, shots }

  if (!ship) return { ok: true, board: next, result: { coord, outcome: 'miss' } }
  if (isShipSunk(next, ship)) {
    return {
      ok: true,
      board: next,
      result: { coord, outcome: 'sunk', ship: ship.name, sunkCells: ship.cells },
    }
  }
  return { ok: true, board: next, result: { coord, outcome: 'hit', ship: ship.name } }
}
