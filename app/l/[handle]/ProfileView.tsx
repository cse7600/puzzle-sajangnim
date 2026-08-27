'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Share2, Check, Copy, ExternalLink, ArrowRight,
  Instagram, Youtube, Facebook, Globe, Send, Sparkles,
  LayoutGrid, Calendar,
} from 'lucide-react'
import {
  getTheme, BLOCK_SHADOWS, BLOCK_SHAPES, getGradient, getFontPreset, fontGoogleHref,
  type LinkBlockStyle,
} from '@/lib/link-themes'

export interface ProgramCard {
  itemId: string
  programId: string
  name: string
  logoUrl: string | null
  codeOnly: boolean
  code: string
  url: string
  customTitle?: string | null
  customCta?: string | null
}

function normalizeUrl(raw: string): string {
  const url = (raw || '').trim()
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  if (/^(mailto|tel):/i.test(url)) return url
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return ''
  return `https://${url}`
}

export interface PublicBlock {
  id: string
  type: string
  payload: Record<string, unknown>
  programs: ProgramCard[]
}

export interface SnsLink {
  platform?: string
  url?: string
}

export interface ProfileData {
  handle: string
  partnerName: string
  displayName: string
  bio: string
  avatarUrl: string | null
  snsLinks: SnsLink[]
  noticeText: string
  proposalEnabled: boolean
  themePreset: string | null
  blockStyle: Record<string, unknown>
  layoutPreset?: string | null
  fontPreset?: string | null
  background?: Record<string, unknown> | null
  blocks: PublicBlock[]
}

function isHexDark(hex?: string): boolean {
  if (!hex) return false
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length !== 6) return false
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return false
  return (0.299 * r + 0.587 * g + 0.114 * b) < 145
}

function track(handle: string, blockId?: string) {
  try {
    const url = `/api/public/link-page/${encodeURIComponent(handle)}/click`
    const body = JSON.stringify(blockId ? { block_id: blockId } : {})
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  } catch { /* noop */ }
}

function SnsIcon({ platform }: { platform?: string }) {
  const p = (platform || '').toLowerCase()
  const size = 19
  if (p.includes('insta')) return <Instagram size={size} />
  if (p.includes('you') || p.includes('tube')) return <Youtube size={size} />
  if (p.includes('face')) return <Facebook size={size} />
  return <Globe size={size} />
}

export default function ProfileView({ data, previewMode = false }: { data: ProfileData; previewMode?: boolean }) {
  const t = getTheme(data.themePreset)
  const bs = data.blockStyle || {}
  const shadowKey = (bs.shadow as string) || 'medium'
  const shadow = BLOCK_SHADOWS[shadowKey] ?? BLOCK_SHADOWS.medium
  const radius = BLOCK_SHAPES[(bs.shape as string)] ?? BLOCK_SHAPES.round
  const align = ((bs.align as string) === 'left' ? 'left' : 'center') as 'left' | 'center'
  const fontSizeKey = ((bs.fontSize as string) || 'md') as 'sm' | 'md' | 'lg'
  const nameSize = fontSizeKey === 'sm' ? 18 : fontSizeKey === 'lg' ? 25 : 21
  const bioSize = fontSizeKey === 'sm' ? 13 : fontSizeKey === 'lg' ? 15 : 14
  const animation = ((bs.animation as string) || 'none') as 'none' | 'wave' | 'bounce'
  const noticeRolling = bs.noticeRolling === true
  const buttonColor = (bs.buttonColor as string) || ''
  const buttonTextColor = buttonColor ? (isHexDark(buttonColor) ? '#FFFFFF' : '#1A1A1A') : ''
  const noticeColor = (bs.noticeColor as string) || ''
  const noticeBg = noticeColor || t.accent
  const noticeTextColor = noticeColor ? (isHexDark(noticeColor) ? '#F8FAFC' : '#1A1A1A') : t.accentText

  const font = getFontPreset(data.fontPreset)
  const fontFamily = font.fontFamily

  const layout = (data.layoutPreset as string) || 'profile_only'
  const bg = data.background || {}
  const coverUrl = (bg.coverImageUrl as string) || ''
  const hasCover = layout === 'cover_top' || layout === 'cover_profile_overlap'
  const overlap = layout === 'cover_profile_overlap'

  const pageMode = ((bg.pageMode as string) || 'theme') as 'theme' | 'solid' | 'gradient' | 'image'
  const solidColor = (bg.hex as string) || (bg.color as string) || ''
  const bgImageUrl = (bg.imageUrl as string) || ''
  const gradient = pageMode === 'gradient' ? getGradient(bg.gradientKey as string) : null
  const pageBackground =
    pageMode === 'image' ? (solidColor || '#F7F7F5')
      : pageMode === 'solid' ? (solidColor || t.pageBg)
        : pageMode === 'gradient' ? (gradient?.css || t.pageBg)
          : t.pageBg
  const isDark = t.key === 'midnight'
  const pageIsDark =
    pageMode === 'image' ? isHexDark(solidColor)
      : pageMode === 'solid' ? isHexDark(solidColor)
        : pageMode === 'gradient' ? (gradient?.isDark ?? false)
          : isDark
  const headerText = pageMode === 'theme' ? t.text : (pageIsDark ? '#F8FAFC' : '#1A1A1A')
  const headerSub = pageMode === 'theme' ? t.textSub : (pageIsDark ? 'rgba(248,250,252,0.78)' : '#5B5B5B')

  const [copied, setCopied] = useState(false)
  const trackedRef = useRef(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const href = fontGoogleHref(data.fontPreset)
    if (!href) return
    const fontId = `rl-font-${data.fontPreset}`
    if (document.getElementById(fontId)) return
    const link = document.createElement('link')
    link.id = fontId
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }, [data.fontPreset])

  useEffect(() => {
    if (previewMode) return
    if (trackedRef.current) return
    trackedRef.current = true
    track(data.handle)
  }, [data.handle, previewMode])

  const previewGuard = previewMode
    ? { onClickCapture: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() } }
    : {}

  const shareUrl = typeof window !== 'undefined'
    ? window.location.href
    : `/l/${data.handle}`

  const handleShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: data.displayName, url: shareUrl })
        return
      } catch { return }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* noop */ }
  }, [data.displayName, shareUrl])

  const cardBase: React.CSSProperties = {
    background: t.card,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: radius,
    boxShadow: shadow,
  }

  const iconBtn: React.CSSProperties = {
    width: 38, height: 38, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${t.cardBorder}`, background: t.card,
    color: t.text, cursor: 'pointer', backdropFilter: 'blur(6px)',
  }

  const iconBtnCover: React.CSSProperties = {
    ...iconBtn,
    background: 'rgba(255,255,255,0.9)',
    border: '1px solid rgba(255,255,255,0.65)',
    color: '#1A1A1A',
    boxShadow: '0 2px 12px rgba(0,0,0,0.28)',
    backdropFilter: 'blur(8px)',
  }
  const shareOnCover = hasCover && !!coverUrl

  const flexAlign = align === 'left' ? 'flex-start' : 'center'
  const noticeChipBg = pageMode === 'theme' ? t.chip : (pageIsDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.72)')

  const TICKER_REPEAT = 5
  const tickerUnit = (
    <>
      {Array.from({ length: TICKER_REPEAT }).map((_, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginRight: 34 }}>
          <Sparkles size={13} style={{ flexShrink: 0 }} />
          {data.noticeText}
        </span>
      ))}
    </>
  )
  const tickerDuration = Math.max(18, data.noticeText.length * TICKER_REPEAT * 0.22)

  return (
    <div {...previewGuard} style={{
      minHeight: previewMode ? undefined : '100vh', background: pageBackground, color: headerText, fontFamily,
      ...(pageMode === 'image' && bgImageUrl ? { backgroundImage: `url(${bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : {}),
    }}>
      <style>{`
        .rl-btn { transition: transform 0.16s ease, box-shadow 0.16s ease; will-change: transform; }
        .rl-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,0.16); }
        .rl-btn:active { transform: scale(0.97); }
        @keyframes rl-wave { 0% { transform: translateY(12px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .rl-anim-wave { animation: rl-wave 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes rl-bounce { 0%,100% { transform: translateY(0); } 28% { transform: translateY(-7px); } 55% { transform: translateY(-2px); } 78% { transform: translateY(-1px); } }
        .rl-anim-bounce:hover { animation: rl-bounce 0.55s ease; }
        .rl-marquee { overflow: hidden; width: 100%; }
        .rl-marquee > span { display: inline-block; white-space: nowrap; padding-left: 100%; animation: rl-marquee linear infinite; }
        @keyframes rl-marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        .rl-ticker { overflow: hidden; width: 100%; }
        .rl-ticker__track { display: inline-flex; align-items: center; white-space: nowrap; animation: rl-ticker-move linear infinite; will-change: transform; }
        @keyframes rl-ticker-move { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) {
          .rl-btn { transition: none; }
          .rl-btn:hover, .rl-btn:active { transform: none; }
          .rl-anim-wave { animation: none; }
          .rl-anim-bounce:hover { animation: none; }
          .rl-marquee > span { animation: none; padding-left: 0; }
          .rl-ticker__track { animation: none; }
        }
      `}</style>

      {data.noticeText && noticeRolling && (
        <div className="rl-ticker" style={{
          background: noticeBg, color: noticeTextColor,
          fontSize: 13, fontWeight: 600, lineHeight: 1,
          padding: '11px 0', position: 'relative', zIndex: 6,
        }}>
          <div className="rl-ticker__track" style={{ animationDuration: `${tickerDuration}s` }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>{tickerUnit}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden>{tickerUnit}</span>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 480, margin: '0 auto', padding: hasCover ? '0 0 48px' : '16px 18px 48px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: hasCover ? 14 : 16, right: hasCover ? 14 : 18, zIndex: 5 }}>
          <button type="button" className="rl-btn" onClick={handleShare} title="공유하기" aria-label="공유하기" style={shareOnCover ? iconBtnCover : iconBtn}>
            {copied ? <Check size={18} color="#16A34A" /> : <Share2 size={18} />}
          </button>
        </div>

        {hasCover && (
          <div style={{
            width: '100%', aspectRatio: '1800 / 720', overflow: 'hidden',
            background: coverUrl ? undefined : t.promoBg,
            marginBottom: overlap ? 0 : 14,
          }}>
            {coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </div>
        )}

        <div style={{ padding: hasCover ? '0 18px' : 0, position: 'relative' }}>
          <div style={{ textAlign: align, padding: overlap ? '0 0 22px' : `${hasCover ? 6 : 46}px 0 22px` }}>
            <div style={{
              width: 108, height: 108, borderRadius: '50%',
              margin: align === 'left'
                ? `${overlap ? -60 : 0}px 0 14px`
                : `${overlap ? -60 : 0}px auto 14px`,
              position: 'relative', zIndex: 2,
              overflow: 'hidden', background: t.chip,
              border: `3px solid ${pageMode === 'theme' ? t.card : (pageIsDark ? '#111827' : '#FFFFFF')}`, boxShadow: shadow,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.avatarUrl} alt={data.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 34, fontWeight: 800, color: t.accent }}>
                  {data.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: nameSize, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6, color: headerText }}>
              {data.displayName}
            </h1>
            {data.bio && (
              <p style={{ fontSize: bioSize, lineHeight: 1.6, color: headerSub, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', maxWidth: 380, margin: align === 'left' ? '0' : '0 auto' }}>
                {data.bio}
              </p>
            )}

            {data.snsLinks.length > 0 && (
              <div style={{ display: 'flex', justifyContent: flexAlign, gap: 12, marginTop: 16 }}>
                {data.snsLinks.filter(s => s.url).map((s, i) => (
                  <a key={i} className="rl-btn" href={normalizeUrl(s.url || '')} target="_blank" rel="noopener noreferrer"
                     title={s.platform} style={{ ...iconBtn, width: 40, height: 40, textDecoration: 'none' }}>
                    <SnsIcon platform={s.platform} />
                  </a>
                ))}
              </div>
            )}

            {data.noticeText && !noticeRolling && (
              <div style={{
                marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 999, background: noticeChipBg,
                fontSize: 13, fontWeight: 600, color: headerText,
              }}>
                <Sparkles size={14} color={t.accent} />
                {data.noticeText}
              </div>
            )}
          </div>

          {data.proposalEnabled && (
            <Link
              className="rl-btn"
              href={`/l/${data.handle}/propose`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                width: '100%', padding: '16px', borderRadius: radius, marginBottom: 22,
                background: buttonColor || t.promoBg, color: buttonColor ? buttonTextColor : t.accentText, textDecoration: 'none',
                fontSize: 15.5, fontWeight: 800, boxShadow: shadow, letterSpacing: '-0.01em',
              }}
            >
              <Send size={18} />
              비즈니스 제안 보내기
              <ArrowRight size={17} />
            </Link>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.blocks.map((block, i) => {
              const animClass = animation === 'wave' ? 'rl-anim-wave' : animation === 'bounce' ? 'rl-anim-bounce' : undefined
              return (
                <div
                  key={block.id}
                  className={animClass}
                  style={animation === 'wave' ? { animationDelay: `${i * 0.08}s` } : undefined}
                >
                  <BlockRenderer block={block} theme={t} cardBase={cardBase} radius={radius} handle={data.handle} isDark={isDark} buttonColor={buttonColor} buttonText={buttonTextColor} pageAlign={align} />
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}

function BlockRenderer({ block, theme: t, cardBase, radius, handle, isDark, buttonColor, buttonText, pageAlign }: {
  block: PublicBlock
  theme: ReturnType<typeof getTheme>
  cardBase: React.CSSProperties
  radius: number
  handle: string
  isDark: boolean
  buttonColor: string
  buttonText: string
  pageAlign: 'left' | 'center'
}) {
  const p = block.payload
  const blockAlign = (p.align as string) === 'left' || (p.align as string) === 'center' ? (p.align as 'left' | 'center') : pageAlign

  if (block.type === 'text') {
    const content = (p.content as string) || ''
    if (!content.trim()) return null
    return (
      <div style={{ ...cardBase, padding: '18px 18px', textAlign: blockAlign }}>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', color: t.text }}>
          {content}
        </p>
      </div>
    )
  }

  if (block.type === 'image') {
    const imageUrl = (p.image_url as string) || ''
    const alt = (p.alt as string) || ''
    const linkUrl = (p.url as string) || ''
    if (!imageUrl) return null
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={alt} style={{ width: '100%', display: 'block', borderRadius: radius }} />
    )
    return (
      <div style={{ ...cardBase, padding: 0, overflow: 'hidden' }}>
        {linkUrl ? (
          <a className="rl-btn" href={normalizeUrl(linkUrl)} target="_blank" rel="noopener noreferrer"
             onClick={() => track(handle, block.id)} style={{ display: 'block' }}>
            {img}
          </a>
        ) : img}
      </div>
    )
  }

  if (block.type === 'link') {
    return <LinkBlock block={block} theme={t} cardBase={cardBase} handle={handle} />
  }

  if (block.type === 'program_collection') {
    if (block.programs.length === 0) return null
    const title = (p.title as string) || '제휴 프로그램'
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '6px 2px 12px' }}>
          <Sparkles size={15} color={t.accent} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: t.text }}>{title}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {block.programs.map(prog => (
            <ProgramCardView key={prog.itemId} prog={prog} theme={t} radius={radius} handle={handle} blockId={block.id} isDark={isDark} buttonColor={buttonColor} buttonText={buttonText} />
          ))}
        </div>
      </div>
    )
  }

  if (block.type === 'collection') {
    return <CollectionBlockView block={block} theme={t} cardBase={cardBase} handle={handle} />
  }

  if (block.type === 'calendar') {
    return <CalendarBlockView block={block} theme={t} cardBase={cardBase} handle={handle} />
  }

  if (block.type === 'divider') {
    return <DividerBlockView block={block} theme={t} />
  }

  return null
}

function LinkBlock({ block, theme: t, cardBase, handle }: {
  block: PublicBlock
  theme: ReturnType<typeof getTheme>
  cardBase: React.CSSProperties
  handle: string
}) {
  const p = block.payload
  const url = (p.url as string) || ''
  const title = (p.title as string) || url
  const imageUrl = (p.image_url as string) || ''
  const style = ((p.style as string) || 'simple') as LinkBlockStyle
  if (!url) return null

  const common = {
    className: 'rl-btn',
    href: normalizeUrl(url), target: '_blank', rel: 'noopener noreferrer' as const,
    onClick: () => track(handle, block.id),
    style: { textDecoration: 'none', color: t.text, display: 'block' } as React.CSSProperties,
  }

  if (style === 'background') {
    return (
      <a {...common}>
        <div style={{
          ...cardBase, padding: 0, overflow: 'hidden', position: 'relative',
          minHeight: 130, display: 'flex', alignItems: 'flex-end',
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
          background: imageUrl ? undefined : t.promoBg,
        }}>
          <div style={{
            width: '100%', padding: '14px 16px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.62) 100%)',
          }}>
            <span style={{ fontSize: 15.5, fontWeight: 800, color: '#fff' }}>{title}</span>
          </div>
        </div>
      </a>
    )
  }

  if (style === 'card') {
    return (
      <a {...common}>
        <div style={{ ...cardBase, padding: 0, overflow: 'hidden' }}>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
            <ExternalLink size={16} color={t.textSub} style={{ flexShrink: 0 }} />
          </div>
        </div>
      </a>
    )
  }

  if (style === 'thumbnail') {
    return (
      <a {...common}>
        <div style={{ ...cardBase, padding: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 54, height: 54, borderRadius: 10, overflow: 'hidden', background: t.chip, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : <Globe size={22} color={t.accent} />}
          </div>
          <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }}>{title}</span>
          <ExternalLink size={15} color={t.textSub} style={{ flexShrink: 0, marginRight: 4 }} />
        </div>
      </a>
    )
  }

  return (
    <a {...common}>
      <div style={{
        ...cardBase, padding: '16px', textAlign: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
      </div>
    </a>
  )
}

function ProgramCardView({ prog, theme: t, radius, handle, blockId, isDark, buttonColor, buttonText }: {
  prog: ProgramCard
  theme: ReturnType<typeof getTheme>
  radius: number
  handle: string
  blockId: string
  isDark: boolean
  buttonColor: string
  buttonText: string
}) {
  const [copied, setCopied] = useState(false)
  const ctaBg = buttonColor || t.accent
  const ctaText = buttonColor ? buttonText : t.accentText

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(prog.code)
      setCopied(true)
      track(handle, blockId)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* noop */ }
  }

  return (
    <div style={{
      borderRadius: radius, padding: 2, background: t.promoBg,
      boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
    }}>
      <div style={{
        borderRadius: radius - 2, padding: '15px 15px 13px',
        background: isDark ? '#111827' : '#FFFFFF',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
            background: t.chip, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {prog.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prog.logoUrl} alt={prog.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 17, fontWeight: 800, color: t.accent }}>{prog.name.charAt(0)}</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14.5, fontWeight: 800, lineHeight: 1.35, color: isDark ? '#F1F5F9' : '#1A1A1A',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {prog.customTitle || prog.name}
            </div>
            {prog.codeOnly && (
              <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                  color: isDark ? '#F1F5F9' : '#1A1A1A',
                  background: t.chip, padding: '2px 8px', borderRadius: 6,
                }}>{prog.code || '코드'}</span>
                <span style={{ fontSize: 11, color: t.textSub }}>추천 코드</span>
              </div>
            )}
          </div>
        </div>

        {prog.codeOnly ? (
          <button type="button" className="rl-btn" onClick={copyCode} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
            padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: ctaBg, color: ctaText, fontSize: 13.5, fontWeight: 700,
          }}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? '복사됨' : (prog.customCta || '코드 복사')}
          </button>
        ) : (
          <a className="rl-btn" href={normalizeUrl(prog.url)} target="_blank" rel="noopener noreferrer"
             onClick={() => track(handle, blockId)}
             style={{
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
               textDecoration: 'none', boxSizing: 'border-box',
               padding: '11px 14px', borderRadius: 10, background: ctaBg, color: ctaText,
               fontSize: 13.5, fontWeight: 700,
             }}>
            {prog.customCta || '바로가기'} <ArrowRight size={15} />
          </a>
        )}
      </div>
    </div>
  )
}

interface CollectionItem {
  id?: string
  image_url?: string
  title?: string
  description?: string
  url?: string
  is_active?: boolean
  position?: number
}
function CollectionBlockView({ block, theme: t, cardBase, handle }: {
  block: PublicBlock
  theme: ReturnType<typeof getTheme>
  cardBase: React.CSSProperties
  handle: string
}) {
  const p = block.payload
  const title = (p.title as string) || '컬렉션'
  const style = ((p.style as string) || 'grid2') as 'grid2' | 'grid3'
  const rawItems = Array.isArray(p.items) ? (p.items as CollectionItem[]) : []
  const items = rawItems.filter(it => it && it.is_active !== false)
  if (items.length === 0) return null
  const cols = style === 'grid3' ? 3 : 2

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '6px 2px 12px' }}>
        <LayoutGrid size={15} color={t.accent} />
        <span style={{ fontSize: 13.5, fontWeight: 800, color: t.text }}>{title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
        {items.map((item, i) => {
          const inner = (
            <div style={{ ...cardBase, padding: 0, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', aspectRatio: '1 / 1', background: t.chip, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <LayoutGrid size={26} color={t.accent} />
                )}
              </div>
              <div style={{ padding: '9px 10px 11px', flex: 1 }}>
                {item.title && (
                  <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, color: t.text }}>
                    {item.title}
                  </div>
                )}
                {item.description && (
                  <div style={{
                    marginTop: 3, fontSize: 11.5, lineHeight: 1.45, color: t.textSub,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {item.description}
                  </div>
                )}
              </div>
            </div>
          )
          return item.url ? (
            <a key={item.id || i} className="rl-btn" href={normalizeUrl(item.url)} target="_blank" rel="noopener noreferrer"
               onClick={() => track(handle, block.id)} style={{ textDecoration: 'none', display: 'block' }}>
              {inner}
            </a>
          ) : (
            <div key={item.id || i}>{inner}</div>
          )
        })}
      </div>
    </div>
  )
}

interface CalendarEvent {
  id?: string
  start_at?: string
  end_at?: string
  name?: string
  url?: string
}
function getEventStatus(startAt?: string, endAt?: string): { label: string; bg: string; color: string } {
  const start = startAt ? new Date(startAt).getTime() : NaN
  if (Number.isNaN(start)) return { label: '예정', bg: '#F1F5F9', color: '#64748B' }
  const now = Date.now()
  const end = endAt ? new Date(endAt).getTime() : start
  if (now >= start && now <= end) return { label: 'OPEN', bg: '#DCFCE7', color: '#16A34A' }
  if (now > end) return { label: '종료', bg: '#F1F5F9', color: '#94A3B8' }
  const daysUntil = Math.ceil((start - now) / 86400000)
  if (daysUntil <= 3) return { label: `D-${daysUntil}`, bg: '#FEF3C7', color: '#D97706' }
  return { label: 'SOON', bg: '#F1F5F9', color: '#64748B' }
}
function formatEventDate(startAt?: string): string {
  if (!startAt) return ''
  const d = new Date(startAt)
  if (Number.isNaN(d.getTime())) return ''
  const date = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} ${time}`
}
function CalendarBlockView({ block, theme: t, cardBase, handle }: {
  block: PublicBlock
  theme: ReturnType<typeof getTheme>
  cardBase: React.CSSProperties
  handle: string
}) {
  const p = block.payload
  const title = (p.title as string) || '일정'
  const viewStyle = ((p.viewStyle as string) || 'list') as 'list' | 'calendar'
  const rawEvents = Array.isArray(p.events) ? (p.events as CalendarEvent[]) : []
  const events = rawEvents
    .filter(e => e && e.start_at && !Number.isNaN(new Date(e.start_at).getTime()))
    .sort((a, b) => new Date(a.start_at as string).getTime() - new Date(b.start_at as string).getTime())
  if (events.length === 0) return null

  const eventRow = (ev: CalendarEvent, i: number) => {
    const status = getEventStatus(ev.start_at, ev.end_at)
    const inner = (
      <div style={{ ...cardBase, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{
          flexShrink: 0, fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
          background: status.bg, color: status.color, minWidth: 44, textAlign: 'center',
        }}>{status.label}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, lineHeight: 1.35 }}>{ev.name || '일정'}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: t.textSub }}>{formatEventDate(ev.start_at)}</div>
        </div>
        {ev.url && <ExternalLink size={15} color={t.textSub} style={{ flexShrink: 0 }} />}
      </div>
    )
    return ev.url ? (
      <a key={ev.id || i} className="rl-btn" href={normalizeUrl(ev.url)} target="_blank" rel="noopener noreferrer"
         onClick={() => track(handle, block.id)} style={{ textDecoration: 'none', display: 'block' }}>
        {inner}
      </a>
    ) : (
      <div key={ev.id || i}>{inner}</div>
    )
  }

  const list = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events.map((ev, i) => eventRow(ev, i))}
    </div>
  )

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '6px 2px 12px' }}>
      <Calendar size={15} color={t.accent} />
      <span style={{ fontSize: 13.5, fontWeight: 800, color: t.text }}>{title}</span>
    </div>
  )

  if (viewStyle !== 'calendar') {
    return <div>{header}{list}</div>
  }

  const now = Date.now()
  const upcoming = events.find(e => new Date(e.start_at as string).getTime() >= now)
  const baseDate = upcoming ? new Date(upcoming.start_at as string) : new Date()
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const eventDays = new Set<number>()
  events.forEach(e => {
    const d = new Date(e.start_at as string)
    if (d.getFullYear() === year && d.getMonth() === month) eventDays.add(d.getDate())
  })
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']
  const monthLabel = `${year}년 ${month + 1}월`

  return (
    <div>
      {header}
      <div style={{ ...cardBase, padding: '14px 14px 16px', marginBottom: 10 }}>
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 12 }}>{monthLabel}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {weekdayLabels.map((w, i) => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? '#DC2626' : t.textSub, padding: '2px 0' }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((day, i) => {
            const hasEvent = day != null && eventDays.has(day)
            return (
              <div key={i} style={{
                aspectRatio: '1 / 1', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                fontSize: 12, fontWeight: hasEvent ? 800 : 500,
                color: day == null ? 'transparent' : hasEvent ? t.accent : t.text,
                background: hasEvent ? t.chip : undefined, borderRadius: 8,
              }}>
                {day ?? ''}
                {hasEvent && <span style={{ width: 4, height: 4, borderRadius: '50%', background: t.accent }} />}
              </div>
            )
          })}
        </div>
      </div>
      {list}
    </div>
  )
}

function DividerBlockView({ block, theme: t }: {
  block: PublicBlock
  theme: ReturnType<typeof getTheme>
}) {
  const style = ((block.payload.style as string) || 'solid') as 'blank' | 'dotted' | 'solid' | 'dots' | 'zigzag'
  const lineColor = t.cardBorder

  if (style === 'blank') return <div style={{ height: 28 }} />
  if (style === 'dotted') return <div style={{ borderTop: `2px dotted ${lineColor}`, margin: '8px 0' }} />
  if (style === 'solid') return <div style={{ borderTop: `1.5px solid ${lineColor}`, margin: '8px 0' }} />
  if (style === 'dots') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '10px 0' }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: lineColor }} />
        ))}
      </div>
    )
  }
  return (
    <div style={{ margin: '10px 0', height: 10, width: '100%', display: 'flex', alignItems: 'center' }}>
      <div style={{
        width: '100%', height: 8,
        background: `linear-gradient(-45deg, transparent 0 33%, ${lineColor} 33% 42%, transparent 42% 58%, ${lineColor} 58% 67%, transparent 67%),
                     linear-gradient(45deg, transparent 0 33%, ${lineColor} 33% 42%, transparent 42% 58%, ${lineColor} 58% 67%, transparent 67%)`,
        backgroundSize: '16px 8px',
        backgroundRepeat: 'repeat-x',
      }} />
    </div>
  )
}
