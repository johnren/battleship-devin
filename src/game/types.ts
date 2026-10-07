export const BOARD_SIZE = 10

export interface Coord {
  readonly row: number
  readonly col: number
}

export type Orientation = 'horizontal' | 'vertical'

export type ShipName = 'Carrier' | 'Battleship' | 'Cruiser' | 'Submarine' | 'Destroyer'

export interface ShipDef {
  readonly name: ShipName
  readonly size: number
}

export const FLEET: readonly ShipDef[] = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
]

export const TOTAL_SHIP_CELLS = FLEET.reduce((sum, s) => sum + s.size, 0)

export interface PlacedShip {
  readonly name: ShipName
  readonly cells: readonly Coord[]
}

export type CellShot = 'none' | 'miss' | 'hit'

export type ShotOutcome = 'miss' | 'hit' | 'sunk'

export interface ShotResult {
  readonly coord: Coord
  readonly outcome: ShotOutcome
  /** Ship that was hit or sunk. */
  readonly ship?: ShipName
  /** Every cell of the ship, present only when outcome is 'sunk'. */
  readonly sunkCells?: readonly Coord[]
}

export type Side = 'player' | 'computer'
