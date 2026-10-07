import { createBoard, inBounds, shipAt, type Board } from './board.ts'
import type { Rng } from './rng.ts'
import { FLEET, type Coord, type Orientation, type PlacedShip, type ShipName } from './types.ts'

export type PlacementCheck = 'ok' | 'out-of-bounds' | 'overlap'

export function shipSize(name: ShipName): number {
  const def = FLEET.find((s) => s.name === name)
  if (!def) throw new Error(`Unknown ship ${name}`)
  return def.size
}

/** Cells a ship would cover. No wrapping: cells past the edge are returned as out-of-bounds coords. */
export function shipCells(start: Coord, size: number, orientation: Orientation): Coord[] {
  return Array.from({ length: size }, (_, i) =>
    orientation === 'horizontal'
      ? { row: start.row, col: start.col + i }
      : { row: start.row + i, col: start.col },
  )
}

export function checkPlacement(ships: readonly PlacedShip[], cells: readonly Coord[]): PlacementCheck {
  if (!cells.every(inBounds)) return 'out-of-bounds'
  if (cells.some((c) => shipAt(ships, c))) return 'overlap'
  return 'ok'
}

/** Returns the new ship list, or null if the placement is invalid or the ship is already placed. */
export function placeShip(
  ships: readonly PlacedShip[],
  name: ShipName,
  start: Coord,
  orientation: Orientation,
): PlacedShip[] | null {
  if (ships.some((s) => s.name === name)) return null
  const cells = shipCells(start, shipSize(name), orientation)
  if (checkPlacement(ships, cells) !== 'ok') return null
  return [...ships, { name, cells }]
}

export function randomFleet(rng: Rng): PlacedShip[] {
  let ships: PlacedShip[] = []
  for (const { name, size } of FLEET) {
    for (;;) {
      const orientation: Orientation = rng.int(2) === 0 ? 'horizontal' : 'vertical'
      const maxRow = orientation === 'vertical' ? 10 - size : 9
      const maxCol = orientation === 'horizontal' ? 10 - size : 9
      const start = { row: rng.int(maxRow + 1), col: rng.int(maxCol + 1) }
      const next = placeShip(ships, name, start, orientation)
      if (next) {
        ships = next
        break
      }
    }
  }
  return ships
}

export function isFleetComplete(ships: readonly PlacedShip[]): boolean {
  return FLEET.every((def) => ships.some((s) => s.name === def.name))
}

export function randomBoard(rng: Rng): Board {
  return createBoard(randomFleet(rng))
}
