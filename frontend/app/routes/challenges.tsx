import { Link } from 'react-router';

export default function Challenges() {
  return (
    <div className="bg-radial-glow scanlines flex min-h-screen flex-col items-center justify-center gap-8 text-white">
      <h1 className="font-display text-4xl font-bold tracking-widest text-text-muted">
        COMING SOON
      </h1>
      <Link
        to="/"
        className="border border-text-muted px-8 py-3 font-display text-sm font-semibold tracking-widest text-text-muted transition-all hover:border-white hover:text-white"
      >
        BACK
      </Link>
    </div>
  );
}