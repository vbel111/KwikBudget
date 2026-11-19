export const C = {
  ink: '#0B0B0B', ink2: '#1A1F1A', bg: '#F3F5F3', white: '#FFFFFF', muted: '#5C625C', faint: '#8A908A',
  line: '#EAEEEA', chip: '#F1F4F1',
  green: '#3DDC4A', green2: '#1DB33A', mint: '#C4F89B', lime: '#9BE878', deepGreen: '#167A27', softGreen: '#E4F8E6',
  gold: '#FFC81E', yellow: '#FFD43B', softGold: '#FFF4CC',
  dark1: '#1C4A26', dark2: '#0C120D', dark3: '#050705',
  warn: '#FFF6D6', warnInk: '#6B5200', danger: '#E5484D', softDanger: '#FFE8E8',
};
export const F = {
  r: 'PlusJakartaSans_500Medium', s: 'PlusJakartaSans_600SemiBold', b: 'PlusJakartaSans_700Bold', x: 'PlusJakartaSans_800ExtraBold',
};
/** Type scale used everywhere, so screens never invent sizes. */
export const TYPE = {
  hero: { fontFamily: F.x, fontSize: 40, letterSpacing: -1.4, color: C.ink },
  h1: { fontFamily: F.x, fontSize: 28, letterSpacing: -0.8, color: C.ink },
  h2: { fontFamily: F.x, fontSize: 20, letterSpacing: -0.3, color: C.ink },
  h3: { fontFamily: F.x, fontSize: 16, color: C.ink },
  body: { fontFamily: F.r, fontSize: 15, lineHeight: 22, color: C.ink },
  label: { fontFamily: F.b, fontSize: 15, color: C.ink },
  small: { fontFamily: F.r, fontSize: 12, color: C.muted },
  caption: { fontFamily: F.s, fontSize: 11, letterSpacing: 0.4, color: C.faint, textTransform: 'uppercase' as const },
};
export const shadow = {
  card: { shadowColor: '#0B0B0B', shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  soft: { shadowColor: '#0B0B0B', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  dark: { shadowColor: '#060806', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  glow: { shadowColor: '#3DDC4A', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
};
export const JAR_COLORS: Record<string, [string, string]> = {
  food: ['#C4F89B', '#1DB33A'], transport: ['#FFE680', '#F2B705'], fun: ['#D9D2FF', '#7B6CF0'],
  buffer: ['#9AA59A', '#2C322C'], savings: ['#C4F89B', '#3DDC4A'], bills: ['#5A645A', '#0B0B0B'],
};
export const JAR_DOT: Record<string, string> = { bills: '#0B0B0B', savings: '#3DDC4A', food: '#9BE878', transport: '#FFD43B', fun: '#9D90F5', buffer: '#4A524A' };
export const SPRING = { gentle: { damping: 18, stiffness: 140 }, bouncy: { damping: 11, stiffness: 180 }, snappy: { damping: 20, stiffness: 320 } };
