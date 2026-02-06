import { useAuth } from '~/auth/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="bg-radial-glow scanlines flex min-h-screen flex-col items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 border-2 border-neon-red border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm tracking-widest">
            INITIALIZING...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
