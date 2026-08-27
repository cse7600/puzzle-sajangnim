'use client'
import { useState } from 'react'
import { Platform, PLATFORM_INFO } from '@/lib/hub'
import { TRANSFER_CONTACT_EMAIL_PLACEHOLDER } from '@/lib/company-info'

interface GuideStep {
  title: string
  detail: string
}

const GUIDES: Record<Platform, { entry: string; steps: GuideStep[] }> = {
  naver: {
    entry: 'searchad.naver.com (네이버 광고 관리시스템)',
    steps: [
      { title: '광고 관리시스템에 로그인', detail: '사업자 계정으로 searchad.naver.com에 접속해 로그인해요.' },
      { title: '상단 메뉴 [도구] → [광고시스템 사용자 관리] 클릭', detail: '계정 관리자에게만 보이는 메뉴예요. 안 보이면 계정 소유주에게 부탁해주세요.' },
      { title: '[사용자 초대] 버튼 클릭', detail: '오른쪽 위 초대 버튼을 누르면 이메일 입력 창이 떠요.' },
      { title: `이메일 주소로 초대장 발송`, detail: `초대할 이메일: ${TRANSFER_CONTACT_EMAIL_PLACEHOLDER} · 권한은 "광고 관리"로 선택해주세요.` },
      { title: '초대 완료 후 이 화면으로 돌아와 "이관 완료" 버튼 클릭', detail: '퍼즐팀이 권한이 들어왔는지 확인하고 연동을 완료 처리해드려요.' },
    ],
  },
  naver_gfa: {
    entry: 'gfa.naver.com (네이버 GFA 광고관리시스템)',
    steps: [
      { title: 'GFA 광고관리시스템에 로그인', detail: '네이버 계정으로 gfa.naver.com에 접속해요.' },
      { title: '[설정] → [멤버 관리] 이동', detail: '광고주 계정 설정 화면에서 멤버 관리 메뉴를 찾아요.' },
      { title: '[멤버 초대] 클릭 후 이메일 입력', detail: `초대할 이메일: ${TRANSFER_CONTACT_EMAIL_PLACEHOLDER} · 권한은 "운영자"로 선택해주세요.` },
      { title: '초대 완료 후 "이관 완료" 버튼 클릭', detail: '퍼즐팀이 확인 후 연동을 완료 처리해드려요.' },
    ],
  },
  google: {
    entry: 'ads.google.com (Google Ads)',
    steps: [
      { title: 'Google Ads에 로그인', detail: '광고 계정 관리자 권한이 있는 구글 계정으로 로그인해요.' },
      { title: '오른쪽 위 [도구 및 설정] → [액세스 및 보안] 이동', detail: '렌치 아이콘을 누르면 메뉴가 나와요.' },
      { title: '[+] 버튼으로 사용자 추가', detail: `이메일 주소: ${TRANSFER_CONTACT_EMAIL_PLACEHOLDER} · 액세스 수준은 "관리자"로 선택해주세요.` },
      { title: '초대 완료 후 "이관 완료" 버튼 클릭', detail: '퍼즐팀이 확인 후 연동을 완료 처리해드려요.' },
    ],
  },
  kakao: {
    entry: 'moment.kakao.com (카카오모먼트)',
    steps: [
      { title: '카카오모먼트에 로그인', detail: '광고계정 관리자 권한의 카카오 계정으로 로그인해요.' },
      { title: '[광고계정 설정] → [광고계정 관리자] 이동', detail: '좌측 메뉴에서 계정 설정을 찾아요.' },
      { title: '[관리자 초대]로 이메일 입력', detail: `이메일 주소: ${TRANSFER_CONTACT_EMAIL_PLACEHOLDER} · 권한은 "광고 관리자"로 선택해주세요.` },
      { title: '초대 완료 후 "이관 완료" 버튼 클릭', detail: '퍼즐팀이 확인 후 연동을 완료 처리해드려요.' },
    ],
  },
  danggeun: {
    entry: 'business.daangn.com (당근 비즈니스)',
    steps: [
      { title: '당근 비즈니스 센터에 로그인', detail: '광고 운영 중인 비즈프로필 계정으로 로그인해요.' },
      { title: '[팀원 관리] 메뉴 이동', detail: '비즈프로필 설정에서 팀원 관리를 찾아요.' },
      { title: '[팀원 초대]로 이메일 입력', detail: `이메일 주소: ${TRANSFER_CONTACT_EMAIL_PLACEHOLDER} · 권한은 "광고 관리"로 선택해주세요.` },
      { title: '초대 완료 후 "이관 완료" 버튼 클릭', detail: '퍼즐팀이 확인 후 연동을 완료 처리해드려요.' },
    ],
  },
  toss: {
    entry: '토스 광고 관리자센터',
    steps: [
      { title: '토스 광고 관리자센터에 로그인', detail: '광고 운영 계정으로 로그인해요.' },
      { title: '[팀원 관리] 메뉴 이동', detail: '계정 설정에서 팀원 관리를 찾아요.' },
      { title: '[팀원 초대]로 이메일 입력', detail: `이메일 주소: ${TRANSFER_CONTACT_EMAIL_PLACEHOLDER} · 권한은 "관리자"로 선택해주세요.` },
      { title: '초대 완료 후 "이관 완료" 버튼 클릭', detail: '퍼즐팀이 확인 후 연동을 완료 처리해드려요.' },
    ],
  },
}

export default function TransferGuide({ initialPlatform }: { initialPlatform?: Platform }) {
  const [platform, setPlatform] = useState<Platform>(initialPlatform ?? 'naver')
  const guide = GUIDES[platform]

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {(Object.entries(PLATFORM_INFO) as [Platform, typeof PLATFORM_INFO[Platform]][]).map(([key, info]) => (
          <button
            key={key}
            onClick={() => setPlatform(key)}
            className={`rounded-[9999px] border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              platform === key ? 'border-primary-dark bg-primary text-ink' : 'border-[#e0e0e0] text-[#6e6e73] hover:bg-[#f5f5f7]'
            }`}
          >
            {info.name}
          </button>
        ))}
      </div>

      <div className="rounded-[14px] border border-[#e0e0e0] bg-[#f5f5f7] px-4 py-3 mb-5">
        <p className="text-[12px] text-[#6e6e73]">접속 위치</p>
        <p className="text-[14px] font-medium text-[#1d1d1f] mt-0.5">{guide.entry}</p>
      </div>

      <ol className="space-y-4">
        {guide.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-ink text-[12px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#1d1d1f]">{step.title}</p>
              <p className="text-[13px] text-[#6e6e73] mt-0.5 leading-relaxed">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-[12px] text-[#a1a1a6] mt-6">
        * 플랫폼 메뉴 명칭은 업데이트될 수 있어요. 화면이 다르면 스크린샷과 함께 담당자에게 문의해주세요.
      </p>
    </div>
  )
}
