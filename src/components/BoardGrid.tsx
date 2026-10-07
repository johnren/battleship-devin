import { useRef, type ReactNode } from 'react'
import { isShipSunk, sameCoord, shipAt, type Board } from '../game/board.ts'
import { BOARD_SIZE, type Coord } from '../game/types.ts'
import { COL_LABELS, coordLabel, ROW_LABELS } from './labels.ts'

export type GridMode = 'placing' | 'target' | 'locked'

export interface Preview {
  readonly cells: readonly Coord[]
  readonly valid: boolean
}

/** 'touch' for touch/pen taps, 'mouse' for mouse clicks, 'keyboard' for Enter/Space activation. */
export type InputKind = 'touch' | 'mouse' | 'keyboard'

interface Props {
  readonly id: string
  readonly heading: string
  readonly board: Board
  /** Show un-sunk ships (always true for your own board; true for the enemy at game over). */
  readonly showShips: boolean
  readonly mode: GridMode
  readonly preview?: Preview | null
  readonly onCellClick?: (c: Coord, input: InputKind) => void
  readonly onCellHover?: (c: Coord | null) => void
  readonly children?: ReactNode
}

const ROWS = Array.from({ length: BOARD_SIZE }, (_, i) => i)

export default function BoardGrid({
  id,
  heading,
  board,
  showShips,
  mode,
  preview,
  onCellClick,
  onCellHover,
  children,
}: Props) {
  const pointerType = useRef<string | null>(null)

  return (
    <section className="board" aria-labelledby={`${id}-heading`}>
      <h2 className="board__heading" id={`${id}-heading`}>
        {heading}
      </h2>
      <div
        className="grid"
        data-testid={id}
        onPointerLeave={(e) => {
          // Touch taps also emit pointer/mouse leave events after the click; only a real mouse leaving clears the preview.
          if (e.pointerType === 'mouse') onCellHover?.(null)
        }}
      >
        <span className="grid__label" aria-hidden="true" />
        {COL_LABELS.map((l) => (
          <span key={l} className="grid__label" aria-hidden="true">
            {l}
          </span>
        ))}
        {ROWS.map((row) => (
          <Row
            key={row}
            row={row}
            board={board}
            showShips={showShips}
            mode={mode}
            preview={preview}
            pointerType={pointerType}
            onCellClick={onCellClick}
            onCellHover={onCellHover}
          />
        ))}
      </div>
      {children}
    </section>
  )
}

interface RowProps extends Pick<Props, 'board' | 'showShips' | 'mode' | 'preview' | 'onCellClick' | 'onCellHover'> {
  readonly row: number
  readonly pointerType: { current: string | null }
}

function Row({ row, board, showShips, mode, preview, pointerType, onCellClick, onCellHover }: RowProps) {
  return (
    <>
      <span className="grid__label" aria-hidden="true">
        {ROW_LABELS[row]}
      </span>
      {ROWS.map((col) => {
        const coord = { row, col }
        const shot = board.shots[row][col]
        const ship = shipAt(board.ships, coord)
        const sunk = ship !== undefined && isShipSunk(board, ship)
        const visibleShip = ship !== undefined && (showShips || sunk)
        const inPreview = preview?.cells.some((p) => sameCoord(p, coord)) ?? false
        const canFire = mode === 'target' && shot === 'none'
        const actionable = mode === 'placing' || canFire

        const classes = ['cell']
        if (visibleShip) classes.push(sunk ? 'cell--sunk' : 'cell--ship')
        if (inPreview) classes.push(preview?.valid ? 'cell--preview-valid' : 'cell--preview-invalid')
        if (canFire) classes.push('cell--target')
        if (mode === 'placing') classes.push('cell--placing')

        let state: string
        if (sunk && shot === 'hit') state = `sunk ${ship.name}`
        else if (shot === 'hit') state = visibleShip ? `${ship.name}, hit` : 'hit'
        else if (shot === 'miss') state = 'miss'
        else if (visibleShip) state = ship.name
        else state = 'water'

        return (
          <button
            key={col}
            type="button"
            className={classes.join(' ')}
            aria-label={`${coordLabel(coord)}, ${state}`}
            aria-disabled={!actionable}
            data-row={row}
            data-col={col}
            onPointerDown={(e) => {
              pointerType.current = e.pointerType
            }}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') onCellHover?.(coord)
            }}
            onFocus={() => onCellHover?.(coord)}
            onClick={(e) => {
              const input: InputKind =
                e.detail === 0 ? 'keyboard' : pointerType.current === 'mouse' || !pointerType.current ? 'mouse' : 'touch'
              pointerType.current = null
              if (actionable) onCellClick?.(coord, input)
            }}
          >
            {shot === 'miss' && <span className="marker marker--miss" aria-hidden="true" />}
            {shot === 'hit' && (
              <span className="marker marker--hit" aria-hidden="true">
                ✕
              </span>
            )}
          </button>
        )
      })}
    </>
  )
}
