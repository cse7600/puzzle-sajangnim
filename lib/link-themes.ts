/**
 * 나만의 링크 — 공개 프로필 페이지 테마 프리셋
 * 공개 페이지(/l/[handle])와 대시보드 디자인 패널이 함께 사용하는 단일 소스.
 */

export interface LinkTheme {
  key: string;
  label: string;
  /** 페이지 배경 (그라디언트 또는 단색) */
  pageBg: string;
  /** 본문 기본 텍스트 색 */
  text: string;
  /** 보조 텍스트 색 */
  textSub: string;
  /** 카드/블록 배경 */
  card: string;
  /** 카드 테두리 */
  cardBorder: string;
  /** 강조(CTA/포인트) 색 */
  accent: string;
  /** 강조 위에 올라가는 텍스트 색 */
  accentText: string;
  /** 제휴 프로그램 강조 카드 배경 */
  promoBg: string;
  /** 상단 아이콘 등 표면 위 은은한 색 */
  chip: string;
  /** 미리보기 스와치용 대표색 */
  swatch: string;
}

export const THEME_PRESETS: LinkTheme[] = [
  {
    key: 'sunset',
    label: '선셋',
    pageBg: 'linear-gradient(180deg, #FFF7F2 0%, #FFE9DC 100%)',
    text: '#1A1A1A',
    textSub: '#7A6A60',
    card: '#FFFFFF',
    cardBorder: '#F3D9C9',
    accent: '#F05100',
    accentText: '#FFFFFF',
    promoBg: 'linear-gradient(135deg, #FF7A3D 0%, #F05100 100%)',
    chip: 'rgba(240,81,0,0.10)',
    swatch: '#F05100',
  },
  {
    key: 'midnight',
    label: '미드나잇',
    pageBg: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
    text: '#F1F5F9',
    textSub: '#94A3B8',
    card: 'rgba(255,255,255,0.06)',
    cardBorder: 'rgba(255,255,255,0.12)',
    accent: '#F97316',
    accentText: '#FFFFFF',
    promoBg: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    chip: 'rgba(255,255,255,0.10)',
    swatch: '#0F172A',
  },
  {
    key: 'mint',
    label: '민트',
    pageBg: 'linear-gradient(180deg, #F0FBF9 0%, #D7F0EC 100%)',
    text: '#0F2E2A',
    textSub: '#5A7C77',
    card: '#FFFFFF',
    cardBorder: '#CDE9E4',
    accent: '#009588',
    accentText: '#FFFFFF',
    promoBg: 'linear-gradient(135deg, #14B8A6 0%, #009588 100%)',
    chip: 'rgba(0,149,136,0.10)',
    swatch: '#009588',
  },
  {
    key: 'blossom',
    label: '블라썸',
    pageBg: 'linear-gradient(180deg, #FFF5F8 0%, #FCE1EC 100%)',
    text: '#3A1220',
    textSub: '#9C6B7E',
    card: '#FFFFFF',
    cardBorder: '#F6D2E0',
    accent: '#E1306C',
    accentText: '#FFFFFF',
    promoBg: 'linear-gradient(135deg, #F472B6 0%, #E1306C 100%)',
    chip: 'rgba(225,48,108,0.10)',
    swatch: '#E1306C',
  },
  {
    key: 'ocean',
    label: '오션',
    pageBg: 'linear-gradient(180deg, #F1F7FF 0%, #DCEBFB 100%)',
    text: '#0C2340',
    textSub: '#5E7695',
    card: '#FFFFFF',
    cardBorder: '#CFE0F3',
    accent: '#2563EB',
    accentText: '#FFFFFF',
    promoBg: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    chip: 'rgba(37,99,235,0.10)',
    swatch: '#2563EB',
  },
];

export const DEFAULT_THEME_KEY = 'sunset';

export function getTheme(key?: string | null): LinkTheme {
  return THEME_PRESETS.find(t => t.key === key) ?? THEME_PRESETS[0];
}

/** 블록 모양(라운드) 프리셋 */
export const BLOCK_SHAPES: Record<string, number> = {
  round: 16,
  soft: 10,
  square: 4,
};

/** 그림자 4단계 */
export const BLOCK_SHADOWS: Record<string, string> = {
  none: 'none',
  soft: '0 1px 2px rgba(0,0,0,0.06)',
  medium: '0 4px 14px rgba(0,0,0,0.10)',
  strong: '0 10px 30px rgba(0,0,0,0.16)',
};

/** 링크 블록 스타일 프리셋 키 */
export type LinkBlockStyle = 'thumbnail' | 'simple' | 'card' | 'background';

export const LINK_STYLE_LABELS: Record<LinkBlockStyle, string> = {
  thumbnail: '썸네일',
  simple: '심플',
  card: '카드',
  background: '배경',
};

/* ──────────────────────────────────────────────────────────
 * 배경 그라디언트 프리셋 (background.pageMode === 'gradient')
 * ────────────────────────────────────────────────────────── */
export interface GradientPreset {
  key: string;
  label: string;
  css: string;
  isDark: boolean;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { key: 'peach', label: '피치 크림', css: 'linear-gradient(160deg, #FFE9C7 0%, #FFB6A6 100%)', isDark: false },
  { key: 'aurora', label: '오로라', css: 'linear-gradient(160deg, #A18CD1 0%, #FBC2EB 100%)', isDark: false },
  { key: 'sky', label: '스카이', css: 'linear-gradient(160deg, #8FD3F4 0%, #84FAB0 100%)', isDark: false },
  { key: 'lavender', label: '라벤더', css: 'linear-gradient(160deg, #E0C3FC 0%, #8EC5FC 100%)', isDark: false },
  { key: 'forest', label: '포레스트', css: 'linear-gradient(160deg, #134E5E 0%, #71B280 100%)', isDark: true },
  { key: 'charcoal', label: '차콜', css: 'linear-gradient(160deg, #232526 0%, #414345 100%)', isDark: true },
];

export function getGradient(key?: string | null): GradientPreset | null {
  if (!key) return null;
  return GRADIENT_PRESETS.find(g => g.key === key) ?? null;
}

/* ──────────────────────────────────────────────────────────
 * 폰트 프리셋 (font_preset)
 * pretendard = 기본(전역 var(--font-sans)), 나머지 3종은 Google Fonts.
 * ────────────────────────────────────────────────────────── */
export interface FontPreset {
  key: string;
  label: string;
  fontFamily: string;
  googleFamily?: string;
}

export const FONT_PRESETS: Record<string, FontPreset> = {
  'pretendard': {
    key: 'pretendard', label: '프리텐다드',
    fontFamily: 'var(--font-sans)',
  },
  'noto-sans-kr': {
    key: 'noto-sans-kr', label: '노토 산스',
    fontFamily: "'Noto Sans KR', var(--font-sans)",
    googleFamily: 'Noto+Sans+KR:wght@400;500;700;800',
  },
  'gowun-dodum': {
    key: 'gowun-dodum', label: '고운돋움',
    fontFamily: "'Gowun Dodum', var(--font-sans)",
    googleFamily: 'Gowun+Dodum',
  },
  'nanum-gothic': {
    key: 'nanum-gothic', label: '나눔고딕',
    fontFamily: "'Nanum Gothic', var(--font-sans)",
    googleFamily: 'Nanum+Gothic:wght@400;700;800',
  },
};

export function getFontPreset(key?: string | null): FontPreset {
  return FONT_PRESETS[key || 'pretendard'] ?? FONT_PRESETS['pretendard'];
}

export function fontGoogleHref(key?: string | null): string | null {
  const f = getFontPreset(key);
  if (!f.googleFamily) return null;
  return `https://fonts.googleapis.com/css2?family=${f.googleFamily}&display=swap`;
}

export const FONT_PRESET_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(FONT_PRESETS).map(f => [f.key, f.label]),
);

export const LAYOUT_PRESET_LABELS: Record<string, string> = {
  profile_only: '프로필만',
  cover_top: '커버 상단',
  cover_profile_overlap: '커버 + 프로필 겹침',
};
