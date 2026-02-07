export default function AvatarPreview({
  background,
  character,
  accessory,
}: {
  background?: string | null;
  character?: string | null;
  accessory?: string | null;
}) {
  const hasAnyLayer = background || character || accessory;

  return (
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
  );
}
