---
name: project-demo-mode
description: puzzle-sajangnim runs in demo mode — hardcoded DEMO_USER_ID, mock data fallbacks, no real auth. Affects what counts as a real defect vs intentional placeholder.
metadata:
  type: project
---

puzzle-sajangnim (Next.js 14 SMB marketing app) is in pre-auth demo mode.

**Why:** Kakao login / Supabase Auth not yet implemented. `lib/auth.ts` and `lib/hooks/useUser.ts` both return a static DEMO_USER with id `'demo-user-001'` and `isLoggedIn()` always true. API routes (app/api/*/route.ts) try Supabase, then fall back to mock data on any error.

**How to apply:** When analyzing, distinguish intentional demo scaffolding (mock fallbacks, DEMO_USER) from real defects. Two demo-related issues are genuine bugs worth flagging: (1) `DEMO_USER_ID = 'demo-user-001'` is not a valid UUID, so any Supabase insert with a real FK to users will fail — the code masks this by catching and returning mock success. (2) several catch blocks return success responses on real failure (e.g. team-buy/page.tsx join handler reports "참여 완료" even when the request errored). `lib/supabase-admin.ts` (service role key) exists but is imported nowhere — verify it stays out of client bundles if it ever gets used.
