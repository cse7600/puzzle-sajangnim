import Link from 'next/link';

type FooterLink = { label: string; href?: string };

const FOOTER_COLUMNS: { header: string; links: FooterLink[] }[] = [
  {
    header: '서비스',
    links: [
      { label: 'AI 블로그 자동화', href: '/ai-blog' },
      { label: '네이버 플레이스 최적화', href: '/place' },
      { label: '한끼 체험단', href: '/experience' },
      { label: '통합 연동 허브', href: '/hub' },
      { label: '영수증 환급', href: '/rewards' },
      { label: '팀 구매', href: '/team-buy' },
      { label: '추천인 시스템', href: '/referral' },
      { label: '오호라! 사업 Q&A', href: '/ohora' },
    ],
  },
  {
    header: '법적고지',
    links: [
      { label: '이용약관', href: '/legal/terms' },
      { label: '개인정보처리방침', href: '/legal/privacy' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-parchment text-ink">
      <div className="mx-auto max-w-wide px-6 py-16">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:max-w-sm">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.header}>
              <h3 className="mb-2 text-[13px] font-semibold text-ink">
                {col.header}
              </h3>
              <ul>
                {col.links.map((link) => (
                  <li
                    key={link.label}
                    className="text-[13px] leading-[2.41] text-muted transition hover:text-ink"
                  >
                    {link.href ? (
                      <Link href={link.href}>{link.label}</Link>
                    ) : (
                      <a href="#">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-hairline pt-8">
          <p className="text-[12px] leading-[1.6] text-muted">
            퍼즐 사장님은 소상공인을 위한 통합 마케팅 플랫폼입니다. 본 사이트의 모든
            서비스 이용 시 약관 및 정책에 동의한 것으로 간주됩니다.
          </p>
          <p className="mt-3 text-[12px] leading-[1.6] text-muted">
            상호: 주식회사 퍼즐코퍼레이션 | 대표: 안태언, 최영록, 최영민 | 사업자등록번호:
            703-81-02391 | 주소: 서울특별시 마포구 양화로 81, 엘1층 104호 | 문의:{' '}
            <a href="mailto:ceo-biz@puzl.co.kr" className="hover:text-ink">
              ceo-biz@puzl.co.kr
            </a>
          </p>
          <p className="mt-4 text-[12px] text-muted">
            © 2026 주식회사 퍼즐코퍼레이션. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
