import type { Board } from '../game/board.ts'
import { FLEET, type Orientation, type ShipName } from '../game/types.ts'

interface Props {
  readonly board: Board
  readonly selectedShip: ShipName | null
  readonly orientation: Orientation
  readonly canStart: boolean
  readonly onSelect: (ship: ShipName) => void
  readonly onRotate: () => void
  readonly onRandomize: () => void
  readonly onReset: () => void
  readonly onStart: () => void
}

export default function PlacementControls({
  board,
  selectedShip,
  orientation,
  canStart,
  onSelect,
  onRotate,
  onRandomize,
  onReset,
  onStart,
}: Props) {
  return (
    <section className="placement" aria-label="Place your fleet">
      <p className="placement__hint">
        {selectedShip
          ? `Placing ${selectedShip} (${orientation}). Click your grid to place it; press R or Space to rotate.`
          : 'All ships placed. Press Start when ready.'}
      </p>
      <div className="picker" role="group" aria-label="Ships">
        {FLEET.map(({ name, size }) => {
          const placed = board.ships.some((s) => s.name === name)
          return (
            <button
              key={name}
              type="button"
              className={`btn${placed ? ' picker__ship--placed' : ''}`}
              aria-pressed={selectedShip === name}
              disabled={placed}
              onClick={() => onSelect(name)}
            >
              {name} ({size})
            </button>
          )
        })}
      </div>
      <div className="actions">
        <button type="button" className="btn" onClick={onRotate}>
          Rotate ({orientation === 'horizontal' ? 'Horizontal' : 'Vertical'})
        </button>
        <button type="button" className="btn" onClick={onRandomize}>
          Randomize
        </button>
        <button type="button" className="btn" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="btn btn--primary" disabled={!canStart} onClick={onStart}>
          Start
        </button>
      </div>
    </section>
  )
}
