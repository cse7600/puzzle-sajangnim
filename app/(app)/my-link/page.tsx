'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  Copy, Check, ExternalLink, X, Plus, Pencil, Trash2, Pin,
  MoreVertical, ChevronUp, ChevronDown, Type, LinkIcon, ImageIcon, LayoutGrid,
  Inbox, Palette, BarChart3, Loader2, Archive, Copy as Duplicate, Mail, Send, AlertTriangle, User,
  AlignLeft, AlignCenter, Shuffle, Settings, Sparkles, Grid3x3, Calendar, Minus,
} from 'lucide-react'
import { THEME_PRESETS, LINK_STYLE_LABELS, BLOCK_SHADOWS, GRADIENT_PRESETS, type LinkBlockStyle } from '@/lib/link-themes'
import ProfileView, { type ProfileData, type PublicBlock, type ProgramCard } from '@/app/l/[handle]/ProfileView'

const T = {
  brand: '#0066cc', brandSoft: '#EBF5FF', teal: '#009588', tealSoft: '#E0F2F1',
  ink: '#1A1A1A', inkSub: '#5A5A5A', muted: '#8A8A86', surface: '#F7F7F5',
  border: '#E7E7E4', white: '#FFFFFF', green: '#16A34A', greenSoft: '#DCFCE7',
  amber: '#92400E', amberSoft: '#FEF3C7', red: '#DC2626', redSoft: '#FEE2E2',
  sky: '#0369A1', skySoft: '#E0F2FE',
}

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || ''
const cardStyle: React.CSSProperties = { background: T.white, border: `1px solid ${T.border}`, borderRadius: 14 }

interface ProgramItem {
  id?: string
  program_id: string
  is_active: boolean
  position?: number
  programName?: string
  codeOnly?: boolean
  logoUrl?: string | null
  program_type?: 'b2b' | 'affiliate' | 'lp'
  custom_title?: string
  custom_cta?: string
  url?: string
  referralCode?: string
}
interface Block {
  id: string
  type: 'text' | 'link' | 'image' | 'program_collection' | 'collection' | 'calendar' | 'divider'
  payload: Record<string, unknown>
  position: number
  is_pinned: boolean
  is_active: boolean
  is_archived: boolean
  clicks?: number
  program_items?: ProgramItem[]
}
type LayoutPreset = 'profile_only' | 'cover_top' | 'cover_profile_overlap'
type FontPreset = 'pretendard' | 'noto-sans-kr' | 'gowun-dodum' | 'nanum-gothic'
interface SnsLinkItem { platform: string; url: string }
interface BackgroundSetting {
  pageMode?: 'theme' | 'solid' | 'gradient'
  color?: string
  gradientKey?: string
  coverImageUrl?: string | null
}
interface BlockStyleSetting {
  shape?: 'round' | 'soft' | 'square'
  shadow?: 'none' | 'soft' | 'medium' | 'strong'
  align?: 'left' | 'center'
  fontSize?: 'sm' | 'md' | 'lg'
  animation?: 'none' | 'wave' | 'bounce'
  noticeRolling?: boolean
  buttonColor?: string
  noticeColor?: string
}
interface PageSettings {
  handle: string | null
  display_name: string
  bio: string
  avatar_url: string | null
  notice_text: string
  theme_preset: string | null
  proposal_enabled: boolean
  is_published: boolean
  layout_preset: LayoutPreset
  font_preset: FontPreset
  sns_links: SnsLinkItem[]
  background: BackgroundSetting
  block_style: BlockStyleSetting
}

const SOLID_COLORS = [
  '#FFFFFF', '#F7F7F5', '#FCE9DF', '#FFF3C4', '#E9F7EF', '#E0F2F1',
  '#E0F2FE', '#EDE9FE', '#FCE7F3', '#1A1A1A', '#0F172A', '#334155',
]
const BUTTON_COLORS = [
  '#0066cc',
  '#EF4444',
  '#EC4899',
  '#7C3AED',
  '#2563EB',
  '#0EA5E9',
  '#009588',
  '#16A34A',
  '#F59E0B',
  '#1A1A1A',
]
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
function isHexColor(v?: string | null): v is string { return !!v && HEX_COLOR_RE.test(v) }
const FONT_PRESETS_UI: { key: FontPreset; label: string }[] = [
  { key: 'pretendard', label: '프리텐다드' },
  { key: 'noto-sans-kr', label: '노토산스' },
  { key: 'gowun-dodum', label: '고운돋움' },
  { key: 'nanum-gothic', label: '나눔고딕' },
]
const LAYOUT_PRESETS: { key: LayoutPreset; label: string }[] = [
  { key: 'profile_only', label: '프로필형' },
  { key: 'cover_top', label: '커버 상단' },
  { key: 'cover_profile_overlap', label: '커버+프로필' },
]
const DEFAULT_BLOCK_STYLE: Required<Omit<BlockStyleSetting, 'buttonColor' | 'noticeColor'>> = {
  shape: 'round', shadow: 'medium', align: 'center', fontSize: 'md', animation: 'none', noticeRolling: false,
}
interface Stats { realtime: number; today: number; total: number; blocks: Record<string, number> }
interface Proposal {
  id: string
  campaign_image_url: string | null
  campaign_type: string | null
  brand_name: string | null
  product_name: string | null
  categories: string[] | null
  features: string | null
  start_date: string | null
  end_date: string | null
  reward_type: string | null
  reward_amount: string | null
  proposal_message: string | null
  proposer_name: string | null
  proposer_email: string | null
  proposer_phone: string | null
  status: 'new' | 'read' | 'replied' | 'archived'
  created_at: string
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

type SubTab = 'manage' | 'design' | 'proposals'

export default function MyLinkPage() {
  const [subTab, setSubTab] = useState<SubTab>('manage')

  return (
    <div>
      <style>{`@keyframes rl-spin{to{transform:rotate(360deg)}}.rl-spin{animation:rl-spin .8s linear infinite;display:inline-block}`}</style>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', marginBottom: 6 }}>나만의 링크</h1>
        <p style={{ fontSize: 14, color: T.inkSub }}>나만의 프로필 페이지를 만들고, 비즈니스 제안을 받으세요</p>
      </div>

      <div data-guide="link-subtabs" style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {([['manage', '링크 관리', LayoutGrid], ['design', '디자인', Palette], ['proposals', '제안 관리', Inbox]] as const).map(([key, label, Icon]) => {
          const active = subTab === key
          return (
            <button key={key} type="button" onClick={() => setSubTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
              border: `1.5px solid ${active ? T.brand : T.border}`, background: active ? T.brandSoft : T.white,
              color: active ? T.brand : T.inkSub, fontSize: 13.5, fontWeight: active ? 700 : 600,
            }}>
              <Icon size={15} />{label}
            </button>
          )
        })}
      </div>

      <LinkWorkspace subTab={subTab} />
    </div>
  )
}

/* ---- Proposals Panel ---- */
const STATUS_META: Record<Proposal['status'], { label: string; bg: string; fg: string }> = {
  new: { label: '신규', bg: T.brandSoft, fg: T.brand },
  read: { label: '읽음', bg: T.surface, fg: T.inkSub },
  replied: { label: '회신함', bg: T.greenSoft, fg: T.green },
  archived: { label: '보관', bg: T.skySoft, fg: T.sky },
}

function ProposalsPanel() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Proposal | null>(null)
  const [myHandle, setMyHandle] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/link-page/proposals')
      .then(r => r.json())
      .then((d: { proposals?: Proposal[]; error?: string; handle?: string }) => {
        if (d.error) { setError(d.error); return }
        setProposals(d.proposals || [])
        if (d.handle) setMyHandle(d.handle)
      })
      .catch(() => setError('제안 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/link-page').then(r => r.json()).then((d: { page?: { link_handle?: string } }) => {
      setMyHandle(prev => prev || d.page?.link_handle || null)
    }).catch(() => {})
  }, [])

  const updateStatus = async (id: string, status: Proposal['status']) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    setSelected(prev => prev && prev.id === id ? { ...prev, status } : prev)
    try {
      await fetch(`/api/link-page/proposals/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      })
    } catch { /* next load corrects */ }
  }

  const openDetail = (p: Proposal) => {
    setSelected(p)
    if (p.status === 'new') updateStatus(p.id, 'read')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ ...cardStyle, height: 78, background: T.surface }} />)}
      </div>
    )
  }
  if (error) {
    return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: T.red, fontSize: 13.5 }}>{error}</div>
  }
  if (proposals.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: '52px 24px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: T.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Inbox size={26} color={T.brand} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>아직 받은 제안이 없어요</p>
        <p style={{ fontSize: 13.5, color: T.muted, marginBottom: 18, lineHeight: 1.6 }}>프로필 링크를 SNS에 공유하면<br />브랜드가 직접 협업 제안을 보낼 수 있어요.</p>
        {myHandle && <CopyLinkButton handle={myHandle} />}
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {proposals.map(p => {
          const sm = STATUS_META[p.status]
          return (
            <button key={p.id} type="button" onClick={() => openDetail(p)} style={{
              ...cardStyle, padding: '16px 18px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 14, width: '100%',
              opacity: p.status === 'archived' ? 0.65 : 1,
            }}>
              <div style={{ width: 46, height: 46, borderRadius: 10, background: T.surface, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.campaign_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.campaign_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : <ImageIcon size={20} color={T.muted} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: T.ink }}>{p.brand_name || '브랜드 미입력'}</span>
                  {p.campaign_type && <span style={{ padding: '1px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: T.tealSoft, color: T.teal }}>{p.campaign_type}</span>}
                  {p.status === 'new' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.brand }} />}
                </div>
                <div style={{ fontSize: 13, color: T.inkSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.product_name || '상품명 미입력'}
                  {p.reward_amount ? ` · ${p.reward_amount}` : p.reward_type ? ` · ${p.reward_type}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, background: sm.bg, color: sm.fg }}>{sm.label}</span>
                <span style={{ fontSize: 11.5, color: T.muted }}>{fmtDate(p.created_at)}</span>
              </div>
            </button>
          )
        })}
      </div>
      {selected && <ProposalDetailModal proposal={selected} onClose={() => setSelected(null)} onStatus={updateStatus} />}
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.surface}` }}>
      <span style={{ width: 90, flexShrink: 0, fontSize: 12.5, color: T.muted, fontWeight: 600 }}>{label}</span>
      <span style={{ flex: 1, fontSize: 13.5, color: T.ink, wordBreak: 'break-word' }}>{value || '—'}</span>
    </div>
  )
}

function ProposalDetailModal({ proposal: p, onClose, onStatus }: {
  proposal: Proposal
  onClose: () => void
  onStatus: (id: string, s: Proposal['status']) => void
}) {
  const Row = DetailRow
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ ...cardStyle, borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {p.campaign_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.campaign_image_url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: '18px 18px 0 0', display: 'block' }} />
        )}
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 19, fontWeight: 800, color: T.ink }}>{p.brand_name || '브랜드 미입력'}</span>
                {p.campaign_type && <span style={{ padding: '2px 9px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: T.tealSoft, color: T.teal }}>{p.campaign_type}</span>}
              </div>
              <div style={{ fontSize: 13.5, color: T.inkSub }}>{p.product_name}</div>
            </div>
            <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.muted, padding: 4 }}><X size={19} /></button>
          </div>

          {p.categories && p.categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {p.categories.map(c => <span key={c} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: T.surface, color: T.inkSub }}>{c}</span>)}
            </div>
          )}

          {p.features && (
            <div style={{ background: T.surface, borderRadius: 10, padding: '13px 15px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>캠페인 특징</div>
              <p style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{p.features}</p>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <Row label="일정" value={p.start_date || p.end_date ? `${fmtDate(p.start_date)} ~ ${fmtDate(p.end_date)}` : null} />
            <Row label="보상 형태" value={p.reward_type} />
            <Row label="보상 금액" value={p.reward_amount} />
          </div>

          {p.proposal_message && (
            <div style={{ background: T.brandSoft, borderRadius: 10, padding: '13px 15px', margin: '10px 0 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.brand, marginBottom: 6 }}>제안 내용</div>
              <p style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>{p.proposal_message}</p>
            </div>
          )}

          <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ink, marginBottom: 10 }}>제안자 연락처</div>
            <Row label="이름" value={p.proposer_name} />
            <Row label="이메일" value={p.proposer_email ? <a href={`mailto:${p.proposer_email}`} style={{ color: T.brand, fontWeight: 600 }}>{p.proposer_email}</a> : null} />
            <Row label="연락처" value={p.proposer_phone} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <a href={p.proposer_email ? `mailto:${p.proposer_email}` : undefined}
               onClick={() => p.proposer_email && onStatus(p.id, 'replied')}
               style={{
                 flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                 padding: '12px', borderRadius: 10, background: p.status === 'replied' ? T.green : T.brand,
                 color: '#fff', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', cursor: 'pointer',
               }}>
              {p.status === 'replied' ? <><Check size={15} /> 회신함</> : <><Mail size={15} /> 이메일로 회신</>}
            </a>
            <button type="button" onClick={() => { onStatus(p.id, p.status === 'archived' ? 'read' : 'archived') }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.white, color: T.inkSub, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              <Archive size={15} /> {p.status === 'archived' ? '보관 해제' : '보관'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---- LinkWorkspace ---- */
function normalizeSettings(raw: Partial<PageSettings> & { link_handle?: string }, handle: string | null): PageSettings {
  const bg = (raw.background && typeof raw.background === 'object' ? raw.background : {}) as BackgroundSetting
  const bs = (raw.block_style && typeof raw.block_style === 'object' ? raw.block_style : {}) as BlockStyleSetting
  return {
    handle: handle || raw.handle || raw.link_handle || null,
    display_name: raw.display_name || '',
    bio: raw.bio || '',
    avatar_url: raw.avatar_url || null,
    notice_text: raw.notice_text || '',
    theme_preset: raw.theme_preset || null,
    proposal_enabled: raw.proposal_enabled !== false,
    is_published: !!raw.is_published,
    layout_preset: (raw.layout_preset as LayoutPreset) || 'profile_only',
    font_preset: (raw.font_preset as FontPreset) || 'pretendard',
    sns_links: Array.isArray(raw.sns_links) ? (raw.sns_links as SnsLinkItem[]) : [],
    background: { pageMode: 'theme', ...bg },
    block_style: { ...DEFAULT_BLOCK_STYLE, ...bs },
  }
}

function LinkWorkspace({ subTab }: { subTab: SubTab }) {
  const [settings, setSettings] = useState<PageSettings | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showHandleModal, setShowHandleModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editBlock, setEditBlock] = useState<Block | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [savingTheme, setSavingTheme] = useState(false)

  const loadAll = useCallback(() => {
    fetch('/api/link-page')
      .then(r => r.json())
      .then((d: { page?: Partial<PageSettings> & { link_handle?: string }; blocks?: Block[] }) => {
        const raw = d.page || {}
        setSettings(normalizeSettings(raw, raw.link_handle || null))
        const normalizedBlocks = (d.blocks || []).map(b => ({
          ...b,
          program_items: (b.program_items as ProgramItem[] | undefined)?.map(it => ({
            ...it,
          })),
        }))
        setBlocks(normalizedBlocks.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || a.position - b.position))
      })
      .catch(() => setSettings(s => s || normalizeSettings({}, null)))
      .finally(() => setLoading(false))
  }, [])

  const loadStats = useCallback(() => {
    fetch('/api/link-page/stats')
      .then(r => r.json())
      .then((d: { views?: { realtime?: number; today?: number; total?: number }; blocks?: { block_id: string; clicks: number }[] }) => {
        const blockMap: Record<string, number> = {}
        for (const b of d.blocks || []) blockMap[b.block_id] = b.clicks
        setStats({ realtime: d.views?.realtime || 0, today: d.views?.today || 0, total: d.views?.total || 0, blocks: blockMap })
      })
      .catch(() => {})
  }, [])

  useEffect(() => { loadAll(); loadStats() }, [loadAll, loadStats])

  const patchSettings = async (patch: Record<string, unknown>) => {
    setSettings(s => s ? { ...s, ...patch } as PageSettings : s)
    try {
      await fetch('/api/link-page', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
    } catch { /* no-op */ }
  }

  const patchBlock = async (id: string, patch: Record<string, unknown>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } as Block : b))
    try {
      await fetch(`/api/link-page/blocks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
    } catch { /* no-op */ }
  }

  const deleteBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setMenuOpen(null)
    try { await fetch(`/api/link-page/blocks/${id}`, { method: 'DELETE' }) } catch { /* no-op */ }
  }

  const duplicateBlock = async (b: Block) => {
    setMenuOpen(null)
    try {
      await fetch('/api/link-page/blocks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: b.type, payload: b.payload }),
      })
      loadAll()
    } catch { /* no-op */ }
  }

  const move = async (id: string, dir: -1 | 1) => {
    const visible = blocks
    const idx = visible.findIndex(b => b.id === id)
    const swap = idx + dir
    if (swap < 0 || swap >= visible.length) return
    const next = [...visible]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    const reordered = next.map((b, i) => ({ ...b, position: i }))
    setBlocks(reordered)
    try {
      await fetch('/api/link-page/blocks/reorder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_ids: reordered.map(b => b.id) }),
      })
    } catch { /* no-op */ }
  }

  const copyLink = () => {
    if (!settings?.handle) return
    navigator.clipboard.writeText(`${APP_ORIGIN}/l/${settings.handle}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const selectTheme = async (key: string) => {
    setSavingTheme(true)
    await patchSettings({ theme_preset: key })
    setTimeout(() => setSavingTheme(false), 400)
  }

  if (loading || !settings) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[0, 1, 2].map(i => <div key={i} style={{ ...cardStyle, height: 90, background: T.surface }} />)}</div>
  }

  const hasHandle = !!settings.handle

  const manageColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div data-guide="link-url" style={{ ...cardStyle, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 10 }}>내 프로필 링크</div>
        {hasHandle ? (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, background: T.surface, minWidth: 0 }}>
                <LinkIcon size={15} color={T.brand} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  /l/{settings.handle}
                </span>
              </div>
              <button type="button" onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 15px', borderRadius: 10, border: 'none', background: T.brand, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? '복사됨' : '복사'}
              </button>
              <a href={`/l/${settings.handle}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 15px', borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.white, color: T.inkSub, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                <ExternalLink size={14} /> 미리보기
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
              <button type="button" onClick={() => setShowHandleModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.white, color: T.inkSub, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                <Pencil size={13} /> 링크 변경
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: settings.is_published ? T.green : T.muted }}>
                  {settings.is_published ? '공개 중' : '비공개'}
                </span>
                <Toggle on={settings.is_published} onChange={v => patchSettings({ is_published: v })} />
              </label>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <p style={{ fontSize: 13.5, color: T.inkSub, marginBottom: 14 }}>아직 링크 주소를 만들지 않았어요. 나만의 핸들을 정해보세요.</p>
            <button type="button" onClick={() => setShowHandleModal(true)} style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: T.brand, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              내 링크 만들기
            </button>
          </div>
        )}
      </div>

      <div data-guide="link-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {([['실시간 조회', stats?.realtime, T.brand], ['오늘 조회', stats?.today, T.teal], ['전체 조회', stats?.total, T.ink]] as const).map(([label, val, color]) => (
          <div key={label} style={{ ...cardStyle, padding: 16 }}>
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{(val ?? 0).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.muted, marginTop: -6 }}>
        <BarChart3 size={13} /> 블록별 클릭 수는 아래 블록 목록에서 확인하세요.
      </div>

      <div data-guide="link-blocks" style={{ ...cardStyle, padding: 0, overflow: 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>블록</span>
          <button type="button" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: 'none', background: T.brand, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={14} /> 블록 추가
          </button>
        </div>

        {blocks.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: T.muted, fontSize: 13.5 }}>
            아직 블록이 없어요. &ldquo;블록 추가&rdquo;로 텍스트, 링크, 이미지를 배치해보세요.
          </div>
        ) : (
          <div>
            {blocks.map((b, i) => (
              <BlockRow key={b.id} block={b} clicks={stats?.blocks[b.id] ?? b.clicks ?? 0}
                first={i === 0} last={i === blocks.length - 1}
                menuOpen={menuOpen === b.id} onMenu={() => setMenuOpen(menuOpen === b.id ? null : b.id)}
                onEdit={() => { setEditBlock(b); setMenuOpen(null) }}
                onToggle={v => patchBlock(b.id, { is_active: v })}
                onPin={() => patchBlock(b.id, { is_pinned: !b.is_pinned })}
                onArchive={() => { patchBlock(b.id, { is_archived: true }); setMenuOpen(null) }}
                onDuplicate={() => duplicateBlock(b)}
                onDelete={() => deleteBlock(b.id)}
                onUp={() => move(b.id, -1)} onDown={() => move(b.id, 1)} />
            ))}
          </div>
        )}
      </div>

      {showHandleModal && <HandleModal current={settings.handle} onClose={() => setShowHandleModal(false)} onSaved={h => { setSettings(s => s ? { ...s, handle: h } : s); setShowHandleModal(false) }} />}
      {showAddModal && <AddBlockModal onClose={() => setShowAddModal(false)} onCreated={() => { setShowAddModal(false); loadAll() }} />}
      {editBlock && <BlockEditModal block={editBlock} onClose={() => setEditBlock(null)} onSaved={() => { setEditBlock(null); loadAll() }} />}
    </div>
  )

  const leftColumn =
    subTab === 'design' ? <DesignPanel settings={settings} patchSettings={patchSettings} selectTheme={selectTheme} savingTheme={savingTheme} />
    : subTab === 'proposals' ? <ProposalsPanel />
    : manageColumn

  return (
    <div className="rl-manage-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: 28, alignItems: 'start' }}>
      <div style={{ minWidth: 0 }}>{leftColumn}</div>

      <div data-guide="link-preview" className="rl-preview-col" style={{ position: 'sticky', top: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ExternalLink size={12} /> 실시간 미리보기
        </div>
        <LinkPagePreview settings={settings} blocks={blocks} />
      </div>
      <style>{`
        @media (max-width: 1080px) {
          .rl-manage-grid { grid-template-columns: 1fr !important; }
          .rl-preview-col { display: none; }
        }
      `}</style>
    </div>
  )
}

/* ---- Design Panel ---- */
type DesignSection = 'profile' | 'style' | 'block' | 'settings'
const SNS_PLATFORMS = [
  { value: 'instagram', label: '인스타그램' },
  { value: 'youtube', label: '유튜브' },
  { value: 'tiktok', label: '틱톡' },
  { value: 'blog', label: '블로그' },
  { value: 'threads', label: '스레드' },
  { value: 'other', label: '기타' },
]

function DesignPanel({ settings, patchSettings, selectTheme, savingTheme }: {
  settings: PageSettings
  patchSettings: (patch: Record<string, unknown>) => Promise<void>
  selectTheme: (key: string) => void
  savingTheme: boolean
}) {
  const [section, setSection] = useState<DesignSection>('profile')
  const [displayName, setDisplayName] = useState(settings.display_name)
  const [bio, setBio] = useState(settings.bio)
  const [notice, setNotice] = useState(settings.notice_text)
  const [sns, setSns] = useState<SnsLinkItem[]>(settings.sns_links || [])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const bs = settings.block_style || DEFAULT_BLOCK_STYLE
  const bg = settings.background || { pageMode: 'theme' as const }

  const debouncedSave = (key: string, value: unknown) => {
    if (timers.current[key]) clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => { patchSettings({ [key]: value }) }, 400)
  }
  useEffect(() => {
    const t = timers.current
    return () => { Object.values(t).forEach(timer => clearTimeout(timer)) }
  }, [])

  const patchBg = (partial: Partial<BackgroundSetting>) => patchSettings({ background: { ...bg, ...partial } })
  const patchBs = (partial: Partial<BlockStyleSetting>) => patchSettings({ block_style: { ...bs, ...partial } })

  const buttonColor = settings.block_style.buttonColor
  const [btnColorText, setBtnColorText] = useState(settings.block_style.buttonColor || '')
  const applyButtonColor = (hex: string | undefined) => {
    setBtnColorText(hex || '')
    patchBs({ buttonColor: hex })
  }
  const onHexInput = (value: string) => {
    setBtnColorText(value)
    if (timers.current.buttonColor) clearTimeout(timers.current.buttonColor)
    timers.current.buttonColor = setTimeout(() => {
      const t = value.trim()
      if (!t) patchBs({ buttonColor: undefined })
      else if (isHexColor(t)) patchBs({ buttonColor: t })
    }, 400)
  }

  const noticeColor = settings.block_style.noticeColor
  const [noticeColorText, setNoticeColorText] = useState(settings.block_style.noticeColor || '')
  const applyNoticeColor = (hex: string | undefined) => {
    setNoticeColorText(hex || '')
    patchBs({ noticeColor: hex })
  }
  const onNoticeHexInput = (value: string) => {
    setNoticeColorText(value)
    if (timers.current.noticeColor) clearTimeout(timers.current.noticeColor)
    timers.current.noticeColor = setTimeout(() => {
      const t = value.trim()
      if (!t) patchBs({ noticeColor: undefined })
      else if (isHexColor(t)) patchBs({ noticeColor: t })
    }, 400)
  }

  const saveSns = (next: SnsLinkItem[]) => {
    setSns(next)
    debouncedSave('sns_links', next.filter(s => (s.url || '').trim()))
  }
  const addSns = () => saveSns([...sns, { platform: 'instagram', url: '' }])
  const updateSns = (i: number, field: keyof SnsLinkItem, value: string) =>
    saveSns(sns.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  const removeSns = (i: number) => saveSns(sns.filter((_, idx) => idx !== i))

  const NAV: { key: DesignSection; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: '프로필', icon: User },
    { key: 'style', label: '스타일', icon: Palette },
    { key: 'block', label: '블록', icon: LayoutGrid },
    { key: 'settings', label: '설정', icon: Settings },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 6, padding: 5, borderRadius: 12, background: T.surface, border: `1px solid ${T.border}` }}>
        {NAV.map(n => {
          const active = section === n.key
          return (
            <button key={n.key} type="button" onClick={() => setSection(n.key)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 6px',
              borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 600,
              background: active ? T.white : 'transparent', color: active ? T.brand : T.inkSub,
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
              <n.icon size={14} /> {n.label}
            </button>
          )
        })}
      </div>

      {section === 'profile' && (
        <div style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={designLabel}>레이아웃</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {LAYOUT_PRESETS.map(lp => {
                const active = settings.layout_preset === lp.key
                return (
                  <button key={lp.key} type="button" onClick={() => patchSettings({ layout_preset: lp.key })} style={{
                    flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${active ? T.brand : T.border}`, background: active ? T.brandSoft : T.white,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                  }}>
                    <LayoutThumb preset={lp.key} />
                    <span style={{ fontSize: 11.5, fontWeight: active ? 700 : 600, color: active ? T.brand : T.inkSub }}>{lp.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={designLabel}>프로필 사진</label>
            <ImageUploadField round value={settings.avatar_url || ''} onChange={url => patchSettings({ avatar_url: url || null })} />
          </div>

          <div>
            <label style={designLabel}>커버 이미지 (선택)</label>
            <ImageUploadField value={bg.coverImageUrl || ''} onChange={url => patchBg({ coverImageUrl: url || null })} wide />
            <p style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>커버 상단 / 커버+프로필 레이아웃에서 상단 배너로 표시됩니다.</p>
          </div>

          <div>
            <label style={designLabel}>표시 이름</label>
            <input value={displayName} onChange={e => { setDisplayName(e.target.value); debouncedSave('display_name', e.target.value) }}
              placeholder="공개 페이지에 표시할 이름" maxLength={40} style={modalInput} />
          </div>

          <div>
            <label style={designLabel}>소개</label>
            <textarea value={bio} onChange={e => { setBio(e.target.value); debouncedSave('bio', e.target.value) }}
              placeholder="나를 한두 문장으로 소개해보세요." rows={3} maxLength={200} style={{ ...modalInput, resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ ...designLabel, marginBottom: 0 }}>SNS 링크</label>
              <button type="button" onClick={addSns} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.white, color: T.brand, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={12} /> 추가
              </button>
            </div>
            {sns.length === 0 ? (
              <p style={{ fontSize: 12, color: T.muted, padding: '8px 0' }}>인스타, 유튜브 등 SNS 프로필 아이콘을 상단에 노출합니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sns.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select value={s.platform} onChange={e => updateSns(i, 'platform', e.target.value)} style={{ ...modalInput, width: 108, flexShrink: 0, padding: '9px 8px' }}>
                      {SNS_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <input value={s.url} onChange={e => updateSns(i, 'url', e.target.value)} placeholder="https://..." style={{ ...modalInput, flex: 1, minWidth: 0 }} />
                    <button type="button" onClick={() => removeSns(i)} style={{ flexShrink: 0, border: `1px solid ${T.border}`, background: T.white, borderRadius: 7, padding: '8px', cursor: 'pointer', color: T.red, display: 'flex' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={designLabel}>정렬</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['left', '왼쪽', AlignLeft], ['center', '가운데', AlignCenter]] as const).map(([val, label, Icon]) => {
                const active = (bs.align || 'center') === val
                return (
                  <button key={val} type="button" onClick={() => patchBs({ align: val })} style={segBtn(active)}>
                    <Icon size={14} /> {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={designLabel}>글꼴 크기</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['sm', '작게'], ['md', '보통'], ['lg', '크게']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => patchBs({ fontSize: val })} style={segBtn((bs.fontSize || 'md') === val)}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={designLabel}>한줄 공지 (선택)</label>
            <input value={notice} onChange={e => { setNotice(e.target.value); debouncedSave('notice_text', e.target.value) }}
              placeholder="예: 이번 주 새 소식!" maxLength={60} style={modalInput} />
          </div>
        </div>
      )}

      {section === 'style' && (
        <div style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <label style={{ ...designLabel, marginBottom: 0 }}>테마</label>
              {savingTheme && <Loader2 size={13} className="rl-spin" color={T.muted} />}
              <button type="button" onClick={() => selectTheme(THEME_PRESETS[Math.floor(Math.random() * THEME_PRESETS.length)].key)}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.white, color: T.inkSub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Shuffle size={12} /> 운명에 맡기기
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {THEME_PRESETS.map(theme => {
                const active = (settings.theme_preset || THEME_PRESETS[0].key) === theme.key
                return (
                  <button key={theme.key} type="button" onClick={() => selectTheme(theme.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${active ? T.brand : T.border}`, background: active ? T.brandSoft : T.white,
                  }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: theme.pageBg, border: `1px solid ${T.border}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? T.brand : T.inkSub }}>{theme.label}</span>
                    {active && <Check size={14} color={T.brand} style={{ marginLeft: 'auto' }} />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={designLabel}>배경</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {([['theme', '테마 기본'], ['solid', '단색'], ['gradient', '그라디언트']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => patchBg({ pageMode: val })} style={segBtn((bg.pageMode || 'theme') === val)}>{label}</button>
              ))}
            </div>

            {bg.pageMode === 'solid' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {SOLID_COLORS.map(c => {
                  const active = bg.color === c
                  return (
                    <button key={c} type="button" onClick={() => patchBg({ color: c })} title={c} style={{
                      aspectRatio: '1 / 1', borderRadius: 9, cursor: 'pointer', background: c,
                      border: `2px solid ${active ? T.brand : T.border}`, position: 'relative',
                    }}>
                      {active && <Check size={13} color={/^#(F|E|D|C)/i.test(c) ? T.ink : '#fff'} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />}
                    </button>
                  )
                })}
              </div>
            )}

            {bg.pageMode === 'gradient' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {GRADIENT_PRESETS.map(g => {
                  const active = bg.gradientKey === g.key
                  return (
                    <button key={g.key} type="button" onClick={() => patchBg({ gradientKey: g.key })} title={g.label} style={{
                      aspectRatio: '1 / 1', borderRadius: 9, cursor: 'pointer', background: g.css,
                      border: `2px solid ${active ? T.brand : T.border}`, position: 'relative',
                    }}>
                      {active && <Check size={13} color="#fff" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label style={designLabel}>폰트</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {FONT_PRESETS_UI.map(f => (
                <button key={f.key} type="button" onClick={() => patchSettings({ font_preset: f.key })} style={segBtn(settings.font_preset === f.key)}>{f.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={designLabel}>버튼 색상</label>
            <p style={{ fontSize: 11, color: T.muted, margin: '-4px 0 10px', lineHeight: 1.5 }}>
              비즈니스 제안 버튼의 색을 정합니다. &ldquo;테마 기본&rdquo;은 선택한 테마의 강조색을 그대로 사용합니다.
            </p>

            <button type="button" onClick={() => applyButtonColor(undefined)} style={{ ...segBtn(!buttonColor), width: '100%', marginBottom: 10 }}>
              테마 기본
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 10 }}>
              {BUTTON_COLORS.map(c => {
                const active = (buttonColor || '').toLowerCase() === c.toLowerCase()
                return (
                  <button key={c} type="button" onClick={() => applyButtonColor(c)} title={c} style={{
                    aspectRatio: '1 / 1', borderRadius: 9, cursor: 'pointer', background: c,
                    border: `2px solid ${active ? T.brand : T.border}`, position: 'relative',
                  }}>
                    {active && <Check size={13} color="#fff" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ position: 'relative', width: 42, height: 42, flexShrink: 0, borderRadius: 9, border: `1.5px solid ${T.border}`, cursor: 'pointer', overflow: 'hidden', background: isHexColor(buttonColor) ? buttonColor : T.surface }}>
                <input type="color" value={isHexColor(buttonColor) && buttonColor.length === 7 ? buttonColor : '#0066cc'}
                  onChange={e => applyButtonColor(e.target.value)}
                  style={{ position: 'absolute', inset: -6, width: '160%', height: '160%', border: 'none', padding: 0, cursor: 'pointer', opacity: 0 }} />
              </label>
              <input value={btnColorText} onChange={e => onHexInput(e.target.value)}
                placeholder="직접 입력 (예: #0066cc)" maxLength={7} style={{ ...modalInput, flex: 1, minWidth: 0 }} />
            </div>
          </div>
        </div>
      )}

      {section === 'block' && (
        <div style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={designLabel}>모양</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['round', '둥글게', 16], ['soft', '약간', 10], ['square', '각지게', 4]] as const).map(([val, label, r]) => {
                const active = (bs.shape || 'round') === val
                return (
                  <button key={val} type="button" onClick={() => patchBs({ shape: val })} style={{ ...segBtn(active), flexDirection: 'column', gap: 7, padding: '11px 6px' }}>
                    <span style={{ width: '80%', height: 16, background: active ? T.brand : T.border, borderRadius: r }} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={designLabel}>그림자</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {([['none', '없음'], ['soft', '약하게'], ['medium', '보통'], ['strong', '강하게']] as const).map(([val, label]) => {
                const active = (bs.shadow || 'medium') === val
                return (
                  <button key={val} type="button" onClick={() => patchBs({ shadow: val })} style={{ ...segBtn(active), flexDirection: 'column', gap: 8, padding: '11px 4px' }}>
                    <span style={{ width: 22, height: 14, background: T.white, borderRadius: 4, border: `1px solid ${T.border}`, boxShadow: BLOCK_SHADOWS[val] }} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={designLabel}>애니메이션</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['none', '없음'], ['wave', '물결'], ['bounce', '바운스']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => patchBs({ animation: val })} style={segBtn((bs.animation || 'none') === val)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'settings' && (
        <div style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: T.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Sparkles size={15} color={T.brand} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>한줄공지 롤링</div>
                <div style={{ fontSize: 12, color: T.muted }}>한줄 공지를 좌에서 우로 흐르게 표시합니다</div>
              </div>
            </div>
            <Toggle on={!!bs.noticeRolling} onChange={v => patchBs({ noticeRolling: v })} />
          </div>

          {bs.noticeRolling && (
            <div style={{ padding: '14px 16px', borderRadius: 12, background: T.surface }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>한줄공지 색상</div>
              <p style={{ fontSize: 11, color: T.muted, margin: '0 0 10px', lineHeight: 1.5 }}>
                최상단 롤링 배너의 배경색을 정합니다. &ldquo;테마 기본&rdquo;은 선택한 테마의 강조색을 그대로 사용합니다.
              </p>

              <button type="button" onClick={() => applyNoticeColor(undefined)} style={{ ...segBtn(!noticeColor), width: '100%', marginBottom: 10 }}>
                테마 기본
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 10 }}>
                {BUTTON_COLORS.map(c => {
                  const active = (noticeColor || '').toLowerCase() === c.toLowerCase()
                  return (
                    <button key={c} type="button" onClick={() => applyNoticeColor(c)} title={c} style={{
                      aspectRatio: '1 / 1', borderRadius: 9, cursor: 'pointer', background: c,
                      border: `2px solid ${active ? T.brand : T.border}`, position: 'relative',
                    }}>
                      {active && <Check size={13} color="#fff" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ position: 'relative', width: 42, height: 42, flexShrink: 0, borderRadius: 9, border: `1.5px solid ${T.border}`, cursor: 'pointer', overflow: 'hidden', background: isHexColor(noticeColor) ? noticeColor : T.white }}>
                  <input type="color" value={isHexColor(noticeColor) && noticeColor.length === 7 ? noticeColor : '#0066cc'}
                    onChange={e => applyNoticeColor(e.target.value)}
                    style={{ position: 'absolute', inset: -6, width: '160%', height: '160%', border: 'none', padding: 0, cursor: 'pointer', opacity: 0 }} />
                </label>
                <input value={noticeColorText} onChange={e => onNoticeHexInput(e.target.value)}
                  placeholder="직접 입력 (예: #0066cc)" maxLength={7} style={{ ...modalInput, flex: 1, minWidth: 0 }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: T.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Send size={15} color={T.teal} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>비즈니스 제안 버튼</div>
                <div style={{ fontSize: 12, color: T.muted }}>공개 페이지에 제안 받기 버튼을 노출합니다</div>
              </div>
            </div>
            <Toggle on={settings.proposal_enabled} onChange={v => patchSettings({ proposal_enabled: v })} />
          </div>
        </div>
      )}
    </div>
  )
}

function LayoutThumb({ preset }: { preset: LayoutPreset }) {
  const box: React.CSSProperties = { width: 40, height: 30, borderRadius: 5, border: `1px solid ${T.border}`, background: T.white, position: 'relative', overflow: 'hidden' }
  const dot: React.CSSProperties = { width: 9, height: 9, borderRadius: '50%', background: T.brand, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }
  const bar: React.CSSProperties = { position: 'absolute', left: 6, right: 6, height: 4, borderRadius: 2, background: T.border }
  if (preset === 'cover_top') {
    return <div style={box}><div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 11, background: T.brandSoft }} /><div style={{ ...dot, top: 13 }} /><div style={{ ...bar, bottom: 4 }} /></div>
  }
  if (preset === 'cover_profile_overlap') {
    return <div style={box}><div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 14, background: T.brandSoft }} /><div style={{ ...dot, top: 9, border: '2px solid #fff' }} /><div style={{ ...bar, bottom: 4 }} /></div>
  }
  return <div style={box}><div style={{ ...dot, top: 5 }} /><div style={{ ...bar, top: 18 }} /></div>
}

/* ---- Live Preview ---- */
function toProfileData(settings: PageSettings, blocks: Block[]): ProfileData & Record<string, unknown> {
  const visible = blocks.filter(b => b.is_active && !b.is_archived)
  const publicBlocks: PublicBlock[] = visible.map(b => {
    const programs: ProgramCard[] = b.type === 'program_collection'
      ? (b.program_items || []).filter(it => it.is_active).map(it => ({
          itemId: it.id || it.program_id,
          programId: it.program_id,
          name: it.programName || '프로그램',
          logoUrl: it.logoUrl ?? null,
          codeOnly: !!it.codeOnly,
          code: it.referralCode || '',
          url: it.url || '',
          customTitle: it.custom_title || null,
          customCta: it.custom_cta || null,
        }))
      : []
    return { id: b.id, type: b.type, payload: b.payload || {}, programs }
  })

  return {
    handle: settings.handle || 'preview',
    partnerName: settings.display_name || '',
    displayName: settings.display_name || '이름을 입력해주세요',
    bio: settings.bio || '',
    avatarUrl: settings.avatar_url,
    snsLinks: settings.sns_links || [],
    noticeText: settings.notice_text || '',
    proposalEnabled: settings.proposal_enabled,
    themePreset: settings.theme_preset,
    blockStyle: (settings.block_style || {}) as Record<string, unknown>,
    blocks: publicBlocks,
    layoutPreset: settings.layout_preset,
    background: (settings.background || {}) as Record<string, unknown>,
    fontPreset: settings.font_preset,
  }
}

function LinkPagePreview({ settings, blocks }: { settings: PageSettings; blocks: Block[] }) {
  const data = useMemo(() => toProfileData(settings, blocks), [settings, blocks])
  return (
    <div style={{
      width: 390, height: 780, borderRadius: 40, border: `9px solid ${T.ink}`, background: T.ink,
      boxShadow: '0 16px 40px rgba(0,0,0,0.2)', overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
        <ProfileView data={data} previewMode />
      </div>
    </div>
  )
}

/* ---- Block Row ---- */
const BLOCK_ICON: Record<Block['type'], React.ElementType> = {
  text: Type, link: LinkIcon, image: ImageIcon, program_collection: LayoutGrid,
  collection: Grid3x3, calendar: Calendar, divider: Minus,
}
const BLOCK_LABEL: Record<Block['type'], string> = {
  text: '텍스트', link: '링크', image: '이미지', program_collection: '제휴 프로그램 모음',
  collection: '컬렉션', calendar: '캘린더', divider: '구분선',
}

const DIVIDER_STYLES: { key: string; label: string }[] = [
  { key: 'blank', label: '공백' },
  { key: 'dotted', label: '점선' },
  { key: 'solid', label: '실선' },
  { key: 'dots', label: '포인트' },
  { key: 'zigzag', label: '지그재그' },
]

function DividerPreview({ style }: { style: string }) {
  if (style === 'blank') return <span style={{ fontSize: 11, color: T.muted }}>표시 없음</span>
  if (style === 'dots') return (
    <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: T.inkSub }} />)}
    </span>
  )
  if (style === 'zigzag') return (
    <svg width="52" height="8" viewBox="0 0 52 8" style={{ display: 'block' }} aria-hidden>
      <polyline points="0,7 6,1 12,7 18,1 24,7 30,1 36,7 42,1 48,7" fill="none" stroke={T.inkSub} strokeWidth="1.5" />
    </svg>
  )
  const border = style === 'dotted' ? '2px dashed' : '2px solid'
  return <span style={{ width: '100%', borderTop: `${border} ${T.inkSub}` }} />
}

function toDatetimeLocal(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromDatetimeLocal(v: string): string {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

function BlockRow({ block: b, clicks, first, last, menuOpen, onMenu, onEdit, onToggle, onPin, onArchive, onDuplicate, onDelete, onUp, onDown }: {
  block: Block; clicks: number; first: boolean; last: boolean; menuOpen: boolean
  onMenu: () => void; onEdit: () => void; onToggle: (v: boolean) => void; onPin: () => void
  onArchive: () => void; onDuplicate: () => void; onDelete: () => void; onUp: () => void; onDown: () => void
}) {
  const Icon = BLOCK_ICON[b.type]
  const title = blockTitle(b)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${T.surface}`, opacity: b.is_active ? 1 : 0.55, position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button type="button" onClick={onUp} disabled={first} style={arrowBtn(first)}><ChevronUp size={14} /></button>
        <button type="button" onClick={onDown} disabled={last} style={arrowBtn(last)}><ChevronDown size={14} /></button>
      </div>
      <button type="button" onClick={onPin} title={b.is_pinned ? '고정 해제' : '상단 고정'} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: b.is_pinned ? T.brand : T.border }}>
        <Pin size={16} fill={b.is_pinned ? T.brand : 'none'} />
      </button>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={T.inkSub} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11.5, color: T.muted }}>{BLOCK_LABEL[b.type]}</span>
          <span style={{ fontSize: 11.5, color: T.teal, fontWeight: 600 }}>클릭 {clicks.toLocaleString()}</span>
        </div>
      </div>
      <Toggle on={b.is_active} onChange={onToggle} />
      <button type="button" onClick={onEdit} title="편집" style={{ border: `1px solid ${T.border}`, background: T.white, borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: T.inkSub, display: 'flex' }}>
        <Pencil size={14} />
      </button>
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={onMenu} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: T.muted, display: 'flex' }}>
          <MoreVertical size={17} />
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: 30, zIndex: 20, background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4, minWidth: 130 }}>
            {[
              { label: '복제', icon: Duplicate, action: onDuplicate, color: T.inkSub },
              { label: '보관', icon: Archive, action: onArchive, color: T.inkSub },
              { label: '삭제', icon: Trash2, action: onDelete, color: T.red },
            ].map(m => (
              <button key={m.label} type="button" onClick={m.action} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 11px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: m.color, borderRadius: 7 }}>
                <m.icon size={14} /> {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function blockTitle(b: Block): string {
  const p = b.payload || {}
  if (b.type === 'text') return (p.content as string)?.slice(0, 40) || '(빈 텍스트)'
  if (b.type === 'link') return (p.title as string) || (p.url as string) || '(제목 없음)'
  if (b.type === 'image') return (p.alt as string) || '이미지'
  if (b.type === 'program_collection') {
    const n = b.program_items?.length ?? 0
    return `${(p.title as string) || '제휴 프로그램'} (${n}개)`
  }
  if (b.type === 'collection') {
    const n = ((p.items as unknown[]) || []).length
    return `${(p.title as string) || '컬렉션'} (${n}개)`
  }
  if (b.type === 'calendar') {
    const n = ((p.events as unknown[]) || []).length
    return `${(p.title as string) || '캘린더'} (${n}개 일정)`
  }
  if (b.type === 'divider') {
    const key = (p.style as string) || 'solid'
    return `구분선 · ${DIVIDER_STYLES.find(s => s.key === key)?.label || key}`
  }
  return '블록'
}

const arrowBtn = (disabled: boolean): React.CSSProperties => ({
  border: `1px solid ${T.border}`, background: T.white, borderRadius: 5, padding: '1px 3px',
  cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? T.border : T.muted, display: 'flex',
})

/* ---- Toggle ---- */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} aria-pressed={on} style={{
      width: 40, height: 23, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
      background: on ? T.brand : T.border, position: 'relative', transition: 'background 150ms',
    }}>
      <span style={{ position: 'absolute', top: 2.5, left: on ? 20 : 2.5, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

function CopyLinkButton({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(`${APP_ORIGIN}/l/${handle}`); setCopied(true); setTimeout(() => setCopied(false), 1600) }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: `1.5px solid ${T.brand}`, background: T.white, color: T.brand, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
      {copied ? <Check size={15} /> : <Copy size={15} />}{copied ? '복사됨' : '내 링크 복사'}
    </button>
  )
}

/* ---- Modals ---- */
function ModalShell({ title, onClose, children, maxWidth = 440 }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ ...cardStyle, borderRadius: 18, width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: T.ink }}>{title}</span>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.muted, padding: 4 }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const modalInput: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: T.ink,
}
const modalLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: T.inkSub, display: 'block', marginBottom: 6 }
const designLabel: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: T.ink, display: 'block', marginBottom: 8 }
const segBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 8px',
  borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: active ? 700 : 600,
  border: `1.5px solid ${active ? T.brand : T.border}`, background: active ? T.brandSoft : T.white, color: active ? T.brand : T.inkSub,
})

/* ---- Image Upload ---- */
function ImageUploadField({ value, onChange, round = false, wide = false }: { value: string; onChange: (url: string) => void; round?: boolean; wide?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = () => inputRef.current?.click()

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('JPG, PNG, WEBP 형식만 업로드할 수 있어요.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('이미지는 20MB 이하만 업로드할 수 있어요.')
      return
    }
    setError(null)
    void doUpload(file)
  }

  const doUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/link-page/upload', { method: 'POST', body: formData })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((json as { error?: string }).error || '업로드에 실패했어요.')
        return
      }
      onChange((json as { url: string }).url)
    } catch {
      setError('네트워크 오류로 업로드하지 못했어요.')
    } finally {
      setUploading(false)
    }
  }

  if (round) {
    return (
      <div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={onFile} style={{ display: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" onClick={pick} disabled={uploading} style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', padding: 0, cursor: uploading ? 'wait' : 'pointer',
            border: `1.5px ${value ? 'solid' : 'dashed'} ${T.border}`, background: T.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted,
          }}>
            {uploading ? <Loader2 size={18} className="rl-spin" /> : value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : <ImageIcon size={20} />}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={pick} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.white, color: T.inkSub, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {uploading ? <Loader2 size={12} className="rl-spin" /> : <Pencil size={12} />} {value ? '변경' : '업로드'}
              </button>
              {value && (
                <button type="button" onClick={() => onChange('')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.white, color: T.red, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <X size={12} /> 제거
                </button>
              )}
            </div>
            <span style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>정사각형 · JPG · PNG · WEBP · 20MB 이하</span>
          </div>
        </div>
        {error && <div style={{ padding: '8px 10px', borderRadius: 7, background: T.redSoft, color: T.red, fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>
    )
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={onFile} style={{ display: 'none' }} />
      {value ? (
        <div style={{ position: 'relative', width: '100%', maxWidth: wide ? '100%' : 220 }}>
          <div style={{ width: '100%', aspectRatio: wide ? '1800 / 720' : '1 / 1', borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.surface }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button type="button" onClick={pick} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.white, color: T.inkSub, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {uploading ? <Loader2 size={12} className="rl-spin" /> : <Pencil size={12} />} 변경
            </button>
            <button type="button" onClick={() => onChange('')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.white, color: T.red, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <X size={12} /> 제거
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={pick} disabled={uploading} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', height: wide ? 96 : 120, borderRadius: 12, border: `1.5px dashed ${T.border}`, background: T.surface,
          cursor: uploading ? 'wait' : 'pointer', color: T.muted,
        }}>
          {uploading ? <Loader2 size={20} className="rl-spin" /> : <ImageIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: T.inkSub }}>{uploading ? '업로드 중...' : '이미지 업로드'}</span>
        </button>
      )}
      <p style={{ fontSize: 11.5, color: T.muted, marginTop: 7, lineHeight: 1.5 }}>
        {wide ? '권장 크기 1800x720px (2.5:1)' : '정사각형(1:1) 권장'} · JPG · PNG · WEBP · 20MB 이하
      </p>
      {error && <div style={{ padding: '8px 10px', borderRadius: 7, background: T.redSoft, color: T.red, fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  )
}

/* ---- Handle Modal ---- */
function HandleModal({ current, onClose, onSaved }: { current: string | null; onClose: () => void; onSaved: (h: string) => void }) {
  const [value, setValue] = useState(current || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = /^[a-zA-Z0-9._]{3,30}$/.test(value)

  const save = async () => {
    if (!valid) { setError('영문/숫자/./_ 조합 3~30자로 입력해주세요.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/link-page', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link_handle: value.toLowerCase() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError((json as { error?: string }).error || '이미 사용 중이거나 사용할 수 없는 주소예요.'); return }
      onSaved(value.toLowerCase())
    } catch { setError('저장에 실패했어요.') } finally { setSaving(false) }
  }

  return (
    <ModalShell title={current ? '링크 변경' : '내 링크 만들기'} onClose={onClose}>
      <label style={modalLabel}>링크 주소 (핸들)</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: T.muted, whiteSpace: 'nowrap' }}>/l/</span>
        <input value={value} onChange={e => setValue(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))} placeholder="myhandle" maxLength={30} style={modalInput} autoFocus />
      </div>
      {current && (
        <div style={{ display: 'flex', gap: 8, padding: '11px 13px', borderRadius: 9, background: T.amberSoft, marginTop: 14 }}>
          <AlertTriangle size={16} color={T.amber} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: T.amber, lineHeight: 1.55 }}>변경 후 기존 주소(<b>/{current}</b>)는 더 이상 열리지 않습니다.</span>
        </div>
      )}
      {error && <div style={{ padding: '9px 12px', borderRadius: 8, background: T.redSoft, color: T.red, fontSize: 12.5, marginTop: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" onClick={onClose} style={btnGhost}>취소</button>
        <button type="button" onClick={save} disabled={saving || !valid} style={{ ...btnPrimary, opacity: saving || !valid ? 0.6 : 1 }}>{saving ? '저장 중...' : '저장'}</button>
      </div>
    </ModalShell>
  )
}

/* ---- Add Block Modal ---- */
const BLOCK_TYPES: { type: Block['type']; label: string; desc: string; icon: React.ElementType }[] = [
  { type: 'link', label: '링크', desc: '외부 URL 버튼 (스타일 4종)', icon: LinkIcon },
  { type: 'text', label: '텍스트', desc: '소개/공지 등 자유 텍스트', icon: Type },
  { type: 'image', label: '이미지', desc: '이미지 배너 (링크 연결 가능)', icon: ImageIcon },
  { type: 'collection', label: '컬렉션', desc: '이미지 카드를 그리드로 (2/3열)', icon: Grid3x3 },
  { type: 'calendar', label: '캘린더', desc: '이벤트 일정을 리스트/달력으로', icon: Calendar },
  { type: 'divider', label: '구분선', desc: '블록 사이 여백/구분선', icon: Minus },
]

function AddBlockModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [creating, setCreating] = useState<string | null>(null)
  const create = async (type: Block['type']) => {
    setCreating(type)
    try {
      await fetch('/api/link-page/blocks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, payload: {} }),
      })
      onCreated()
    } catch { setCreating(null) }
  }
  return (
    <ModalShell title="블록 추가" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {BLOCK_TYPES.map(bt => (
          <button key={bt.type} type="button" onClick={() => create(bt.type)} disabled={!!creating} style={{
            display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
            border: `1.5px solid ${T.border}`, background: T.white, textAlign: 'left',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <bt.icon size={19} color={T.inkSub} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: T.ink }}>{bt.label}</div>
              <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{bt.desc}</div>
            </div>
            {creating === bt.type && <Loader2 size={16} className="rl-spin" color={T.muted} />}
          </button>
        ))}
      </div>
    </ModalShell>
  )
}

/* ---- Block Edit Modal ---- */
function BlockEditModal({ block, onClose, onSaved }: { block: Block; onClose: () => void; onSaved: () => void }) {
  const [payload, setPayload] = useState<Record<string, unknown>>(block.payload || {})
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: unknown) => setPayload(p => ({ ...p, [k]: v }))

  type CollItem = { id: string; image_url: string; title: string; description: string; url: string; is_active: boolean; position: number }
  const collItems = (payload.items as CollItem[] | undefined) || []
  const setCollItems = (next: CollItem[]) => set('items', next.map((it, i) => ({ ...it, position: i })))
  const addCollItem = () => setCollItems([...collItems, { id: crypto.randomUUID(), image_url: '', title: '', description: '', url: '', is_active: true, position: collItems.length }])
  const updateCollItem = (id: string, patch: Partial<CollItem>) => setCollItems(collItems.map(it => it.id === id ? { ...it, ...patch } : it))
  const removeCollItem = (id: string) => setCollItems(collItems.filter(it => it.id !== id))
  const moveCollItem = (idx: number, dir: -1 | 1) => {
    const swap = idx + dir
    if (swap < 0 || swap >= collItems.length) return
    const next = [...collItems]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setCollItems(next)
  }

  type CalEvent = { id: string; start_at: string; end_at: string; name: string; url: string }
  const calEvents = (payload.events as CalEvent[] | undefined) || []
  const setCalEvents = (next: CalEvent[]) => set('events', next)
  const addCalEvent = () => setCalEvents([...calEvents, { id: crypto.randomUUID(), start_at: '', end_at: '', name: '', url: '' }])
  const updateCalEvent = (id: string, patch: Partial<CalEvent>) => setCalEvents(calEvents.map(ev => ev.id === id ? { ...ev, ...patch } : ev))
  const removeCalEvent = (id: string) => setCalEvents(calEvents.filter(ev => ev.id !== id))

  const save = async () => {
    setSaving(true)
    const body: Record<string, unknown> = { payload }
    try {
      await fetch(`/api/link-page/blocks/${block.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      onSaved()
    } catch { setSaving(false) }
  }

  return (
    <ModalShell title={`${BLOCK_LABEL[block.type]} 편집`} onClose={onClose} maxWidth={block.type === 'collection' || block.type === 'calendar' ? 500 : 440}>
      {block.type === 'text' && (
        <div>
          <label style={modalLabel}>내용</label>
          <textarea value={(payload.content as string) || ''} onChange={e => set('content', e.target.value)} rows={5} placeholder="소개, 공지 등 자유롭게 작성하세요." style={{ ...modalInput, resize: 'vertical', lineHeight: 1.6 }} />
        </div>
      )}

      {block.type === 'image' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={modalLabel}>이미지</label>
            <ImageUploadField value={(payload.image_url as string) || ''} onChange={url => set('image_url', url)} />
          </div>
          <div>
            <label style={modalLabel}>대체 텍스트</label>
            <input value={(payload.alt as string) || ''} onChange={e => set('alt', e.target.value)} placeholder="이미지 설명" style={modalInput} />
          </div>
          <div>
            <label style={modalLabel}>연결 링크 (선택)</label>
            <input value={(payload.url as string) || ''} onChange={e => set('url', e.target.value)} placeholder="클릭 시 이동할 URL" style={modalInput} />
          </div>
        </div>
      )}

      {block.type === 'link' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={modalLabel}>스타일</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {(Object.keys(LINK_STYLE_LABELS) as LinkBlockStyle[]).map(s => {
                const active = ((payload.style as string) || 'simple') === s
                return (
                  <button key={s} type="button" onClick={() => set('style', s)} style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                    border: `1.5px solid ${active ? T.brand : T.border}`, background: active ? T.brand : T.white, color: active ? '#fff' : T.inkSub,
                  }}>{LINK_STYLE_LABELS[s]}</button>
                )
              })}
            </div>
          </div>
          <div>
            <label style={modalLabel}>연결할 주소 (URL)</label>
            <input value={(payload.url as string) || ''} onChange={e => set('url', e.target.value)} placeholder="https://..." style={modalInput} />
          </div>
          <div>
            <label style={modalLabel}>타이틀</label>
            <input value={(payload.title as string) || ''} onChange={e => set('title', e.target.value)} placeholder="버튼에 표시할 이름" style={modalInput} />
          </div>
          <div>
            <label style={modalLabel}>이미지 (썸네일/카드/배경 스타일)</label>
            <ImageUploadField value={(payload.image_url as string) || ''} onChange={url => set('image_url', url)} />
          </div>
        </div>
      )}

      {block.type === 'program_collection' && (
        <div style={{ padding: 24, textAlign: 'center', fontSize: 13.5, color: T.muted }}>준비 중인 기능입니다.</div>
      )}

      {block.type === 'collection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={modalLabel}>블록 제목</label>
            <input value={(payload.title as string) || ''} onChange={e => set('title', e.target.value)} placeholder="예: 인기 서비스 모음" style={modalInput} />
          </div>
          <div>
            <label style={modalLabel}>그리드 스타일</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['grid2', '2열'], ['grid3', '3열']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('style', val)} style={segBtn(((payload.style as string) || 'grid2') === val)}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={modalLabel}>아이템</label>
            {collItems.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', fontSize: 12.5, color: T.muted, background: T.surface, borderRadius: 10 }}>
                아직 아이템이 없어요. 아래 버튼으로 추가해보세요.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {collItems.map((it, idx) => (
                  <div key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '13px', borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.white }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>아이템 {idx + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button type="button" onClick={() => moveCollItem(idx, -1)} disabled={idx === 0} style={arrowBtn(idx === 0)}><ChevronUp size={14} /></button>
                        <button type="button" onClick={() => moveCollItem(idx, 1)} disabled={idx === collItems.length - 1} style={arrowBtn(idx === collItems.length - 1)}><ChevronDown size={14} /></button>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                          <span style={{ fontSize: 11, color: it.is_active ? T.green : T.muted, fontWeight: 600 }}>{it.is_active ? '켬' : '끔'}</span>
                          <Toggle on={it.is_active} onChange={v => updateCollItem(it.id, { is_active: v })} />
                        </label>
                        <button type="button" onClick={() => removeCollItem(it.id)} style={{ border: `1px solid ${T.border}`, background: T.white, borderRadius: 7, padding: '6px', cursor: 'pointer', color: T.red, display: 'flex' }}>
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                    <ImageUploadField value={it.image_url} onChange={url => updateCollItem(it.id, { image_url: url })} />
                    <input value={it.title} onChange={e => updateCollItem(it.id, { title: e.target.value })} placeholder="타이틀" style={modalInput} />
                    <textarea value={it.description} onChange={e => updateCollItem(it.id, { description: e.target.value })} rows={2} placeholder="설명 (선택)" style={{ ...modalInput, resize: 'vertical', lineHeight: 1.6 }} />
                    <input value={it.url} onChange={e => updateCollItem(it.id, { url: e.target.value })} placeholder="연결 URL (선택)" style={modalInput} />
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={addCollItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 10, padding: '11px', borderRadius: 10, border: `1.5px dashed ${T.border}`, background: T.surface, color: T.brand, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={15} /> 아이템 추가
            </button>
          </div>
        </div>
      )}

      {block.type === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={modalLabel}>블록 제목</label>
            <input value={(payload.title as string) || ''} onChange={e => set('title', e.target.value)} placeholder="예: 이달의 이벤트 일정" style={modalInput} />
          </div>
          <div>
            <label style={modalLabel}>보기 방식</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['list', '리스트'], ['calendar', '캘린더']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('viewStyle', val)} style={segBtn(((payload.viewStyle as string) || 'list') === val)}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={modalLabel}>일정</label>
            {calEvents.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', fontSize: 12.5, color: T.muted, background: T.surface, borderRadius: 10 }}>
                아직 일정이 없어요. 아래 버튼으로 추가해보세요.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {calEvents.map((ev, idx) => (
                  <div key={ev.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '13px', borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.white }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>일정 {idx + 1}</span>
                      <button type="button" onClick={() => removeCalEvent(ev.id)} style={{ border: `1px solid ${T.border}`, background: T.white, borderRadius: 7, padding: '6px', cursor: 'pointer', color: T.red, display: 'flex' }}>
                        <X size={13} />
                      </button>
                    </div>
                    <input value={ev.name} onChange={e => updateCalEvent(ev.id, { name: e.target.value })} placeholder="일정명" style={modalInput} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: T.inkSub, display: 'block', marginBottom: 4 }}>시작</span>
                        <input type="datetime-local" value={toDatetimeLocal(ev.start_at)} onChange={e => updateCalEvent(ev.id, { start_at: fromDatetimeLocal(e.target.value) })} style={modalInput} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: T.inkSub, display: 'block', marginBottom: 4 }}>종료 (선택)</span>
                        <input type="datetime-local" value={toDatetimeLocal(ev.end_at)} onChange={e => updateCalEvent(ev.id, { end_at: fromDatetimeLocal(e.target.value) })} style={modalInput} />
                      </div>
                    </div>
                    <input value={ev.url} onChange={e => updateCalEvent(ev.id, { url: e.target.value })} placeholder="연결 URL (선택)" style={modalInput} />
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={addCalEvent} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 10, padding: '11px', borderRadius: 10, border: `1.5px dashed ${T.border}`, background: T.surface, color: T.brand, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={15} /> 일정 추가
            </button>
          </div>
        </div>
      )}

      {block.type === 'divider' && (
        <div>
          <label style={modalLabel}>스타일</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DIVIDER_STYLES.map(ds => {
              const active = ((payload.style as string) || 'solid') === ds.key
              return (
                <button key={ds.key} type="button" onClick={() => set('style', ds.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${active ? T.brand : T.border}`, background: active ? T.brandSoft : T.white, width: '100%',
                }}>
                  <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 600, color: active ? T.brand : T.inkSub, width: 56, flexShrink: 0, textAlign: 'left' }}>{ds.label}</span>
                  <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 16 }}>
                    <DividerPreview style={ds.key} />
                  </span>
                  {active && <Check size={15} color={T.brand} style={{ flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
        <button type="button" onClick={onClose} style={btnGhost}>취소</button>
        <button type="button" onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? '저장 중...' : '저장'}</button>
      </div>
    </ModalShell>
  )
}

const btnGhost: React.CSSProperties = { padding: '9px 18px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.white, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: T.inkSub }
const btnPrimary: React.CSSProperties = { padding: '9px 20px', borderRadius: 8, border: 'none', background: T.brand, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
