# VERIFICATION — 네이버 플레이스 키워드 순위 크롤러 (2026-08-26)

설계 문서: `RAILWAY_PLAYWRIGHT_DESIGN.md` (2026-06-20 작성, 코드 미구현 상태였음)
구현 위치: `crawler/` (신규 Python 마이크로서비스, Next.js 앱과 별도)

## 설계 대비 변경점 (실측 기반)

원 설계 문서는 "DOM 리스트를 위→아래 순회하며 광고 배지 판별"을 가정했다. 실제로 구현하며
Playwright로 `map.naver.com/p/search/{keyword}` 를 렌더시켜보니 더 안정적인 경로를 발견해 교체했다.

1. **DOM 스크롤 파싱 → `window.__APOLLO_STATE__` 파싱으로 교체.** searchIframe
   (`pcmap.place.naver.com/{type}/list?...`) HTML 안에 `lib/naver-place.ts`가 플레이스 상세
   페이지에서 이미 쓰고 있는 것과 동일한 Apollo State가 있다. `ROOT_QUERY."placeList(...)"
   .businesses.items`가 광고 없이 순수 오가닉 순서 그대로 담겨 있어(실측 확인), 무한스크롤·CSS
   셀렉터 없이 1회 파싱으로 최대 70위까지(`display=70`) 순위를 얻는다. 광고는 완전히 별도 필드
   `ROOT_QUERY."adBusinesses(...)"` (`RestaurantAdsResult`)에 있어 오가닉 리스트와 섞이지 않는다
   — "상단 3개는 광고" 같은 위치 기반 추정이 필요 없다.
2. **검색 좌표 명시 필수.** `map.naver.com/p/search/{keyword}?c={x},{y},15,0,0,0,dh` 형식으로
   좌표를 안 주면 크롤러 실행 서버의 IP 기반 위치로 검색 중심이 잡힌다(실측 확인 — 로컬 실행
   시 IP 위치가 자동 반영됨). Railway 등 국외/타 리전 IP에서 결과가 흔들리는 걸 막기 위해
   `lib/naver-place.ts`의 `DEFAULT_SEARCH_COORD`(서울시청)를 그대로 기본값으로 명시했다.

## 로컬 실측 테스트 (2026-08-26, 실 Supabase 대상)

- 환경: macOS 로컬, Python 3.9.6, Chromium(Playwright 1.58.0) headless, `playwright-stealth` 적용
  (다만 스텔스 유무와 무관하게 결과 동일 — ncaptcha-iframe은 항상 뜨지만 데이터 추출을 막지 않음)
- 실 등록 데이터(`puzl_place_registrations` role='mine', 남양주대하구이 덕소점,
  place_id=2075394572)에 임시 키워드 2개를 붙여 종단 테스트 후 삭제(등록 자체는 미변경):
  - `덕소대하구이` → `rank=1, is_ad=false, found_in=organic` (검색결과 총 1건 중 유일 매치)
  - `남양주맛집` → `rank=null, is_ad=true, found_in=ad` (오가닉 70건엔 없고 광고 3건 중 매치 —
    조직/유료 두 리스트를 실제로 구분해서 잡아내는 것까지 확인)
- 동일 키워드 2회 연속 실행 → `puzl_keyword_rankings` 행 수 불변(1건) 확인, upsert
  (`on_conflict=keyword_id,snapshot_date`) 정상 동작
- 테스트 종료 후 임시 키워드 2건 삭제(cascade로 rankings도 함께 삭제) → 잔여 데이터 0건 확인

## 배포 방식 변경 — Railway → GitHub Actions (2026-08-26, 사용자 요청)

Railway는 계정/카드 등록이 필요해 사용자가 보류. 대신 이미 연결된 GitHub(`cse7600/puzzle-sajangnim`,
public repo → Actions 무제한 무료)로 전환. `crawler/Dockerfile`, `crawler/railway.toml` 삭제하고
`.github/workflows/naver-rank-crawler.yml`(매일 03:00 KST cron + 수동 실행) 신설.
크롤러 코드(`crawler/*.py`) 자체는 실행 환경 비의존적이라 변경 없음.

## Fable 리뷰 (2026-08-26, 배포 직전) — 확실한 버그 1건 수정

- **exit code 버그(수정 완료)**: `return 0 if error_count < len(keywords) else 1`은 키워드 0개일 때
  `0 < 0`이 False라 매번 exit 1 — 지금처럼 키워드가 아직 없는 날도 매일 GitHub Actions 실패로
  뜰 뻔했다. `error_count > 0`이면 non-zero로 교체(키워드 0개=성공분 없음=정상 종료, 부분 실패도
  이제 non-zero로 잡혀서 "며칠째 일부만 조용히 계속 실패" 상황을 놓치지 않는다).
- **frame 로드 레이스 컨디션(수정 완료)**: `find_search_frame`이 frame.url 매칭 즉시 반환하는데
  이게 내비게이션 시작 시점일 수 있어 바로 이어지는 `frame.content()`가 미완성 HTML을 받거나
  예외를 던질 수 있음. `frame.wait_for_load_state("domcontentloaded")` 추가.
- 나머지 점검 항목(Playwright 리소스 정리, PostgREST `!inner` 필터, `_deref` 엣지케이스, upsert
  제약, 워크플로우 yml 문법)은 전부 이상 없음 확인.
- 참고(수정 불필요, 인지만): 네이버 Apollo 키 이름(`placeList(`/`adBusinesses(`)은 업종별로 다를
  수 있음(실측은 restaurant 기준) — 다른 업종 등록 시 전건 실패하면 이걸 의심할 것. GitHub은
  60일간 커밋 없으면 schedule 워크플로우를 자동 비활성화한다.

## 미검증 — 다음 단계

- GitHub Actions 러너(보통 미국 Azure 데이터센터 IP)에서도 동일하게 ncaptcha를 우회하고 데이터가
  나오는지는 미확인. 이번 실측은 로컬(한국 residential IP 추정) 기준이라 결과가 다를 수 있음 —
  워크플로우 push 후 `gh workflow run`으로 수동 1회 실행해 로그를 반드시 확인할 것.
- `SUPABASE_SERVICE_ROLE_KEY`를 GitHub repo secret으로 등록해야 실제 동작함 — 아직 미등록.
- `SHOW_RANK_MONITORING` UI 플래그는 아직 `false` 유지(app/(app)/place). 크롤러가 실제로 매일
  자동 수집을 시작한 뒤 켤 것.
- 크론이 며칠간 안정적으로 도는지 확인 전까지는 알림(Slack 등) 연동 없음 — 실패 시 GitHub
  Actions 탭 로그로만 확인 가능한 상태.
