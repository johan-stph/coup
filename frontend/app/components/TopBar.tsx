import { useNavigate } from 'react-router';
import { useAuth } from '~/auth/AuthContext';
import { toast } from 'sonner';

export default function TopBar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4">
      {/* System status */}
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-neon-red-dim">
        <span className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-red" />
        SYS.ONLINE
      </div>

      {/* Right side buttons */}
      <div className="flex items-center gap-4">
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

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 font-mono text-xs tracking-widest text-text-muted transition-colors hover:text-neon-red"
          title="Logout"
        >
          LOGOUT
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
              d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3h12.75"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
