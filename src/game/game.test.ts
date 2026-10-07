import { describe, expect, it } from 'vitest'
import { createBoard } from './board.ts'
import { createInitialState, gameReducer, LOG_LIMIT, type GameAction, type GameState } from './game.ts'
import { FLEET, type Coord } from './types.ts'

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state)
const computerMove = (s: GameState): Extract<GameAction, { type: 'COMPUTER_FIRE' }> => ({ type: 'COMPUTER_FIRE', gameId: s.gameId, turnId: s.turnId })
const started = (seed = 123) => run(createInitialState(seed), { type: 'RANDOMIZE' }, { type: 'START' })

function untriedWater(s: GameState): Coord {
  for (let row = 0; row < 10; row++)
    for (let col = 0; col < 10; col++) {
      const c = { row, col }
      const isShip = s.computerBoard.ships.some((sh) => sh.cells.some((x) => x.row === row && x.col === col))
      if (!isShip && s.computerBoard.shots[row][col] === 'none') return c
    }
  throw new Error('no water left')
}

describe('initial state', () => {
  it('places a full random computer fleet, repeatable by seed', () => {
    const a = createInitialState(123)
    expect(a.computerBoard.ships).toHaveLength(FLEET.length)
    expect(createInitialState(123).computerBoard).toEqual(a.computerBoard)
    expect(createInitialState(124).computerBoard).not.toEqual(a.computerBoard)
    expect(a.phase).toBe('placement')
    expect(a.playerBoard.ships).toHaveLength(0)
  })
})

describe('placement', () => {
  it('places the selected ship and selects the next one', () => {
    const s = run(createInitialState(1), { type: 'PLACE_SHIP', coord: { row: 0, col: 0 } })
    expect(s.playerBoard.ships.map((x) => x.name)).toEqual(['Carrier'])
    expect(s.selectedShip).toBe('Battleship')
  })

  it('rotates between horizontal and vertical', () => {
    const s = run(createInitialState(1), { type: 'ROTATE' })
    expect(s.orientation).toBe('vertical')
    expect(run(s, { type: 'ROTATE' }).orientation).toBe('horizontal')
    const placed = run(s, { type: 'PLACE_SHIP', coord: { row: 0, col: 0 } })
    expect(placed.playerBoard.ships[0].cells.map((c) => c.col)).toEqual([0, 0, 0, 0, 0])
  })

  it('ignores invalid placements', () => {
    const s0 = createInitialState(1)
    expect(run(s0, { type: 'PLACE_SHIP', coord: { row: 0, col: 6 } })).toBe(s0)
    const s1 = run(s0, { type: 'PLACE_SHIP', coord: { row: 0, col: 0 } })
    expect(run(s1, { type: 'PLACE_SHIP', coord: { row: 0, col: 4 } })).toBe(s1)
  })

  it('cannot start until all five ships are placed', () => {
    let s = createInitialState(1)
    for (let i = 0; i < FLEET.length; i++) {
      expect(run(s, { type: 'START' }).phase).toBe('placement')
      s = run(s, { type: 'PLACE_SHIP', coord: { row: i, col: 0 } })
    }
    expect(s.selectedShip).toBeNull()
    expect(run(s, { type: 'START' }).phase).toBe('playing')
  })

  it('randomize places a full fleet and reset clears it', () => {
    const s = run(createInitialState(1), { type: 'RANDOMIZE' })
    expect(s.playerBoard.ships).toHaveLength(5)
    const r = run(s, { type: 'RESET_PLACEMENT' })
    expect(r.playerBoard.ships).toHaveLength(0)
    expect(r.selectedShip).toBe('Carrier')
  })

  it('randomize does not change the computer fleet or its shot sequence', () => {
    const a = run(createInitialState(9), { type: 'RANDOMIZE' })
    const b = run(createInitialState(9), { type: 'RANDOMIZE' }, { type: 'RANDOMIZE' })
    expect(a.computerBoard).toEqual(b.computerBoard)
    expect(a.aiRngState).toBe(b.aiRngState)
  })
})

describe('turns', () => {
  it('player fires first, then the computer, alternating', () => {
    let s = started()
    expect(s.turn).toBe('player')
    s = run(s, { type: 'PLAYER_FIRE', coord: { row: 0, col: 0 } })
    expect(s.turn).toBe('computer')
    s = run(s, computerMove(s))
    expect(s.turn).toBe('player')
    expect(s.log.map((l) => l.shooter)).toEqual(['computer', 'player'])
  })

  it('a hit does not grant an extra turn', () => {
    const s0 = started()
    const target = s0.computerBoard.ships[0].cells[0]
    const s = run(s0, { type: 'PLAYER_FIRE', coord: target })
    expect(s.log[0].result.outcome).toBe('hit')
    expect(s.turn).toBe('computer')
  })

  it('repeated shots are rejected without using a turn', () => {
    let s = started()
    s = run(s, { type: 'PLAYER_FIRE', coord: { row: 0, col: 0 } })
    s = run(s, computerMove(s))
    const before = s
    expect(run(s, { type: 'PLAYER_FIRE', coord: { row: 0, col: 0 } })).toBe(before)
  })

  it('rapid repeated clicks fire only one shot', () => {
    const s0 = started()
    const s = run(
      s0,
      { type: 'PLAYER_FIRE', coord: { row: 0, col: 0 } },
      { type: 'PLAYER_FIRE', coord: { row: 0, col: 1 } },
      { type: 'PLAYER_FIRE', coord: { row: 0, col: 2 } },
    )
    expect(s.playerShots).toBe(1)
    expect(s.computerBoard.shots[0][1]).toBe('none')
  })

  it('cannot fire before the game starts or during the computer turn', () => {
    const s0 = createInitialState(1)
    expect(run(s0, { type: 'PLAYER_FIRE', coord: { row: 0, col: 0 } })).toBe(s0)
  })

  it('ignores computer moves with a stale turn id', () => {
    let s = started()
    s = run(s, { type: 'PLAYER_FIRE', coord: { row: 0, col: 0 } })
    const move = computerMove(s)
    s = run(s, move)
    s = run(s, { type: 'PLAYER_FIRE', coord: { row: 0, col: 1 } })
    expect(run(s, move)).toBe(s)
  })

  it('keeps only the latest log entries, newest first', () => {
    let s = started()
    for (let i = 0; i < 4; i++) {
      s = run(s, { type: 'PLAYER_FIRE', coord: untriedWater(s) })
      s = run(s, computerMove(s))
    }
    expect(s.log).toHaveLength(LOG_LIMIT)
    expect(s.log[0].shooter).toBe('computer')
    expect(s.log[0].id).toBeGreaterThan(s.log[1].id)
  })
})

describe('game over', () => {
  it('player wins by sinking every ship', () => {
    let s = started()
    const targets = s.computerBoard.ships.flatMap((x) => x.cells)
    for (const [i, coord] of targets.entries()) {
      s = run(s, { type: 'PLAYER_FIRE', coord })
      if (i < targets.length - 1) s = run(s, computerMove(s))
    }
    expect(s.phase).toBe('gameover')
    expect(s.winner).toBe('player')
    expect(s.playerShots).toBe(17)
    expect(s.playerHits).toBe(17)
    // no further shots once it's over
    expect(run(s, computerMove(s))).toBe(s)
    expect(run(s, { type: 'PLAYER_FIRE', coord: untriedWater(s) })).toBe(s)
  })

  it('computer wins when the player only misses', () => {
    let s = started()
    while (s.phase === 'playing') {
      s = run(s, { type: 'PLAYER_FIRE', coord: untriedWater(s) })
      s = run(s, computerMove(s))
    }
    expect(s.winner).toBe('computer')
    expect(s.playerHits).toBe(0)
  })
})

describe('play again', () => {
  it('fully resets state', () => {
    let s = started(5)
    s = run(s, { type: 'PLAYER_FIRE', coord: { row: 0, col: 0 } })
    const again = run(s, { type: 'PLAY_AGAIN', seed: 5 })
    const fresh = createInitialState(5, s.gameId + 1)
    expect(again).toEqual(fresh)
    expect(again.phase).toBe('placement')
    expect(again.playerBoard).toEqual(createBoard())
    expect(again.log).toEqual([])
    expect(again.playerShots).toBe(0)
    expect(again.winner).toBeNull()
  })

  it('cancels a pending computer move', () => {
    let s = started(5)
    s = run(s, { type: 'PLAYER_FIRE', coord: { row: 0, col: 0 } })
    expect(s.turn).toBe('computer')
    const pending = computerMove(s)
    s = run(s, { type: 'PLAY_AGAIN', seed: 5 })
    expect(run(s, pending)).toBe(s)
    // Even after reaching the same turn in the new game, the old move is ignored.
    s = run(s, { type: 'RANDOMIZE' }, { type: 'START' }, { type: 'PLAYER_FIRE', coord: { row: 0, col: 0 } })
    expect(s.turn).toBe('computer')
    expect(s.turnId).toBe(pending.turnId)
    expect(run(s, pending)).toBe(s)
    expect(s.playerBoard.shots.flat().every((c) => c === 'none')).toBe(true)
  })
})
