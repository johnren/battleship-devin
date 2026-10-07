import { inBounds, sameCoord } from './board.ts'
import type { Rng } from './rng.ts'
import { BOARD_SIZE, type Coord, type ShotOutcome } from './types.ts'

/**
 * What the computer is allowed to know about a shot it fired: where, the result,
 * and, when a ship sinks, that ship's cells (the same information the player
 * sees on the enemy grid when they sink a ship). It never sees the player's board.
 */
export interface Observation {
  readonly coord: Coord
  readonly outcome: ShotOutcome
  readonly sunkCells?: readonly Coord[]
}

export type Knowledge = 'unknown' | 'miss' | 'hit' | 'sunk'

export interface AiState {
  /** knowledge[row][col] */
  readonly knowledge: readonly (readonly Knowledge[])[]
  /** Hits in the order they were made. */
  readonly hits: readonly Coord[]
}

export type AiMode = 'hunt' | 'target'

export interface AiShot {
  readonly coord: Coord
  readonly mode: AiMode
}

const DIRECTIONS: readonly Coord[] = [
  { row: -1, col: 0 }, // up
  { row: 1, col: 0 }, // down
  { row: 0, col: -1 }, // left
  { row: 0, col: 1 }, // right
]

export function createAi(): AiState {
  return {
    knowledge: Array.from({ length: BOARD_SIZE }, () => Array<Knowledge>(BOARD_SIZE).fill('unknown')),
    hits: [],
  }
}

function isUntried(ai: AiState, c: Coord): boolean {
  return inBounds(c) && ai.knowledge[c.row][c.col] === 'unknown'
}

function isUnresolvedHit(ai: AiState, c: Coord): boolean {
  return inBounds(c) && ai.knowledge[c.row][c.col] === 'hit'
}

/** Hits not yet attributed to a sunk ship, oldest first. */
export function unresolvedHits(ai: AiState): Coord[] {
  return ai.hits.filter((h) => isUnresolvedHit(ai, h))
}

export function aiMode(ai: AiState): AiMode {
  return unresolvedHits(ai).length > 0 ? 'target' : 'hunt'
}

/** Untried cells just past both ends of lines of 2+ unresolved hits, longest line first. */
function lineCandidates(ai: AiState, hits: readonly Coord[]): Coord[] {
  const lines: { length: number; ends: Coord[] }[] = []
  for (const h of hits) {
    for (const axis of [DIRECTIONS[1], DIRECTIONS[3]]) {
      const back = { row: h.row - axis.row, col: h.col - axis.col }
      if (isUnresolvedHit(ai, back)) continue // only start counting from the line's first cell
      let length = 1
      let end = { row: h.row + axis.row, col: h.col + axis.col }
      while (isUnresolvedHit(ai, end)) {
        length++
        end = { row: end.row + axis.row, col: end.col + axis.col }
      }
      if (length < 2) continue
      lines.push({ length, ends: [back, end].filter((c) => isUntried(ai, c)) })
    }
  }
  lines.sort((a, b) => b.length - a.length)
  return lines.flatMap((l) => l.ends)
}

function neighborCandidates(ai: AiState, hits: readonly Coord[]): Coord[] {
  const out: Coord[] = []
  for (const h of hits) {
    for (const d of DIRECTIONS) {
      const c = { row: h.row + d.row, col: h.col + d.col }
      if (isUntried(ai, c) && !out.some((o) => sameCoord(o, c))) out.push(c)
    }
  }
  return out
}

function huntCandidates(ai: AiState): Coord[] {
  const checker: Coord[] = []
  const any: Coord[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (ai.knowledge[row][col] !== 'unknown') continue
      any.push({ row, col })
      if ((row + col) % 2 === 0) checker.push({ row, col })
    }
  }
  return checker.length > 0 ? checker : any
}

export function chooseShot(ai: AiState, rng: Rng): AiShot {
  const hits = unresolvedHits(ai)
  if (hits.length > 0) {
    const line = lineCandidates(ai, hits)
    if (line.length > 0) return { coord: line[0], mode: 'target' }
    const near = neighborCandidates(ai, hits)
    if (near.length > 0) return { coord: near[0], mode: 'target' }
  }
  const pool = huntCandidates(ai)
  if (pool.length === 0) throw new Error('No cells left to fire at')
  return { coord: pool[rng.int(pool.length)], mode: 'hunt' }
}

export function recordShot(ai: AiState, obs: Observation): AiState {
  const knowledge = ai.knowledge.map((row) => [...row])
  knowledge[obs.coord.row][obs.coord.col] = obs.outcome === 'miss' ? 'miss' : 'hit'
  if (obs.outcome === 'sunk') {
    for (const c of obs.sunkCells ?? []) knowledge[c.row][c.col] = 'sunk'
  }
  return {
    knowledge,
    hits: obs.outcome === 'miss' ? ai.hits : [...ai.hits, obs.coord],
  }
}
