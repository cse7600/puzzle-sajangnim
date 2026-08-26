'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Upload, X, Check, Loader2, ImageIcon, Send,
} from 'lucide-react'
import { getTheme } from '@/lib/link-themes'

interface PartnerInfo {
  handle: string
  displayName: string
  avatarUrl: string | null
  themePreset: string | null
}

const CAMPAIGN_TYPES = ['광고', '공동구매', '협찬', '제품제공', '기타']
const CATEGORIES = [
  '육아·키즈', '홈·리빙', '식품·요리', '뷰티', '패션', '디지털·가전',
  '가구·인테리어', '스포츠·건강', '여행·아웃도어', '교육·커리어', '취미·아트', '반려동물', '기타',
]
const REWARD_TYPES = ['고정 원고료', '판매 수수료(CPS)', '무료 제품 제공', '원고료 + 수수료', '기타 협의']

export default function ProposeForm({ partner }: { partner: PartnerInfo }) {
  const t = getTheme(partner.themePreset)

  const [proposerName, setProposerName] = useState('')
  const [proposerEmail, setProposerEmail] = useState('')
  const [proposerPhone, setProposerPhone] = useState('')

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [campaignType, setCampaignType] = useState<string>('')
  const [brandName, setBrandName] = useState('')
  const [productName, setProductName] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [features, setFeatures] = useState('')

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rewardType, setRewardType] = useState('')
  const [rewardAmount, setRewardAmount] = useState('')
  const [proposalMessage, setProposalMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const accent = t.accent
  const INK = '#1A1A1A', SUB = '#5A5A5A', MUTED = '#8A8A86', BORDER = '#E7E7E4', SURFACE = '#F7F7F5'

  const toggleCategory = (c: string) => {
    setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      setError('이미지는 20MB 이하만 업로드할 수 있어요.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const tryUploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null
    try {
      const formData = new FormData()
      formData.append('file', imageFile)
      const res = await fetch(`/api/public/link-page/${encodeURIComponent(partner.handle)}/upload-proposal-image`, {
        method: 'POST', body: formData,
      })
      if (!res.ok) return null
      const json = await res.json().catch(() => ({}))
      return (json as { url?: string }).url || null
    } catch {
      return null
    }
  }

  const validate = (): string | null => {
    if (!proposerName.trim()) return '제안자 이름을 입력해주세요.'
    if (!proposerEmail.trim()) return '제안자 이메일을 입력해주세요.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proposerEmail.trim())) return '올바른 이메일 형식이 아니에요.'
    if (!proposerPhone.trim()) return '제안자 연락처를 입력해주세요.'
    if (!campaignType) return '캠페인 유형을 선택해주세요.'
    if (!brandName.trim()) return '브랜드명을 입력해주세요.'
    if (!proposalMessage.trim()) return '제안 내용을 입력해주세요.'
    return null
  }

  const handleSubmit = async () => {
    const v = validate()
    if (v) { setError(v); return }
    setSubmitting(true)
    setError(null)
    try {
      const imageUrl = await tryUploadImage()
      const res = await fetch(`/api/public/link-page/${encodeURIComponent(partner.handle)}/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_image_url: imageUrl,
          campaign_type: campaignType,
          brand_name: brandName.trim(),
          product_name: productName.trim(),
          categories,
          features: features.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
          reward_type: rewardType || null,
          reward_amount: rewardAmount.trim() || null,
          proposal_message: proposalMessage.trim(),
          proposer_name: proposerName.trim(),
          proposer_email: proposerEmail.trim(),
          proposer_phone: proposerPhone.trim(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((json as { error?: string }).error || '제안 전송에 실패했어요. 잠시 후 다시 시도해주세요.')
        return
      }
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError('네트워크 오류로 제안을 보내지 못했어요.')
    } finally {
      setSubmitting(false)
    }
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${BORDER}`,
    fontSize: 14, color: INK, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: INK, display: 'block', marginBottom: 7 }
  const req = <span style={{ color: '#DC2626' }}> *</span>
  const sectionCard: React.CSSProperties = {
    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 14,
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: t.pageBg, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '40px 28px', maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Check size={32} color="#16A34A" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 10 }}>제안서가 전달됐어요!</h1>
          <p style={{ fontSize: 14, color: SUB, lineHeight: 1.65, marginBottom: 24 }}>
            <strong style={{ color: INK }}>{partner.displayName}</strong>님에게 제안이 전달됐어요.<br />
            검토 후 입력하신 연락처로 회신드릴 거예요.
          </p>
          <Link href={`/l/${partner.handle}`} style={{ display: 'inline-block', padding: '13px 28px', borderRadius: 12, background: accent, color: t.accentText, fontSize: 14.5, fontWeight: 700, textDecoration: 'none' }}>
            프로필로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, fontFamily: 'var(--font-sans)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '18px 18px 0' }}>
        {/* 헤더 */}
        <Link href={`/l/${partner.handle}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.textSub, fontSize: 13.5, fontWeight: 600, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={16} /> 프로필로 돌아가기
        </Link>

        {/* 사장님 정보 (읽기 전용) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: t.chip, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {partner.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.avatarUrl} alt={partner.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 20, fontWeight: 800, color: accent }}>{partner.displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: MUTED, fontWeight: 600, marginBottom: 2 }}>비즈니스 제안 받는 사람</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: INK }}>{partner.displayName}</div>
          </div>
        </div>

        <div style={{ padding: '18px 2px 14px' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: t.text, letterSpacing: '-0.02em', marginBottom: 5 }}>비즈니스 제안 보내기</h1>
          <p style={{ fontSize: 13.5, color: t.textSub, lineHeight: 1.6 }}>캠페인 정보를 남겨주시면 사장님에게 바로 전달돼요.</p>
        </div>

        {/* 제안자 정보 */}
        <div style={sectionCard}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: INK, marginBottom: 4 }}>제안자 정보</div>
          <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 16 }}>사장님이 회신할 수 있도록 정확히 입력해주세요.</p>
          <div style={{ marginBottom: 14 }}>
            <label style={label}>이름{req}</label>
            <input style={input} value={proposerName} onChange={e => setProposerName(e.target.value)} placeholder="담당자 이름" maxLength={50} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={label}>이메일{req}</label>
              <input style={input} value={proposerEmail} onChange={e => setProposerEmail(e.target.value)} placeholder="you@brand.com" inputMode="email" />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={label}>연락처{req}</label>
              <input style={input} value={proposerPhone} onChange={e => setProposerPhone(e.target.value)} placeholder="010-0000-0000" inputMode="tel" />
            </div>
          </div>
        </div>

        {/* 캠페인 정보 */}
        <div style={sectionCard}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: INK, marginBottom: 16 }}>캠페인 정보</div>

          {/* 대표 이미지 */}
          <label style={label}>대표 이미지</label>
          <div style={{ marginBottom: 16 }}>
            {imagePreview ? (
              <div style={{ position: 'relative', width: 130, height: 130, borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={15} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 120, borderRadius: 12, border: `1.5px dashed ${BORDER}`, background: SURFACE, cursor: 'pointer', color: MUTED }}>
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={onPickImage} style={{ display: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Upload size={18} /><span style={{ fontSize: 13.5, fontWeight: 600 }}>이미지 업로드</span></div>
                <span style={{ fontSize: 11.5 }}>600x600 권장 / 20MB 이하 / JPG/PNG/WEBP</span>
              </label>
            )}
          </div>

          {/* 캠페인 유형 (단일 선택 칩) */}
          <label style={label}>캠페인 유형{req}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
            {CAMPAIGN_TYPES.map(ct => {
              const active = campaignType === ct
              return (
                <button key={ct} type="button" onClick={() => setCampaignType(ct)} style={{
                  padding: '8px 15px', borderRadius: 999, fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
                  border: `1.5px solid ${active ? accent : BORDER}`, background: active ? accent : '#fff', color: active ? t.accentText : SUB,
                }}>{ct}</button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={label}>브랜드명{req}</label>
              <input style={input} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="브랜드명" maxLength={100} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={label}>상품/서비스명</label>
              <input style={input} value={productName} onChange={e => setProductName(e.target.value)} placeholder="상품 또는 서비스명" maxLength={100} />
            </div>
          </div>

          {/* 카테고리 (다중 선택 칩) */}
          <label style={label}>제품 카테고리 <span style={{ color: MUTED, fontWeight: 500 }}>(중복 선택)</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {CATEGORIES.map(c => {
              const active = categories.includes(c)
              return (
                <button key={c} type="button" onClick={() => toggleCategory(c)} style={{
                  padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                  border: `1.5px solid ${active ? accent : BORDER}`, background: active ? t.chip : '#fff', color: active ? accent : SUB,
                }}>{c}</button>
              )
            })}
          </div>

          <label style={label}>브랜드/제품/캠페인 특징</label>
          <textarea value={features} onChange={e => setFeatures(e.target.value)} maxLength={2000} rows={4}
            placeholder="브랜드와 제품, 이번 캠페인의 특징을 자유롭게 설명해주세요."
            style={{ ...input, resize: 'vertical', lineHeight: 1.6 }} />
          <div style={{ fontSize: 11.5, color: MUTED, textAlign: 'right', marginTop: 4 }}>{features.length}/2000</div>
        </div>

        {/* 일정 / 보상 */}
        <div style={sectionCard}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: INK, marginBottom: 16 }}>일정 / 보상</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1 1 150px' }}>
              <label style={label}>시작일</label>
              <input type="date" style={input} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={label}>종료일</label>
              <input type="date" style={input} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: rewardType ? 16 : 0 }}>
            <label style={label}>보상 형태</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {REWARD_TYPES.map(r => {
                const active = rewardType === r
                return (
                  <button key={r} type="button" onClick={() => setRewardType(active ? '' : r)} style={{
                    padding: '8px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                    border: `1.5px solid ${active ? accent : BORDER}`, background: active ? accent : '#fff', color: active ? t.accentText : SUB,
                  }}>{r}</button>
                )
              })}
            </div>
          </div>
          {rewardType && (
            <div>
              <label style={label}>보상 금액 / 조건</label>
              <input style={input} value={rewardAmount} onChange={e => setRewardAmount(e.target.value)} placeholder="예: 건당 30만원 / 판매액의 15%" />
            </div>
          )}
        </div>

        {/* 제안서 */}
        <div style={sectionCard}>
          <label style={label}>제안 내용{req}</label>
          <textarea value={proposalMessage} onChange={e => setProposalMessage(e.target.value)} maxLength={2000} rows={6}
            placeholder="사장님에게 전하고 싶은 제안 내용을 자유롭게 작성해주세요."
            style={{ ...input, resize: 'vertical', lineHeight: 1.6 }} />
          <div style={{ fontSize: 11.5, color: MUTED, textAlign: 'right', marginTop: 4 }}>{proposalMessage.length}/2000</div>
        </div>

        {error && (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button type="button" onClick={handleSubmit} disabled={submitting} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '16px', borderRadius: 14, border: 'none',
          background: t.promoBg, color: t.accentText, fontSize: 15.5, fontWeight: 800,
          cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.75 : 1,
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        }}>
          {submitting ? <><Loader2 size={18} className="rl-spin" /> 보내는 중...</> : <><Send size={18} /> 제안서 보내기</>}
        </button>
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11.5, color: t.textSub, marginTop: 12 }}>
          <ImageIcon size={12} /> 제출한 정보는 사장님에게 즉시 전달됩니다.
        </p>
        <style>{`@keyframes rl-spin { to { transform: rotate(360deg) } } .rl-spin { animation: rl-spin 0.8s linear infinite; }`}</style>
      </div>
    </div>
  )
}
