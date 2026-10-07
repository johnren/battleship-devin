import { BOARD_SIZE, type CellShot, type Coord, type PlacedShip } from './types.ts'

export interface Board {
  readonly ships: readonly PlacedShip[]
  /** shots[row][col] */
  readonly shots: readonly (readonly CellShot[])[]
}

export function createBoard(ships: readonly PlacedShip[] = []): Board {
  return {
    ships,
    shots: Array.from({ length: BOARD_SIZE }, () => Array<CellShot>(BOARD_SIZE).fill('none')),
  }
}

export function inBounds(c: Coord): boolean {
  return (
    Number.isInteger(c.row) &&
    Number.isInteger(c.col) &&
    c.row >= 0 &&
    c.row < BOARD_SIZE &&
    c.col >= 0 &&
    c.col < BOARD_SIZE
  )
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col
}

export function shipAt(ships: readonly PlacedShip[], c: Coord): PlacedShip | undefined {
  return ships.find((s) => s.cells.some((cell) => sameCoord(cell, c)))
}

export function isShipSunk(board: Board, ship: PlacedShip): boolean {
  return ship.cells.every((c) => board.shots[c.row][c.col] === 'hit')
}

export function hitCount(board: Board, ship: PlacedShip): number {
  return ship.cells.filter((c) => board.shots[c.row][c.col] === 'hit').length
}

export function allShipsSunk(board: Board): boolean {
  return board.ships.length > 0 && board.ships.every((s) => isShipSunk(board, s))
}
