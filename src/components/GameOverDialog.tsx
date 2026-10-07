import { useEffect, useRef } from 'react'
import type { Side } from '../game/types.ts'

interface Props {
  readonly winner: Side
  readonly shots: number
  readonly hits: number
  readonly onPlayAgain: () => void
}

export default function GameOverDialog({ winner, shots, hits, onPlayAgain }: Props) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => button.current?.focus(), [])
  const accuracy = shots === 0 ? 0 : Math.round((hits / shots) * 100)
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
        <h2 className="dialog__title" id="gameover-title">
          {winner === 'player' ? 'Victory' : 'Defeat'}
        </h2>
        <p className="dialog__text">
          {winner === 'player' ? 'You sank the whole enemy fleet.' : 'The enemy sank your whole fleet.'}
        </p>
        <dl className="dialog__stats">
          <div>
            <dt>Shots fired</dt>
            <dd>{shots}</dd>
          </div>
          <div>
            <dt>Hit accuracy</dt>
            <dd>{accuracy}%</dd>
          </div>
        </dl>
        <button ref={button} type="button" className="btn btn--primary" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  )
}
