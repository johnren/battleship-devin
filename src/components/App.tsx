import { useEffect, useReducer, useState } from 'react'
import { createInitialState, gameReducer } from '../game/game.ts'
import { checkPlacement, isFleetComplete, shipCells, shipSize } from '../game/placement.ts'
import { sameCoord } from '../game/board.ts'
import type { Coord } from '../game/types.ts'
import BoardGrid, { type InputKind, type Preview } from './BoardGrid.tsx'
import PlacementControls from './PlacementControls.tsx'
import { randomSeed, seedFromUrl } from './seed.ts'

const urlSeed = seedFromUrl(window.location.search)

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, urlSeed ?? randomSeed(), (seed) => createInitialState(seed))
  const [hover, setHover] = useState<Coord | null>(null)
  const [touchPending, setTouchPending] = useState<Coord | null>(null)
  const placing = state.phase === 'placement'

  useEffect(() => {
    if (!placing) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === ' ' || e.key.toLowerCase() === 'r') {
        // Stop the page scrolling and stop Space activating a focused button.
        e.preventDefault()
        if (!e.repeat) dispatch({ type: 'ROTATE' })
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [placing])

  let preview: Preview | null = null
  if (placing && hover && state.selectedShip) {
    const cells = shipCells(hover, shipSize(state.selectedShip), state.orientation)
    preview = {
      cells,
      valid: checkPlacement(state.playerBoard.ships, cells) === 'ok',
    }
  }

  const onPlayerGridClick = (c: Coord, input: InputKind) => {
    if (input === 'touch' && !(touchPending && sameCoord(touchPending, c))) {
      setTouchPending(c)
      setHover(c)
      return
    }
    setTouchPending(null)
    dispatch({ type: 'PLACE_SHIP', coord: c })
  }

  return (
    <main className="app">
      <header className="header">
        <h1 className="title">Battleship</h1>
        <span className="turn" role="status">
          {placing ? 'Place your fleet' : ''}
        </span>
      </header>

      {placing && (
        <PlacementControls
          board={state.playerBoard}
          selectedShip={state.selectedShip}
          orientation={state.orientation}
          canStart={isFleetComplete(state.playerBoard.ships)}
          onSelect={(ship) => dispatch({ type: 'SELECT_SHIP', ship })}
          onRotate={() => dispatch({ type: 'ROTATE' })}
          onRandomize={() => dispatch({ type: 'RANDOMIZE' })}
          onReset={() => dispatch({ type: 'RESET_PLACEMENT' })}
          onStart={() => dispatch({ type: 'START' })}
        />
      )}

      <div className="boards">
        <BoardGrid
          id="player-board"
          heading="Your fleet"
          board={state.playerBoard}
          showShips
          mode={placing && state.selectedShip ? 'placing' : 'locked'}
          preview={preview}
          onCellClick={onPlayerGridClick}
          onCellHover={(c) => {
            setHover(c)
            if (c === null) setTouchPending(null)
          }}
        />
        <BoardGrid id="enemy-board" heading="Enemy waters" board={state.computerBoard} showShips={false} mode="locked" />
      </div>
    </main>
  )
}
