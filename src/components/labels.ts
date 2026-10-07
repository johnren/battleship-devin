import type { Coord } from '../game/types.ts'

export const ROW_LABELS = 'ABCDEFGHIJ'.split('')
export const COL_LABELS = Array.from({ length: 10 }, (_, i) => String(i + 1))

export function coordLabel(c: Coord): string {
  return `${ROW_LABELS[c.row]}${c.col + 1}`
}
