const FOOTER_COLUMNS: { header: string; links: string[] }[] = [
  {
    header: '서비스',
    links: [
      'AI 블로그 자동화',
      '네이버 플레이스 최적화',
      '미니 체험단',
      '통합 연동 허브',
      '앱테크 리워드',
      '팀 구매',
      '추천인 시스템',
      '마케팅 지식 거래소',
    ],
  },
  {
    header: '고객지원',
    links: [
      '도움말 센터',
      '이용 가이드',
      '1:1 문의',
      '자주 묻는 질문',
      '공지사항',
      '서비스 상태',
    ],
  },
  {
    header: '회사',
    links: ['회사 소개', '팀 블로그', '채용', '보도자료', '브랜드 리소스', '제휴 문의'],
  },
  {
    header: '법적고지',
    links: [
      '이용약관',
      '개인정보처리방침',
      '위치기반서비스 약관',
      '마케팅 정보 수신',
      '청소년 보호정책',
      '환불 정책',
    ],
  },
  {
    header: '파트너',
    links: ['크리에이터 지원', '마케터 등록', '대행사 제휴', '식자재 파트너', 'API 문서', '추천인 센터'],
  },
];

export default function Footer() {
  return (
    <footer className="bg-parchment text-ink">
      <div className="mx-auto max-w-wide px-6 py-16">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.header}>
              <h3 className="mb-2 text-[13px] font-semibold text-ink">
                {col.header}
              </h3>
              <ul>
                {col.links.map((link) => (
                  <li
                    key={link}
                    className="text-[13px] leading-[2.41] text-muted transition hover:text-ink"
                  >
                    <a href="#">{link}</a>
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
            (주)퍼즐코프 · 대표 김퍼즐 · 사업자등록번호 123-45-67890 · 통신판매업신고
            2026-서울강남-01234
            <br />
            서울특별시 강남구 테헤란로 152, 강남파이낸스센터 10층 · 고객센터
            1670-0000 (평일 10:00–18:00)
          </p>
          <p className="mt-4 text-[12px] text-muted">
            Copyright © 2026 PUZZLE CORP. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
