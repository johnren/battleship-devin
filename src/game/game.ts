import { chooseShot, createAi, recordShot, type AiState } from './ai.ts'
import { allShipsSunk, createBoard, type Board } from './board.ts'
import { fire } from './firing.ts'
import { isFleetComplete, placeShip, randomFleet } from './placement.ts'
import { createRng } from './rng.ts'
import { FLEET, type Coord, type Orientation, type ShipName, type ShotResult, type Side } from './types.ts'

export type Phase = 'placement' | 'playing' | 'gameover'

export interface LogEntry {
  readonly id: number
  readonly shooter: Side
  readonly result: ShotResult
}

export const LOG_LIMIT = 5

export interface GameState {
  /** Increments on every Play Again so stale timers from a previous game are ignored. */
  readonly gameId: number
  readonly seed: number
  readonly phase: Phase
  readonly turn: Side
  /** Increments on every turn change; a scheduled computer move must match it. */
  readonly turnId: number
  readonly playerBoard: Board
  readonly computerBoard: Board
  readonly ai: AiState
  readonly aiRngState: number
  readonly playerRngState: number
  readonly selectedShip: ShipName | null
  readonly orientation: Orientation
  /** Newest first, at most LOG_LIMIT entries. */
  readonly log: readonly LogEntry[]
  readonly nextLogId: number
  readonly winner: Side | null
  readonly playerShots: number
  readonly playerHits: number
}

export type GameAction =
  | { type: 'SELECT_SHIP'; ship: ShipName }
  | { type: 'ROTATE' }
  | { type: 'PLACE_SHIP'; coord: Coord }
  | { type: 'RANDOMIZE' }
  | { type: 'RESET_PLACEMENT' }
  | { type: 'START' }
  | { type: 'PLAYER_FIRE'; coord: Coord }
  | { type: 'COMPUTER_FIRE'; gameId: number; turnId: number }
  | { type: 'PLAY_AGAIN'; seed: number }

const PLAYER_SEED_SALT = 0x5bd1e995

export function createInitialState(seed: number, gameId = 0): GameState {
  const aiRng = createRng(seed)
  const computerShips = randomFleet(aiRng)
  return {
    gameId,
    seed,
    phase: 'placement',
    turn: 'player',
    turnId: 0,
    playerBoard: createBoard(),
    computerBoard: createBoard(computerShips),
    ai: createAi(),
    aiRngState: aiRng.state(),
    playerRngState: createRng(seed ^ PLAYER_SEED_SALT).state(),
    selectedShip: FLEET[0].name,
    orientation: 'horizontal',
    log: [],
    nextLogId: 0,
    winner: null,
    playerShots: 0,
    playerHits: 0,
  }
}

function nextUnplaced(board: Board): ShipName | null {
  return FLEET.find((def) => !board.ships.some((s) => s.name === def.name))?.name ?? null
}

function addLog(state: GameState, shooter: Side, result: ShotResult): Pick<GameState, 'log' | 'nextLogId'> {
  return {
    log: [{ id: state.nextLogId, shooter, result }, ...state.log].slice(0, LOG_LIMIT),
    nextLogId: state.nextLogId + 1,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_SHIP': {
      if (state.phase !== 'placement') return state
      if (state.playerBoard.ships.some((s) => s.name === action.ship)) return state
      return { ...state, selectedShip: action.ship }
    }
    case 'ROTATE': {
      if (state.phase !== 'placement') return state
      return { ...state, orientation: state.orientation === 'horizontal' ? 'vertical' : 'horizontal' }
    }
    case 'PLACE_SHIP': {
      if (state.phase !== 'placement' || !state.selectedShip) return state
      const ships = placeShip(state.playerBoard.ships, state.selectedShip, action.coord, state.orientation)
      if (!ships) return state
      const playerBoard = createBoard(ships)
      return { ...state, playerBoard, selectedShip: nextUnplaced(playerBoard) }
    }
    case 'RANDOMIZE': {
      if (state.phase !== 'placement') return state
      const rng = createRng(state.playerRngState)
      const playerBoard = createBoard(randomFleet(rng))
      return { ...state, playerBoard, selectedShip: null, playerRngState: rng.state() }
    }
    case 'RESET_PLACEMENT': {
      if (state.phase !== 'placement') return state
      return { ...state, playerBoard: createBoard(), selectedShip: FLEET[0].name }
    }
    case 'START': {
      if (state.phase !== 'placement' || !isFleetComplete(state.playerBoard.ships)) return state
      return { ...state, phase: 'playing', turn: 'player', selectedShip: null, turnId: state.turnId + 1 }
    }
    case 'PLAYER_FIRE': {
      if (state.phase !== 'playing' || state.turn !== 'player') return state
      const shot = fire(state.computerBoard, action.coord)
      if (!shot.ok) return state
      const won = allShipsSunk(shot.board)
      return {
        ...state,
        ...addLog(state, 'player', shot.result),
        computerBoard: shot.board,
        playerShots: state.playerShots + 1,
        playerHits: state.playerHits + (shot.result.outcome === 'miss' ? 0 : 1),
        phase: won ? 'gameover' : 'playing',
        winner: won ? 'player' : null,
        turn: won ? 'player' : 'computer',
        turnId: state.turnId + 1,
      }
    }
    case 'COMPUTER_FIRE': {
      if (state.phase !== 'playing' || state.turn !== 'computer') return state
      if (action.gameId !== state.gameId || action.turnId !== state.turnId) return state
      const rng = createRng(state.aiRngState)
      const { coord } = chooseShot(state.ai, rng)
      const shot = fire(state.playerBoard, coord)
      if (!shot.ok) throw new Error(`Computer chose an invalid shot: ${shot.reason}`)
      const { outcome, sunkCells } = shot.result
      const won = allShipsSunk(shot.board)
      return {
        ...state,
        ...addLog(state, 'computer', shot.result),
        playerBoard: shot.board,
        ai: recordShot(state.ai, { coord, outcome, sunkCells }),
        aiRngState: rng.state(),
        phase: won ? 'gameover' : 'playing',
        winner: won ? 'computer' : null,
        turn: won ? 'computer' : 'player',
        turnId: state.turnId + 1,
      }
    }
    case 'PLAY_AGAIN': {
      return createInitialState(action.seed, state.gameId + 1)
    }
  }
}
