import { useEffect, useState } from 'react';

interface ActionAnnouncementProps {
  playerName: string;
  action: string;
  onDismiss: () => void;
}

export default function ActionAnnouncement({
  playerName,
  action,
  onDismiss,
}: ActionAnnouncementProps) {
  const [phase, setPhase] = useState<'in' | 'visible' | 'out'>('in');

  useEffect(() => {
    // fade in → visible after a tick
    const fadeIn = setTimeout(() => setPhase('visible'), 50);

    // start fade out after 2s
    const fadeOut = setTimeout(() => setPhase('out'), 2000);

    // dismiss after fade out completes (500ms)
    const dismiss = setTimeout(() => onDismiss(), 2500);

    return () => {
      clearTimeout(fadeIn);
      clearTimeout(fadeOut);
      clearTimeout(dismiss);
    };
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-void/80 transition-opacity duration-500"
      style={{ opacity: phase === 'in' ? 0 : phase === 'out' ? 0 : 1 }}
    >
      <div className="text-center">
        <p className="mb-2 font-mono text-xs tracking-[0.3em] text-text-muted">
          ACTION DECLARED
        </p>
        <p className="logo-glow font-display text-4xl font-black text-neon-red">
          {playerName}
        </p>
        <p className="my-2 font-mono text-sm text-text-muted">performed</p>
        <p className="logo-glow font-display text-5xl font-black tracking-wider text-neon-red">
          {action}
        </p>
      </div>
    </div>
  );
}
