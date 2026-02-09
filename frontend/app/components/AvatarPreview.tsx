import { useState } from 'react';
import PurchaseModal from './PurchaseModal';

export default function AvatarPreview({
  background,
  character,
  accessory,
  locked,
}: {
  background?: string | null;
  character?: string | null;
  accessory?: string | null;
  locked?: boolean;
}) {
  const [showPurchase, setShowPurchase] = useState(false);
  const hasAnyLayer = background || character || accessory;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="corner-brackets corner-brackets-bottom">
        <div className="relative flex h-72 w-72 items-center justify-center bg-surface">
          {hasAnyLayer ? (
            <>
              {background && (
                <img
                  src={background}
                  alt="Background"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {character && (
                <img
                  src={character}
                  alt="Character"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {accessory && (
                <img
                  src={accessory}
                  alt="Accessory"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-void/70">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                </div>
              )}
            </>
          ) : (
            <svg
              className="h-32 w-32 text-surface-light"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          )}
        </div>
      </div>
      <div className="h-10">
        {locked && (
          <button
            onClick={() => setShowPurchase(true)}
            className="border border-neon-cyan px-6 py-2 font-display text-sm font-semibold tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover:cursor-pointer"
          >
            PURCHASE
          </button>
        )}
      </div>
      {showPurchase && <PurchaseModal onClose={() => setShowPurchase(false)} />}
    </div>
  );
}