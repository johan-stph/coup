export type AvatarOption = { label: string; image: string | null };
export type AvatarCategory = { key: string; options: AvatarOption[] };

export const CATEGORIES: AvatarCategory[] = [
  {
    key: 'ACCESSORIES',
    options: [
      { label: 'None', image: null },
      { label: 'Sunglasses', image: '/avatar/assets/sunglasses.png' },
    ],
  },
  {
    key: 'CHARACTER',
    options: [
      { label: 'None', image: null },
      { label: 'Male', image: '/avatar/character/male_character.png' },
      { label: 'Female', image: '/avatar/character/female_character.png' },
      { label: 'Premium', image: '/avatar/character/premium_character.png' },
    ],
  },
  {
    key: 'BACKGROUND',
    options: [
      { label: 'None', image: null },
      { label: 'Black', image: '/avatar/background/background_black.png' },
      { label: 'Blue', image: '/avatar/background/background_blue.png' },
    ],
  },
];
