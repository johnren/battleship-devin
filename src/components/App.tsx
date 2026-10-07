import { useEffect, useReducer, useState } from 'react'
import { sameCoord } from '../game/board.ts'
import { createInitialState, gameReducer } from '../game/game.ts'
import { checkPlacement, isFleetComplete, shipCells, shipSize } from '../game/placement.ts'
import type { Coord } from '../game/types.ts'
import BoardGrid, { type InputKind, type Preview } from './BoardGrid.tsx'
import FleetStatus from './FleetStatus.tsx'
import GameOverDialog from './GameOverDialog.tsx'
import MessageLog from './MessageLog.tsx'
import PlacementControls from './PlacementControls.tsx'
import { randomSeed, seedFromUrl } from './seed.ts'
import TurnIndicator from './TurnIndicator.tsx'

export const COMPUTER_DELAY_MS = 600

const urlSeed = seedFromUrl(window.location.search)

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, urlSeed ?? randomSeed(), (seed) => createInitialState(seed))
  const [hover, setHover] = useState<Coord | null>(null)
  const [touchPending, setTouchPending] = useState<Coord | null>(null)
  const placing = state.phase === 'placement'
  const { phase, turn, gameId, turnId } = state

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

  useEffect(() => {
    if (phase !== 'playing' || turn !== 'computer') return
    const timer = window.setTimeout(() => dispatch({ type: 'COMPUTER_FIRE', gameId, turnId }), COMPUTER_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [phase, turn, gameId, turnId])

  let preview: Preview | null = null
  if (placing && hover && state.selectedShip) {
    const cells = shipCells(hover, shipSize(state.selectedShip), state.orientation)
    preview = { cells, valid: checkPlacement(state.playerBoard.ships, cells) === 'ok' }
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

  const playAgain = () => {
    setHover(null)
    setTouchPending(null)
    dispatch({ type: 'PLAY_AGAIN', seed: urlSeed ?? randomSeed() })
  }

  return (
    <>
    <main className="app" inert={phase === 'gameover'}>
      <header className="header">
        <h1 className="title">Battleship</h1>
        <TurnIndicator phase={phase} turn={turn} winner={state.winner} />
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
        >
          <FleetStatus label="Your fleet status" board={state.playerBoard} showDamage />
        </BoardGrid>
        <BoardGrid
          id="enemy-board"
          heading="Enemy waters"
          board={state.computerBoard}
          showShips={phase === 'gameover'}
          mode={phase === 'playing' && turn === 'player' ? 'target' : 'locked'}
          onCellClick={(coord) => dispatch({ type: 'PLAYER_FIRE', coord })}
        >
          <FleetStatus label="Enemy fleet status" board={state.computerBoard} showDamage={false} />
        </BoardGrid>
      </div>

      {!placing && <MessageLog entries={state.log} />}
    </main>

      {phase === 'gameover' && state.winner && (
        <GameOverDialog
          winner={state.winner}
          shots={state.playerShots}
          hits={state.playerHits}
          onPlayAgain={playAgain}
        />
      )}
    </>
  )
}
