import { Outlet } from 'react-router';
import { ProtectedRoute } from '~/components/ProtectedRoute';
import { useAuth, GuardedAuthContext } from '~/auth/AuthContext';
import { AvatarProvider } from '~/avatar/AvatarContext';

function GuardedContent() {
  const { user, getIdToken, refreshUserData } = useAuth();

  // At this point, ProtectedRoute has already verified user exists

  return (
    <GuardedAuthContext.Provider
      value={{
        user: user!.profile!,
        getIdToken,
        refreshUserData,
      }}
    >
      <AvatarProvider>
        <Outlet />
      </AvatarProvider>
    </GuardedAuthContext.Provider>
  );
}

export default function Layout() {
  return (
    <ProtectedRoute>
      <GuardedContent />
    </ProtectedRoute>
  );
}
