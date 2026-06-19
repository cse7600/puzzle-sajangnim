# PLAN: lib/naver-place.ts 수정 — GraphQL → Apollo State HTML 파싱

작성일: 2026-06-20
대상 파일: `lib/naver-place.ts`
호출부: `app/api/place/register/route.ts` (fetchPlaceInfo 사용, 인터페이스 변경 없음)

## 배경

기존 `fetchPlaceInfo`는 `pcmap-api.place.naver.com/graphql`에 POST 했으나
네이버 스키마 변경으로 동작 불가:

```
"Cannot query field 'place' on type 'Query'. Did you mean 'places' or 'nxPlaces'?"
```

`places`/`nxPlaces`도 필드 구조 불일치로 실패. 실테스트로 검증된 대안은
플레이스 home 페이지 HTML의 `window.__APOLLO_STATE__`를 파싱하는 방식.

## 목표

1. `fetchPlaceInfo`를 Apollo State HTML 파싱으로 완전 교체
2. `PlaceBasicInfo` 인터페이스 및 호출부 시그니처는 유지(하위호환)
3. GraphQL 잔재(`PLACE_INFO_QUERY`, `mapPlaceBasicInfo`의 graphql 가정) 제거
4. `fetchKeywordRank`에 `searchCoord` 파라미터 추가 + 차단 사실 주석화
5. Railway Playwright 크론잡 설계 문서 별도 작성

## 검증된 기술 사실

### fetchPlaceInfo — Apollo State 방식
```
GET https://pcmap.place.naver.com/place/{placeId}/home
User-Agent: <모바일 UA>
→ HTML에 window.__APOLLO_STATE__ = {...}; 포함
→ JSON.parse → "PlaceDetailBase:{placeId}" 키 → 필드 추출
```

PlaceDetailBase 실제 필드:
| Apollo State 필드 | PlaceBasicInfo 매핑 |
|---|---|
| name | name |
| roadAddress ?? address | address |
| category | category |
| visitorReviewsTotal | reviewCount |
| visitorReviewsTotal | visitorReviewCount (동일) |
| cafeBlogReviewsTotal | blogReviewCount |
| visitorReviewsScore (0이면 null) | rating |
| `PlaceDetailTopPhotoItem:` 접두사 키 개수 | photoCount |
| PlaceDetailBase 전체 객체 | raw |

정규식(검증됨):
```
/window\.__APOLLO_STATE__\s*=\s*(\{.+?\});\s*<\/script>/s
```
폴백: `/window\.__APOLLO_STATE__\s*=\s*(.+?);\s*\n/s`

### fetchKeywordRank — 서버 IP 차단
- `searchCoord` 없으면 즉시 400
- `searchCoord` 있어도 데이터센터 IP는 `ncaptcha` 반환 (place: null)
- 결론: 서버리스에서 직접 호출 불가 → Railway Playwright 크론잡으로 이관
- 본 함수는 로컬/residential IP 폴백 용도로만 유지(graceful degrade)
- `searchCoord` 파라미터 추가, coord 미지정 시 서울 중심 기본값

## 작업 분해 (Task)

- T1: HTML fetch 헬퍼 `fetchPlaceHtml(placeId)` 추가 (텍스트 응답 + 재시도)
- T2: Apollo State 추출 헬퍼 `extractApolloState(html)` 추가 (정규식 + JSON.parse)
- T3: 사진 수 카운트 헬퍼 `countPhotoItems(apolloState)` 추가
- T4: `mapPlaceBasicInfo`를 Apollo State 기반으로 재작성 (PlaceDetailBase 접근)
- T5: `fetchPlaceInfo` 본문 교체 (T1~T4 조립)
- T6: `PLACE_INFO_QUERY` 상수 + graphql 관련 코드 제거
- T7: `fetchKeywordRank`에 coord 옵션 파라미터 + searchCoord + 차단 주석
- T8: `tsc --noEmit` 통과 확인

각 헬퍼 30줄 이하 (전역 규칙). `any` 금지, `console.log` 금지.

## 함수 시그니처 변경

```typescript
// 변경 없음 (하위호환)
export async function fetchPlaceInfo(placeId: string): Promise<PlaceBasicInfo>

// coord 옵션 추가
export interface SearchCoord { x: string; y: string }
export async function fetchKeywordRank(
  keyword: string,
  myPlaceId: string,
  coord?: SearchCoord,
): Promise<KeywordRankResult>
```

기본 좌표: 서울시청 `{ x: '126.9783882', y: '37.5666103' }`

## 수용 기준 (Acceptance Criteria)

- [ ] `fetchPlaceInfo`에 GraphQL POST 코드 없음
- [ ] `pcmap.place.naver.com/place/{id}/home` GET 존재
- [ ] `window.__APOLLO_STATE__` 정규식 파싱 존재
- [ ] `PlaceDetailBase:{placeId}` 키 접근 존재
- [ ] `visitorReviewsScore === 0` → rating null 처리 존재
- [ ] `PlaceDetailTopPhotoItem:` 접두사 카운트 존재
- [ ] `PLACE_INFO_QUERY` 상수 삭제됨
- [ ] `fetchKeywordRank`에 searchCoord 파라미터 존재
- [ ] `fetchKeywordRank` 상단에 차단 사실 주석 존재
- [ ] `tsc --noEmit` 통과
- [ ] 모든 신규 함수 30줄 이하, any/console.log 없음

## 리스크

- 네이버가 home HTML 구조를 변경하면 정규식이 깨짐 → raw에 PlaceDetailBase 전체
  보관하여 디버깅 가능. 폴백 정규식 2종 유지.
- visitorReviewsScore가 실제로 평점 미공개 업종에서 0으로 오는 케이스 →
  0 → null 처리로 "평점 없음"과 "평점 0점"을 구분(네이버 평점 최소 단위는 0 아님).
