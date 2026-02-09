import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAvatar } from '~/avatar/AvatarContext';
import AvatarPreview from '~/components/AvatarPreview';
import { CATEGORIES } from '~/data/avatarCategories';
import { authFetch } from '~/lib/authFetch';

function OptionSelector({
  label,
  value,
  disabled,
  locked,
  onPrev,
  onNext,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  locked?: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className={`flex flex-col gap-2 ${disabled ? 'opacity-40' : ''}`}>
      <span className="font-mono text-xs tracking-[0.3em] text-text-muted">
        {label}
      </span>
      <div className="flex items-center gap-6">
        <button
          onClick={onPrev}
          disabled={disabled}
          className="font-mono text-2xl text-text-muted transition-colors hover:text-white hover:cursor-pointer disabled:cursor-not-allowed disabled:hover:text-text-muted"
        >
          &lt;
        </button>
        <span
          className={`w-44 text-center font-display text-lg tracking-wider ${locked ? 'text-text-muted line-through' : 'text-white'}`}
        >
          {value}
        </span>
        <button
          onClick={onNext}
          disabled={disabled}
          className="font-mono text-2xl text-text-muted transition-colors hover:text-white hover:cursor-pointer disabled:cursor-not-allowed disabled:hover:text-text-muted"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}

function imageToIndex(categoryIndex: number, image: string | null): number {
  if (image === null) return 0;
  const idx = CATEGORIES[categoryIndex].options.findIndex(
    (opt) => opt.image === image
  );
  return idx === -1 ? 0 : idx;
}

export default function Avatar() {
  const { accessory, character, background, refreshAvatar } = useAvatar();
  const [indices, setIndices] = useState([0, 0, 0]);
  const [purchasedAssets, setPurchasedAssets] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const characterSelected = indices[1] !== 0;

  useEffect(() => {
    authFetch('/purchases')
      .then((res) => res.json())
      .then((data: { asset: string }[]) =>
        setPurchasedAssets(new Set(data.map((p) => p.asset)))
      );
  }, []);

  useEffect(() => {
    setIndices([
      imageToIndex(0, accessory),
      imageToIndex(1, character),
      imageToIndex(2, background),
    ]);
  }, [accessory, character, background]);

  function isLocked(categoryIndex: number): boolean {
    const option = CATEGORIES[categoryIndex].options[indices[categoryIndex]];
    return !!option.purchasable && !purchasedAssets.has(option.image!);
  }

  function cycle(categoryIndex: number, direction: 1 | -1) {
    setIndices((prev) => {
      const next = [...prev];
      const len = CATEGORIES[categoryIndex].options.length;
      next[categoryIndex] = (prev[categoryIndex] + direction + len) % len;
      // Reset accessories when character is set to None
      if (categoryIndex === 1 && next[1] === 0) {
        next[0] = 0;
      }
      return next;
    });
  }

  async function handleSave() {
    const body = {
      accessory: CATEGORIES[0].options[indices[0]].image,
      character: CATEGORIES[1].options[indices[1]].image,
      background: CATEGORIES[2].options[indices[2]].image,
    };

    const res = await authFetch('/avatar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await refreshAvatar();
      navigate('/');
    }
  }

  return (
    <div className="bg-radial-glow scanlines flex min-h-screen flex-col text-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 md:flex-row md:gap-16">
        <AvatarPreview
          background={CATEGORIES[2].options[indices[2]].image}
          character={CATEGORIES[1].options[indices[1]].image}
          accessory={CATEGORIES[0].options[indices[0]].image}
          locked={isLocked(0) || isLocked(1) || isLocked(2)}
        />

        <div className="flex flex-col gap-8">
          {CATEGORIES.map((cat, i) => (
            <OptionSelector
              key={cat.key}
              label={cat.key}
              value={cat.options[indices[i]].label}
              disabled={i === 0 && !characterSelected}
              locked={isLocked(i)}
              onPrev={() => cycle(i, -1)}
              onNext={() => cycle(i, 1)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 pb-12">
        <Link
          to="/"
          className="border border-text-muted px-8 py-3 font-display text-sm font-semibold tracking-widest text-text-muted transition-all hover:border-white hover:text-white"
        >
          BACK
        </Link>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 border border-neon-red px-8 py-3 font-display text-sm font-semibold tracking-widest text-neon-red transition-all hover:bg-neon-red/10 hover:cursor-pointer"
        >
          SAVE
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
              d="M6 20.25h12A2.25 2.25 0 0 0 20.25 18V7.5L16.5 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25zm9.75-16.5v5h-9.5v-5zM13 5.5V7m-6.75 4.25h11.5v6.5H6.25Z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
