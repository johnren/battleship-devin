import type { Phase } from '../game/game.ts'
import type { Side } from '../game/types.ts'

interface Props {
  readonly phase: Phase
  readonly turn: Side
  readonly winner: Side | null
}

export default function TurnIndicator({ phase, turn, winner }: Props) {
  let content
  let className = 'turn'
  if (phase === 'placement') content = 'Place your fleet'
  else if (phase === 'gameover') content = winner === 'player' ? 'You won' : 'You lost'
  else if (turn === 'player') {
    content = 'Your turn'
    className += ' turn--player'
  } else {
    content = (
      <>
        <span className="turn__dot" aria-hidden="true" />
        Enemy firing…
      </>
    )
  }
  return (
    <span className={className} role="status" data-testid="turn-indicator">
      {content}
    </span>
  )
}
