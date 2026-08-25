# PLAN: Landing Page Design System Upgrade

## Goal
현재 Apple-style 디자인 시스템(블루 프라이머리, SF Pro 폰트, 옅은 그림자+hairline 보더)을
새 목업 기준(라임그린 프라이머리, Pretendard 폰트, 1px 블랙 보더 flat 스타일)으로 교체.
섹션 구성, 카피, 콘텐츠는 변경하지 않음.

## Gray Area Decisions
| 항목 | 결정 | 이유 |
|------|------|------|
| 로고 마크(2x2 dot grid) | 현행 텍스트 유지 | 디자인 토큰 범위 밖 |
| 블랙 보더 범위 | 밝은 배경 카드만 | 다크 배경에서 ink 보더는 불가시 |
| canvas-white | #ffffff 유지 | 목업에서도 동일 |
| hairline | #e0e0e0 유지 | 카드 내부 구분선/네비에 필요 |
| Primary 텍스트 대비 | primary-dark 토큰 추가 | #9fe870은 밝은 배경 텍스트로 대비 부족 |

## Tasks

### Task 1: tailwind.config.ts 토큰 교체
- colors: primary, ink, parchment, dark-tile, muted 값 교체
- colors: primary-dark, muted-light, accent-bg, accent-text 추가
- borderRadius.lg: 18px -> 24px
- fontFamily: apple -> pretendard (Pretendard Variable 스택)
- fontSize: hero/display/section fontWeight 600 -> 900, letterSpacing -0.5px

### Task 2: globals.css 변수 + 버튼 스타일 갱신
- CSS 변수 값 갱신 (tailwind과 동기)
- btn-primary: bg 라임그린, 텍스트 다크
- btn-primary:hover: #cdffad
- btn-pill:active: scale(0.98)
- btn-secondary: 새 primary-dark 기준

### Task 3: layout.tsx Pretendard 폰트 로드
- CDN link 태그 추가
- body에 font-pretendard 클래스

### Task 4: page.tsx 스타일 마이그레이션
- text-primary (밝은 배경) -> text-primary-dark
- bg-primary text-white -> bg-primary text-ink
- border-hairline (카드) -> border-ink
- 헤딩 font-semibold -> font-black

### Task 5: Navigation.tsx + Footer.tsx 토큰 적용
- CTA 버튼 텍스트 색상 (CSS에서 자동 반영)
- 나머지 토큰은 시맨틱명 유지로 자동 반영

## Success Criteria
- [ ] 모든 컬러 토큰이 새 값으로 교체됨
- [ ] Pretendard Variable 폰트가 로드되고 적용됨
- [ ] 카드 스타일이 1px 블랙 보더 flat으로 전환됨
- [ ] 헤딩이 900 웨이트로 표시됨
- [ ] 밝은 배경에서 primary 텍스트가 읽기 가능 (dark green)
- [ ] 다크 섹션 스타일이 깨지지 않음
- [ ] 콘텐츠/카피 변경 없음
