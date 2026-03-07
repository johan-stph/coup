import type { GameEvent } from '~/lib/gameMockData';

interface EventLogProps {
  events: GameEvent[];
}

export default function EventLog({ events }: EventLogProps) {
  const recent = events.slice(-3);

  return (
    <div className="flex flex-col items-end gap-1">
      {recent.map((event) =>
        event.playerName && event.actionName ? (
          <div
            key={event.id}
            className="flex items-center gap-1 font-mono text-[10px] tracking-wide"
          >
            <span className="text-neon-cyan">{event.playerName}</span>
            <span className="text-text-muted">executes</span>
            <span className="text-neon-red">{event.actionName}</span>
          </div>
        ) : (
          <span
            key={event.id}
            className="text-right font-mono text-[10px] text-text-muted"
          >
            {event.message}
          </span>
        )
      )}
    </div>
  );
}
