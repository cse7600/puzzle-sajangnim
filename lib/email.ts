// Resend REST API를 fetch로 직접 호출한다 — 트랜잭션 이메일 발송 1건짜리 니즈에
// resend npm 패키지를 추가하는 것보다 의존성을 줄일 수 있어 REST 호출로 충분하다.
const RESEND_API_URL = 'https://api.resend.com/emails'

let warnedMissingApiKey = false

function warnMissingApiKeyOnce() {
  if (warnedMissingApiKey) return
  warnedMissingApiKey = true
  console.warn('[email] RESEND_API_KEY가 설정되지 않아 이메일 발송을 건너뜁니다')
}

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey || !from) {
    warnMissingApiKeyOnce()
    return false
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[email] Resend 발송 실패:', response.status, errorBody)
      return false
    }

    return true
  } catch (error) {
    console.error('[email] Resend 호출 오류:', error)
    return false
  }
}

function buildWelcomeEmailHtml(name: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e0e0e0;">
    <div style="background:#1d1d1f;padding:28px 32px;">
      <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">퍼즐 사장님</p>
    </div>
    <div style="padding:36px 32px 30px;">
      <p style="margin:0 0 18px;font-size:15px;color:#1d1d1f;line-height:1.7;">
        안녕하세요, <strong>${name}</strong>님.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3a3a3c;line-height:1.7;">
        퍼즐 사장님 가입을 환영합니다. 복잡한 마케팅을 사장님이 직접 관리할 수 있도록 만든 서비스입니다.
      </p>
      <div style="background:#f5f5f7;border-radius:11px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1d1d1f;">다음 단계: 사업자 인증</p>
        <p style="margin:0;font-size:13px;color:#6e6e73;line-height:1.7;">
          서비스를 자유롭게 이용하려면 사업자 등록증 인증이 필요합니다.
          설정 페이지에서 사업자 번호와 등록증을 등록해주세요.
        </p>
      </div>
      <a href="https://sajangnim.puzl.co.kr/settings"
         style="display:inline-block;padding:13px 28px;background:#163300;color:#ffffff;text-decoration:none;border-radius:9999px;font-size:14px;font-weight:600;">
        사업자 인증하러 가기
      </a>
    </div>
    <div style="padding:18px 32px;background:#f5f5f7;border-top:1px solid #e0e0e0;">
      <p style="margin:0;font-size:12px;color:#6e6e73;">
        본 메일은 퍼즐 사장님 가입 확인을 위해 발송되었습니다.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: '[퍼즐 사장님] 가입을 환영합니다',
    html: buildWelcomeEmailHtml(name),
  })
}
