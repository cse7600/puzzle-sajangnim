// 로그인 화면은 동의를 "받지" 않는다 — 신규 가입자의 실제 동의는 카카오 인증 후
// /auth/consent에서 체크박스로 받는다. 여기서는 약관 원문 접근 경로만 열어둔다.
const LINK_CLASS = 'text-muted underline underline-offset-2 hover:text-ink transition-colors'

export default function LegalNotice() {
  return (
    <p className="mt-5 text-center text-[12px] leading-relaxed text-muted-light">
      계속 진행하면{' '}
      <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        이용약관
      </a>
      과{' '}
      <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        개인정보 처리방침
      </a>
      에 동의하는 것으로 봅니다.
      <br />
      처음 가입하는 경우 다음 화면에서 동의 항목을 확인할 수 있어요.
    </p>
  )
}
