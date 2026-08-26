# 네이버 플레이스 키워드 순위 크롤러

설계: [`../.planning/RAILWAY_PLAYWRIGHT_DESIGN.md`](../.planning/RAILWAY_PLAYWRIGHT_DESIGN.md)
구현/실측 기록: [`../.planning/VERIFICATION_naver_rank_crawler.md`](../.planning/VERIFICATION_naver_rank_crawler.md)

`puzl_place_keywords`(활성) × `puzl_place_registrations`(활성)를 조회해 각 키워드의 네이버
지도 검색 오가닉 순위를 Playwright로 수집하고 `puzl_keyword_rankings`에 upsert한다.

## 로컬 실행

```bash
cd crawler
pip install -r requirements.txt
python -m playwright install --with-deps chromium
cp .env.example .env   # SUPABASE_SERVICE_ROLE_KEY 채우기
python main.py
```

## 배포 — GitHub Actions (Railway 대신 채택, 2026-08-26)

Railway는 계정/카드 등록이 필요해 대신 이미 연결된 GitHub Actions로 스케줄을 돌린다.
이 레포가 **public**이라 Actions 실행 시간이 완전 무료(무제한)다. 워크플로우:
`.github/workflows/naver-rank-crawler.yml` (매일 03:00 KST cron + 수동 실행 가능).

1. GitHub repo → Settings → Secrets and variables → Actions → New repository secret
   → `SUPABASE_SERVICE_ROLE_KEY` 등록 (`~/.claude/CREDENTIALS.md`의 perma-studio 프로젝트 값).
   `SUPABASE_URL`은 민감정보 아니라 워크플로우 파일에 평문으로 이미 박혀있음.
2. 워크플로우 커밋을 main에 push하면 스케줄 등록 완료. `gh workflow run naver-rank-crawler.yml`
   또는 GitHub Actions 탭 → Run workflow로 수동 1회 실행해 로그에서 성공/실패 카운트 확인.
3. 정상 동작 확인되면 `app/(app)/place/page.tsx` 등에서 `SHOW_RANK_MONITORING` 플래그를 켜서
   UI 노출 (현재는 미배포 상태라 꺼둔 채로 둘 것)

## 알려진 리스크

- 이 크롤러는 로컬(한국 residential IP로 추정)에서만 실측 검증했다. GitHub Actions 러너(보통
  미국 Azure 데이터센터 IP)에서 동일하게 동작한다는 보장은 없다 — 첫 실행 후 반드시 로그로 차단
  여부(placeList 파싱 실패 예외) 확인. 막히면 residential 프록시 도입 또는 실행 위치 재검토 필요.
- 네이버 내부 GraphQL 스키마(`window.__APOLLO_STATE__`)는 무문서·비공개라 언제든 바뀔 수 있다.
  `naver_place_list.py`의 `find_rank`가 `placeList(...)` 키를 못 찾으면 즉시 예외를 던지므로,
  실행 로그에 실패가 몰리기 시작하면 스키마 변경을 의심하고 이 파일부터 갱신할 것.
