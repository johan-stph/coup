export default function AvatarCard() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar frame with corner brackets */}
      <div className="corner-brackets corner-brackets-bottom">
        <div className="relative flex h-48 w-48 items-center justify-center bg-surface">
          {/* Online indicator dot */}
          <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-neon-red status-pulse" />

          {/* Placeholder avatar */}
          <svg
            className="h-20 w-20 text-surface-light"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>

          {/* ID label */}
          <span className="absolute bottom-2 left-3 font-mono text-[10px] text-text-muted">
            ID: 8492
          </span>
        </div>
      </div>

      {/* User info */}
      <div className="flex flex-col items-center gap-1 pt-2">
        <span className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
          OPERATIVE
        </span>
        <span className="font-display text-lg font-bold tracking-wider text-white">
          SHADOW_01
        </span>
        <div className="flex items-center gap-1.5">
          <span className="status-pulse inline-block h-2 w-2 rounded-full bg-online-green" />
          <span className="font-mono text-[10px] tracking-widest text-text-muted">
            ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}
