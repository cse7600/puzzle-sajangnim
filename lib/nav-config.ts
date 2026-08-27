import {
  LayoutDashboard,
  Link2,
  Wallet,
  Landmark,
  MapPin,
  Link as LinkIcon,
  UtensilsCrossed,
  ShoppingCart,
  Receipt,
  Lightbulb,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = { icon: LucideIcon; label: string; href: string };
export type NavSection = { label: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    label: '핵심',
    items: [
      { icon: Link2, label: '연동 허브', href: '/hub' },
      { icon: Wallet, label: '수익·정산', href: '/earnings' },
      { icon: Landmark, label: '정부지원사업 매칭', href: '/gov-support' },
    ],
  },
  {
    label: '마케팅 도구',
    items: [
      { icon: LayoutDashboard, label: '홈', href: '/dashboard' },
      { icon: MapPin, label: '플레이스 최적화', href: '/place' },
      { icon: LinkIcon, label: '나만의 링크', href: '/my-link' },
      { icon: UtensilsCrossed, label: '한끼 체험단', href: '/experience' },
    ],
  },
  {
    label: '성장 도구',
    items: [
      { icon: ShoppingCart, label: '팀 구매', href: '/team-buy' },
      { icon: Receipt, label: '영수증 환급', href: '/rewards' },
      { icon: Lightbulb, label: '오호라!', href: '/knowledge' },
      { icon: Users, label: '추천인', href: '/referral' },
    ],
  },
  {
    label: '설정',
    items: [{ icon: Settings, label: '개인 설정', href: '/settings' }],
  },
];

// 하단 탭바(모바일)에 상시 노출할 핵심 4개 — 홈(대시보드) + 완성도 높은 핵심 도구
const MOBILE_PRIMARY_HREFS = ['/dashboard', '/hub', '/place', '/earnings'];

const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export const MOBILE_PRIMARY_ITEMS: NavItem[] = MOBILE_PRIMARY_HREFS.map(
  (href) => ALL_NAV_ITEMS.find((item) => item.href === href)!
);

export const MOBILE_MORE_SECTIONS: NavSection[] = NAV_SECTIONS.map((section) => ({
  ...section,
  items: section.items.filter((item) => !MOBILE_PRIMARY_HREFS.includes(item.href)),
})).filter((section) => section.items.length > 0);
