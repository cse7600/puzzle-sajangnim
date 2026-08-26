// 관리자 로그인 시도에 대한 인메모리 레이트 리밋.
// 프로세스(인스턴스) 로컬 상태다 — 서버리스 다중 인스턴스 환경에서는 인스턴스마다
// 카운트가 분리되어 완전한 방어가 되지 않는다. 단일 프로세스/소규모 배포 기준의
// 기초 방어선으로만 쓰고, 프로덕션 다중 인스턴스에서는 Redis 등 공유 저장소가 필요하다.
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 10

interface RateLimitEntry {
  count: number
  windowStart: number
}

const attempts = new Map<string, RateLimitEntry>()

export function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now })
    return true
  }

  if (entry.count >= MAX_ATTEMPTS) return false

  entry.count += 1
  return true
}
