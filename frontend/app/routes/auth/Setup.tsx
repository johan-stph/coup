import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '~/auth/AuthContext';
import React from 'react';
import { authFetch } from '~/lib/authFetch';
import Logo from '~/components/Logo';

export default function Setup() {
  const { refreshUserData, user, logout } = useAuth();
  const [userName, setUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit: React.MouseEventHandler<HTMLButtonElement> = async (
    e
  ) => {
    e.preventDefault();

    if (userName.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await authFetch(`/user/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create profile');
      }

      await refreshUserData();
      toast.success('Profile created successfully!');
      navigate('/');
    } catch (error: any) {
      console.error('Setup error:', error);
      toast.error(error.message || 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="bg-radial-glow scanlines flex min-h-screen flex-col items-center justify-center px-4 text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-12">
        {/* Logo */}
        <Logo />

        {/* Setup Card */}
        <div className="corner-brackets corner-brackets-bottom w-full">
          <div className="border border-neon-red/50 bg-surface p-8">
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-4 text-center">
                <div className="font-mono text-[10px] tracking-[0.3em] text-text-muted">
                  OPERATIVE SETUP
                </div>
                <h2 className="font-display text-xl font-bold tracking-wider">
                  CREATE OPERATIVE ID
                </h2>
                {user?.photoURL && (
                  <div className="flex justify-center pt-2">
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="h-16 w-16 rounded-full border-2 border-neon-red"
                    />
                  </div>
                )}
              </div>

              {/* Username Input */}
              <div className="space-y-3">
                <label
                  htmlFor="userName"
                  className="block font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase"
                >
                  Operative Designation
                </label>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter designation"
                  minLength={3}
                  maxLength={50}
                  required
                  disabled={isSubmitting}
                  className="w-full border border-neon-red/30 bg-surface-light px-4 py-2 font-mono text-sm text-white placeholder-text-muted transition-colors focus:border-neon-red focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="font-mono text-[9px] tracking-widest text-text-muted">
                  3-50 CHARACTERS, VISIBLE TO OPERATIVES
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || userName.length < 3}
                className="btn-glow w-full border border-neon-red py-3 font-display text-sm font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-neon-red border-t-transparent rounded-full animate-spin" />
                    <span>INITIALIZING...</span>
                  </div>
                ) : (
                  'ACTIVATE OPERATIVE'
                )}
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSubmitting}
                className="w-full border border-text-muted/30 py-2 font-mono text-[10px] font-semibold tracking-widest text-text-muted transition-all hover:border-text-muted hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                LOGOUT
              </button>

              {/* Status */}
              <div className="flex items-center justify-center gap-2">
                <span className="status-pulse inline-block h-2 w-2 rounded-full bg-neon-red" />
                <span className="font-mono text-[10px] tracking-widest text-text-muted">
                  AWAITING INITIALIZATION
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center">
          <p className="font-mono text-[10px] tracking-widest text-text-muted">
            COMPLETE SETUP TO ACCESS OPERATIONS
          </p>
        </div>
      </div>
    </div>
  );
}
