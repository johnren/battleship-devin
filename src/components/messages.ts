import type { LogEntry } from '../game/game.ts'
import { coordLabel } from './labels.ts'

export function formatLogEntry({ shooter, result }: LogEntry): string {
  const at = coordLabel(result.coord)
  if (shooter === 'player') {
    if (result.outcome === 'miss') return `Miss at ${at}.`
    if (result.outcome === 'hit') return `Hit at ${at}.`
    return `You sank their ${result.ship}!`
  }
  if (result.outcome === 'miss') return `They missed at ${at}.`
  if (result.outcome === 'hit') return `They hit your ${result.ship} at ${at}.`
  return `They sank your ${result.ship}!`
}
