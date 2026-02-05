import type { Route } from "./+types/home";

export function meta(_unused: Route.MetaArgs) {
  return [
    { title: "Coopia — Resistance Protocol" },
    {
      name: "description",
      content: "Online multiplayer deception game",
    },
  ];
}

function TopBar() {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      {/* System status */}
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-neon-red-dim">
        <span className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-red" />
        SYS.ONLINE
      </div>

      {/* Protocols / Rules */}
      <button className="flex items-center gap-2 font-mono text-xs tracking-widest text-text-muted transition-colors hover:text-white">
        PROTOCOLS
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      </button>
    </header>
  );
}

function Logo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <h1 className="logo-glow font-display text-7xl font-black tracking-[0.2em] text-white sm:text-8xl md:text-9xl">
        COOPIA
      </h1>
      <p className="font-mono text-xs tracking-[0.5em] text-text-muted">
        RESISTANCE PROTOCOL
      </p>
    </div>
  );
}

function ActionButtons() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <button className="btn-glow w-52 border border-neon-red py-3 text-center font-display text-sm font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer">
        CREATE GAME
      </button>
      <button className="btn-glow w-52 border border-neon-red py-3 text-center font-display text-sm font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer">
        JOIN GAME
      </button>
    </div>
  );
}

function AvatarCard() {
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

export default function Home() {
  return (
    <div className="bg-radial-glow scanlines flex min-h-screen flex-col text-white">
      <TopBar />

      <main className="flex flex-1 flex-col items-center justify-center gap-12 px-4 pb-16">
        <Logo />
        <ActionButtons />
        <AvatarCard />
      </main>
    </div>
  );
}
