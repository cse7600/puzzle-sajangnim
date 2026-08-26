# VERIFICATION: 팀구매 2차 개편 — 신청자 관리 페이지 + 양방향 설문

- 검증일: 2026-08-26
- 대상 커밋: `e7326a9`(019+PLAN), `db337cb`(과제1), `6adcdc3`(문항 관리), `d76fa66`(과제2 사용자)
- 검증 방법: PLAN_team_buy_survey.md 계약을 33개 항목으로 분해, 전 항목 실제 코드 Read/Grep 대조 +
  실 DB REST 조회 + `npx tsc --noEmit` 재실행
- **Match Rate: 33/33 (100%)**
- 배포 안 함(push/vercel 미실행) — 로컬 커밋까지만. DB에는 019 테이블만 추가 적용됨(추가형).

## 체크리스트

### 마이그레이션 019
| # | 항목 | 판정 |
|---|---|---|
| 1 | `team_deal_survey_questions` (deal_id FK cascade, position, type 3종 check, label, required, created_at) | PASS |
| 2 | `team_deal_survey_responses` (member_id·question_id FK cascade, value, unique(member_id,question_id)) | PASS |
| 3 | RLS on·정책 0건(team_deal_members 동일 패턴), 인덱스 2개, 전부 추가형 | PASS |
| 4 | 실 DB 적용 확인 (REST 조회 시 두 테이블 모두 빈 배열 = 존재) | PASS |

### 과제 1 — 어드민 members API (`app/api/admin/team-deals/[id]/members/route.ts`)
| # | 항목 | 판정 |
|---|---|---|
| 5 | 응답 형태 `{ deal, questions, members }` 계약 일치 (+`prev_month_period` 추가형 필드) | PASS |
| 6 | 연락처: `ad_accounts.contact_phone` 대체(users.phone 사문 확인 주석 포함), 배치 in() | PASS |
| 7 | 담당자 수신메일: `business_verifications.tax_invoice_email` — submitted_at 기준 유저별 최신 1건, 배치 | PASS |
| 8 | 포인트 잔액: `getPointBalance` RPC 재사용, unique userIds Promise.all | PASS |
| 9 | 전월 소진: `ad_account_monthly_spend` eq(period, 전월) 배치, 매체별 요약 + 합계 | PASS |
| 10 | 설문 답변: responses in(memberIds) 배치, survey_status 4상태(none/pending/partial/done) | PASS |
| 11 | N+1 없음 — users/verifications/accounts/spend/responses 전부 단일 in() 쿼리 | PASS |
| 12 | 어드민 게이트 + isUuid + 구체적 한국어 에러 | PASS |

### 과제 1 — 어드민 페이지 (`app/admin/team-deals/[id]/members/page.tsx`)
| # | 항목 | 판정 |
|---|---|---|
| 13 | 모달 삭제(`TeamDealMembersModal.tsx` git rm) + 목록 "신청자" → `router.push('/admin/team-deals/{id}/members')` | PASS |
| 14 | 딜 요약 헤더(제목/상태/딜가/모집현황/신청자 수) + 뒤로가기 링크 | PASS |
| 15 | 신청자 테이블: 상호명/이메일/수량/결제P/설문 배지/상태/신청일시 | PASS |
| 16 | 행 펼침 상세 패널: 연락처·수신메일·포인트 잔액·전월 매체별 소진 표(합계행)·`/admin/users/[id]` 링크 | PASS |
| 17 | 설문 답변 표시: 이미지=썸네일+새탭 원본, 링크=a 태그, 텍스트=pre-wrap, 미응답 표기 | PASS |
| 18 | 기존 개별 취소·환불 유지(기존 cancel 엔드포인트 재사용, joined만 노출, confirm) | PASS |
| 19 | 스켈레톤 로딩 + 구체 에러/재시도, 기존 어드민 톤(rounded-[18px]/#0066cc/필 배지) | PASS |

### 문항 관리 (`app/api/admin/team-deals/[id]/questions/route.ts` + 페이지 섹션)
| # | 항목 | 판정 |
|---|---|---|
| 20 | PUT 전체 세트 저장: id 있으면 upsert, 없으면 insert, 빠진 문항 delete(FK cascade) | PASS |
| 21 | 검증: label trim 필수·200자 제한, 타입 3종, 타 딜 문항 혼입 차단, 최대 30개, 어드민 게이트 | PASS |
| 22 | 접이식 "설문 문항 관리" 섹션: 추가/라벨/타입/필수/위아래 이동/삭제/저장 | PASS |
| 23 | 답변 달린 문항 삭제 시 confirm 경고 | PASS |

### 과제 2 — 사용자 API
| # | 항목 | 판정 |
|---|---|---|
| 24 | GET `/api/team-deals/my`: 신청 내역 + 딜 정보 배치 + survey 집계(어드민과 동일 4상태 규칙) | PASS |
| 25 | GET `/api/team-deals/[id]/survey`: 멤버 게이트(403 구체 메시지), questions+내 responses (+`member_status` 추가형) | PASS |
| 26 | PUT survey: joined만 저장(아니면 409), 문항 소속 검증, link URL 검증, trim 비어있지 않음, 부분 저장 upsert(onConflict, updated_at 갱신) | PASS |
| 27 | POST `/api/team-deals/survey-upload`: 로그인+joined 멤버 게이트, `responses/{dealId}/{memberId}/{ts}-{uuid}.{ext}` 경로 | PASS |
| 28 | 매직바이트 검증 `lib/image-upload.ts` 추출·공유 — 어드민 thumbnail 업로드도 동일 lib 사용(동작 불변) | PASS |
| 29 | 어드민 입장 sentinel 세션(id 비 uuid) 가드 — my는 빈 배열, survey/upload는 403 | PASS |

### 과제 2 — 사용자 프론트
| # | 항목 | 판정 |
|---|---|---|
| 30 | `/team-buy` 필 탭 "전체 딜 | 내 팀구매"(rounded-[9999px], 활성 #0066cc), 사이드바 미변경 | PASS |
| 31 | 내 팀구매 카드: 썸네일(플레이스홀더 재사용)/제목/수량·결제P·신청일/상태 배지/설문 배지(none 없음·done green·미완 amber), 클릭 시 설문 또는 딜 상세 분기 | PASS |
| 32 | 타입폼 설문 페이지: 진행률 바, 한 화면 한 질문(21px 타이포, n/N, 필수 표시), 타입별 입력(텍스트 자동포커스/링크 URL 검증/이미지 업로드 미리보기·교체), 이전·다음 필 버튼, 이동 시 변경분 부분 저장, 필수 미답 시 해당 질문 이동+안내, 제출 완료 화면, translate+opacity 300ms 전환, 읽기 전용 배너 | PASS |
| 33 | 디자인 규칙: 그라데이션 0건(grep), 스켈레톤 로딩(스피너 단독 없음), 제네릭 에러 메시지 없음, 무관 파일(.bkit/, docs/*.json) 커밋 미포함(git show --stat 확인) | PASS |

## 발견 사항 (갭 아님 — 기록용)

- PLAN 계약 대비 추가형 필드 2개: members 응답의 `prev_month_period`(전월 라벨 서버 기준 표시용),
  survey GET의 `member_status`(읽기 전용 판정용). 둘 다 문서화된 의도적 확장.
- 어드민 `surveyStatus`(responses.length 기준 pending)와 사용자 `summarizeSurvey`(answered 수 기준
  pending)는 표현이 다르나 responses가 FK cascade로 현존 문항에만 남으므로 결과 동치.
- 타입체크 `npx tsc --noEmit` exit 0.

## 결론

Match Rate 100% (33/33) — 기준(≥90%) 충족. pdca-iterator 불필요. 수정 커밋 없음.

---

# 부록 검증 (추가 요구사항: 딜 오픈 전제조건 + 제출 현황 가시화)

검증일 2026-08-26. 대상 커밋: `5f4d9ac`(migration 020 + PLAN 부록), `3ab8435`(오픈 게이트 + 문항 인라인 통합), `5a25bdb`(제출 현황 배지 + 읽기 전용 전환). 전 항목 실제 코드 Read/실측으로 확인.

### 마이그레이션·불변식(서버)
| # | 항목 | 판정 |
|---|---|---|
| A1 | migration 020: 실 DB `team_deals_status_check`에 'draft' 포함 (Management API pg_constraint 실측: draft/active/completed/failed/cancelled) | PASS |
| A2 | POST: draft로 먼저 insert → 문항 저장 성공 시에만 active 전환(문항 0개면 draft 유지·응답에 status 포함) — 문항 없는 딜이 active로 존재하는 순간 없음, 문항 저장 실패 시 draft 잔류+구체 에러 | PASS |
| A3 | PATCH: active 딜 + 빈 questions → 400 ("모집중인 딜의 요청서 문항은 전부 삭제할 수 없습니다…") | PASS |
| A4 | PATCH: draft + 문항 ≥1(저장 후 DB 재계수) → active 자동 전환, 전환 경로 PATCH로 일원화. questions-only 패치 허용(`hasDealPatchField`) | PASS |
| A5 | questions PUT: active + 빈 세트 → 400, draft→active 전환은 하지 않음(주석 명시). 타 딜 문항 id 혼입 차단 | PASS |
| A6 | questions GET 핸들러 존재(모달 편집 시 로드용) | PASS |
| A7 | 사용자 상세 GET: draft 딜 404(존재 자체 숨김). 사용자 목록은 기존 `eq('status','active')` 필터 | PASS |

### 어드민 UI
| # | 항목 | 판정 |
|---|---|---|
| A8 | TeamDealFormModal: 요청서 문항 인라인 편집(SurveyQuestionEditor — 추가/타입 select/필수 체크/위·아래 이동/삭제, 기존 문항 삭제 시 confirm) | PASS |
| A9 | 편집 모드 GET 로드 + 스켈레톤, 로딩 중 저장 버튼 비활성(`disabled={saving || uploading || questionsLoading}`) — 로드 전 저장으로 빈 세트 덮어쓰기 차단 | PASS |
| A10 | 문항 0개 시 사전 안내(orange: "요청서 문항이 없어 비공개(대기) 상태로 저장됩니다…") + 저장 응답 status가 draft면 목록 페이지 전용 토스트(`handleSaved(savedStatus)`) | PASS |
| A11 | 어드민 목록: status 유니온 'draft' + 라벨 "비공개(문항 필요)"/`bg-orange-50 text-orange-700`. '딜 취소' 버튼은 active/completed만 — draft 미노출(편집 유도) | PASS |

### 신청자 관리 페이지
| # | 항목 | 판정 |
|---|---|---|
| A12 | 행 레벨 "설문" 컬럼: SURVEY_STATUS 배지(done green "작성완료" / partial amber "부분작성" / pending red "미작성" / none 무배지) + "M/N 답변" 카운트(전체 문항 기준, 판정은 서버 survey_status 그대로) | PASS |
| A13 | 문항 편집 섹션 → 읽기 전용 요약(순서·라벨·타입·필수 배지) + "문항 추가·수정은 팀 구매 관리의 딜 편집에서" 안내 링크. 편집용 PUT 호출 UI 제거 | PASS |
| A14 | 답변 상세(행 펼침) 유지: 텍스트 whitespace-pre-wrap / 링크 a 태그 / 이미지 썸네일+원본 링크, 미응답 표시. 취소·환불 버튼 유지 | PASS |

### 범위·품질
| # | 항목 | 판정 |
|---|---|---|
| A15 | 처리 상태(미확인/확인함) 토글 미구현 — 범위 제외 지시 준수(grep 0건) | PASS |
| A16 | `npx tsc --noEmit` exit 0. 커밋 2건 모두 무관 파일(.bkit/, docs/*.json) 미포함(git show --stat 확인) | PASS |

## 발견 사항 (갭 아님 — 기록용)
- POST에서 문항 일부 저장 실패 시 딜이 draft로 남는 것은 의도된 안전 동작(고아 active 방지) — 에러 메시지가 이 상태를 명시함.
- 결제/참여 흐름은 미변경 — 오픈 게이트는 딜 노출 전제조건이며 개별 참여자의 답변 제출 여부와 무관(기존 "설문은 결제와 완전 분리" 결정과 정합).

## 부록 결론
부록 Match Rate 100% (16/16) — 기준(≥90%) 충족. 동작 결함 없음, 수정 커밋 없음.
