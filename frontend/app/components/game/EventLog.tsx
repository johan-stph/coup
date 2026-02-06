import type { GameEvent } from '~/lib/gameMockData';

interface EventLogProps {
  events: GameEvent[];
}

export default function EventLog({ events }: EventLogProps) {
  const recent = events.slice(-3);

  return (
    <div className="flex flex-col items-end gap-1">
      {recent.map((event) => (
        <span key={event.id} className="text-right font-mono text-[10px] text-text-muted">
          {event.message}
        </span>
      ))}
    </div>
  );
}
