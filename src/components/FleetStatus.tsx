import { hitCount, isShipSunk, type Board } from '../game/board.ts'
import { FLEET } from '../game/types.ts'

interface Props {
  readonly label: string
  readonly board: Board
  /** Show per-cell damage. Off for the enemy, since you only learn which ship you hit when it sinks. */
  readonly showDamage: boolean
}

export default function FleetStatus({ label, board, showDamage }: Props) {
  return (
    <ul className="fleet" aria-label={label}>
      {FLEET.map(({ name, size }) => {
        const ship = board.ships.find((s) => s.name === name)
        const sunk = ship !== undefined && isShipSunk(board, ship)
        const damage = ship === undefined ? 0 : sunk ? size : showDamage ? hitCount(board, ship) : 0
        return (
          <li key={name} className={`fleet__ship${sunk ? ' fleet__ship--sunk' : ''}`}>
            <span className="fleet__name">
              {name}
              <span className="visually-hidden">{sunk ? ', sunk' : showDamage ? `, ${damage} of ${size} hit` : ', afloat'}</span>
            </span>
            <span className="fleet__cells" aria-hidden="true">
              {Array.from({ length: size }, (_, i) => (
                <span key={i} className={`fleet__cell${i < damage ? ' fleet__cell--hit' : ''}`} />
              ))}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
