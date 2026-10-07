import type { LogEntry } from '../game/game.ts'
import { formatLogEntry } from './messages.ts'

export default function MessageLog({ entries }: { readonly entries: readonly LogEntry[] }) {
  return (
    <section className="log" aria-labelledby="log-heading">
      <h2 className="log__heading" id="log-heading">
        Recent shots
      </h2>
      {entries.length === 0 ? (
        <p className="log__empty">No shots yet.</p>
      ) : (
        <ol className="log__list" aria-live="polite" data-testid="message-log">
          {entries.map((e) => (
            <li key={e.id} className={`log__entry log__entry--${e.shooter}`}>
              {formatLogEntry(e)}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
