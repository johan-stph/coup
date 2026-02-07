import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authFetch } from '~/lib/authFetch';

interface AvatarState {
  accessory: string | null;
  character: string | null;
  background: string | null;
}

interface AvatarContextType extends AvatarState {
  refreshAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType | null>(null);

export function useAvatar(): AvatarContextType {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }
  return context;
}

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatar, setAvatar] = useState<AvatarState>({
    accessory: null,
    character: null,
    background: null,
  });

  async function fetchAvatar() {
    try {
      const res = await authFetch('/avatar');
      if (res.ok) {
        const data: AvatarState = await res.json();
        setAvatar({
          accessory: data.accessory,
          character: data.character,
          background: data.background,
        });
      }
    } catch {
      // keep defaults on error
    }
  }

  useEffect(() => {
    fetchAvatar();
  }, []);

  const value: AvatarContextType = {
    ...avatar,
    refreshAvatar: fetchAvatar,
  };

  return (
    <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>
  );
}
