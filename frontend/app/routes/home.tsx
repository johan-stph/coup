import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import TopBar from "~/components/TopBar";
import Logo from "~/components/Logo";
import ActionButtons from "~/components/ActionButtons";
import AvatarCard from "~/components/AvatarCard";
import CreateGameModal from "~/components/CreateGameModal";

const API_BASE = import.meta.env.VITE_API_BASE;

export function meta(_unused: Route.MetaArgs) {
  return [
    { title: "Coopia — Resistance Protocol" },
    {
      name: "description",
      content: "Online multiplayer deception game",
    },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateGame(lobbyName: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: lobbyName }),
      });

      const game = await res.json();

      navigate("/lobby", {
        state: { gameCode: game.gameCode, lobbyName: game.name },
      });
    } catch {
      setError("Connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-radial-glow scanlines flex min-h-screen flex-col text-white">
      <TopBar />

      <main className="flex flex-1 flex-col items-center justify-center gap-12 px-4 pb-16">
        <Logo />
        <ActionButtons onCreateGame={() => setModalOpen(true)} />
        <AvatarCard />
      </main>

      <CreateGameModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError(null);
        }}
        onConfirm={handleCreateGame}
        loading={loading}
        error={error}
      />
    </div>
  );
}
