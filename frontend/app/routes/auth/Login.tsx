import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '~/auth/AuthContext';
import Logo from '~/components/Logo';

export default function Login() {
  const { user, loading, signInWithGoogle, authError, clearError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.isFirstTimeUser) {
        navigate('/auth/setup');
      } else {
        navigate('/');
      }
    }
  }, [user, loading, navigate]);

  // Show auth errors as toast
  useEffect(() => {
    if (authError) {
      toast.error(authError);
      clearError();
    }
  }, [authError, clearError]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      toast.success('Successfully signed in!');
      // Navigation will happen via the useEffect above
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-radial-glow scanlines flex min-h-screen items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-2 border-neon-red border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm tracking-widest">
            INITIALIZING...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-radial-glow scanlines flex min-h-screen flex-col items-center justify-center px-4 text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-12">
        {/* Logo */}
        <Logo />

        {/* Login Card */}
        <div className="corner-brackets corner-brackets-bottom w-full">
          <div className="border border-neon-red/50 bg-surface p-8">
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-2 text-center">
                <div className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
                  AUTHENTICATION REQUIRED
                </div>
                <h2 className="font-display text-xl font-bold tracking-wider">
                  INITIALIZE ACCOUNT
                </h2>
              </div>

              {/* Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="btn-glow w-full border border-neon-red py-3 font-display text-sm font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-neon-red border-t-transparent rounded-full animate-spin" />
                    <span>CONNECTING...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="#FF1744"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#FF1744"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FF1744"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#FF1744"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>SIGN IN WITH GOOGLE</span>
                  </div>
                )}
              </button>

              {/* Status */}
              <div className="flex items-center justify-center gap-2">
                <span className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-red" />
                <span className="font-mono text-[10px] tracking-widest text-text-muted">
                  READY TO CONNECT
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center">
          <p className="font-mono text-[10px] tracking-widest text-text-muted">
            SECURE AUTHENTICATION PROTOCOL ACTIVE
          </p>
        </div>
      </div>
    </div>
  );
}
