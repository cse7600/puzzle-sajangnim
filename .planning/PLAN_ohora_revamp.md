# PLAN: "지식 거래소" → "오호라!" 전면 개편

## 배경
- 기존 "지식 거래소" Q&A + "사장님 모임" 커뮤니티 탭 구조를 Q&A 단일 화면 "오호라!"로 개편
- 5,000P 현상금 로직 삭제, 일반인(비사업자 인증) 참여 허용
- 비로그인 상태에서도 읽기 가능한 공개 SSR 페이지 + SEO 신설

## 작업 항목 (8개)

### 1. 사장님 모임 숨김
- AppSidebar.tsx: "사장님 모임" 메뉴 항목 제거
- knowledge/page.tsx: community 탭, CommunityTab, WriteModal, PostCard 제거 → Q&A 단일 화면
- community/page.tsx: /knowledge로 redirect (데이터/테이블 보존)

### 2. 정산/포인트
- 포인트 파이프라인은 정상 → 추가 구현 불필요
- "이번 주 인기 답변자" 하드코딩 목업 → 섹션 제거 (실데이터 쿼리 복잡도 대비 가치 낮음)

### 3. "마케팅 지식" → "사업 지식"
- knowledge/page.tsx:176,383
- knowledge/[id]/page.tsx:236
- Footer.tsx:12

### 4. "N일 전" 상대시간 통일
- lib/relative-time.ts 신규 생성 (무한 상대표기, 절대날짜 폴백 없음)
- knowledge/page.tsx:68-77, community/page.tsx:38-48, knowledge/[id]/page.tsx:35-42 교체

### 5. 홈페이지 기본 노출 + SEO/GEO
- app/page.tsx에 오호라 섹션 추가 (RSC, supabaseAdmin 직접 쿼리)
- 공개 질문 상세 SSR 페이지: app/ohora/[id]/page.tsx (generateMetadata + QAPage JSON-LD)
- middleware PROTECTED 목록에서 /ohora 제외
- Navigation.tsx: 오호라 링크를 /ohora (공개)로 변경

### 6. 5,000P 리워드 삭제
- knowledge/page.tsx:321-325 뱃지 렌더 제거
- knowledge/[id]/page.tsx:148-152 뱃지 렌더 제거
- 리워드 관련 문구 제거
- reward_points>0 기존 데이터: migration으로 UPDATE 0 처리

### 7. 일반인 가입/참여 허용
- middleware.ts handleVerificationGate에서 /knowledge 경로 예외 처리
- LoginRequiredModal 컴포넌트 신규 생성
- 비로그인 상태 질문/답변 작성 시 모달 노출

### 8. "지식 거래소" → "오호라!" 명칭 교체
- 전체 14개 위치 교체 (grep 결과 기준)
- 신규 point_transactions description만 변경, 과거 이력 데이터 유지

## 커밋 전략
1. feat: lib/relative-time.ts 생성 + 인라인 relativeTime 교체
2. refactor: 사장님 모임 탭 제거 + /community 리다이렉트
3. feat: "마케팅 지식" → "사업 지식" + 5,000P 리워드 삭제 + "지식 거래소" → "오호라!" 명칭 교체
4. feat: middleware 사업자 인증 예외 + 로그인 모달
5. feat: 오호라 공개 SSR 페이지 + 홈 섹션 + SEO/JSON-LD
6. chore: 인기 답변자 목업 제거 + reward_points 정리 migration

## 리스크
- middleware.ts 수정 시 다른 보호 경로 영향 (최고 리스크 — 검증 필수)
- /ohora 공개 라우트가 인증 없이 DB 직접 쿼리 시 성능/보안 고려
