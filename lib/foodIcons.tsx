import type { SVGProps, ReactNode } from 'react';

interface FoodIconProps extends Omit<SVGProps<SVGSVGElement>, 'size'> {
  size?: number;
}

const stroke = (children: ReactNode, sw = 1.6) =>
  ({ size = 24, ...rest }: FoodIconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );

export const FoodIcon = {
  sub: stroke(
    <>
      <path d="M3 11.5c0-1.4 1.1-2.5 2.5-2.5h13c1.4 0 2.5 1.1 2.5 2.5S19.9 14 18.5 14h-13C4.1 14 3 12.9 3 11.5Z" />
      <path d="M5 14c.6 1.4 2 2.2 3.5 2.2h7c1.5 0 2.9-.8 3.5-2.2" />
      <path d="M6.5 11.2h.01M9.5 11.2h.01M12.5 11.2h.01M15.5 11.2h.01M18 11.2h.01" />
    </>,
  ),
  burger: stroke(
    <>
      <path d="M4 9.5C4 6.7 7.6 5 12 5s8 1.7 8 4.5" />
      <path d="M3.5 9.5h17" />
      <path d="M4 13h16c0 1.3-1 2.3-2.3 2.3-.9 0-1.3.6-2.1.6s-1.2-.6-2.1-.6-1.3.6-2.1.6-1.2-.6-2.1-.6-1.3.6-2.1.6S6.3 16 5.4 16C4.1 16 4 14.3 4 13Z" />
      <path d="M5.5 18.5h13c.8 0 1.5-.7 1.5-1.5H4c0 .8.7 1.5 1.5 1.5Z" />
    </>,
  ),
  cup: stroke(
    <>
      <path d="M6 8h12l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 8Z" />
      <path d="M5.5 8h13" />
      <path d="M14 4.5 13 8M10 11h4" />
    </>,
  ),
  combo: stroke(
    <>
      <path d="M5 8.5h14l-1 11.5a1 1 0 0 1-1 .9H7a1 1 0 0 1-1-.9L5 8.5Z" />
      <path d="M8.5 8.5 12 4l3.5 4.5" />
      <path d="M9.5 13h5" />
    </>,
  ),
  cake: stroke(
    <>
      <path d="M4 20h16M5 20v-7.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V20" />
      <path d="M5 14c1.2 0 1.2 1.2 2.4 1.2S8.5 14 9.7 14s1.2 1.2 2.3 1.2S13.3 14 14.5 14s1.2 1.2 2.4 1.2S18 14 19 14" />
      <path d="M12 10.5V7m0 0 1-1.2L12 4l-1 1.8L12 7Z" />
    </>,
  ),
};

export type FoodIconKey = keyof typeof FoodIcon;

/**
 * Map a catalog `cat` string to a default illustrated icon. Match is
 * case-insensitive and tolerates the most common Spanish category labels used
 * by the menu (Sándwiches / Combos / Bebidas / Postres). Unknown categories
 * fall back to `sub`.
 */
export function pickFoodIcon(cat: string): FoodIconKey {
  const c = cat.toLowerCase();
  if (c.startsWith('combo')) return 'combo';
  if (c.startsWith('bebid')) return 'cup';
  if (c.startsWith('postre')) return 'cake';
  return 'sub';
}

/**
 * Color + tint per category, used for the thumbnail backgrounds and the
 * section-title accent bar. Keys are normalized to lower-case to be tolerant
 * of accents / casing coming from the backend.
 */
export const CATEGORY_THEME: Record<string, { color: string; tint: string }> = {
  sándwiches: { color: '#E85D04', tint: '#FDEEE3' },
  sandwiches: { color: '#E85D04', tint: '#FDEEE3' },
  combos: { color: '#C2410C', tint: '#FBE9E1' },
  bebidas: { color: '#0E7C86', tint: '#E2F3F4' },
  postres: { color: '#C13E7A', tint: '#FBE7F0' },
};

export function pickCategoryTheme(cat: string): { color: string; tint: string } {
  return CATEGORY_THEME[cat.toLowerCase()] ?? { color: '#E85D04', tint: '#FDEEE3' };
}
