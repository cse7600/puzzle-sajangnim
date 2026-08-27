import { supabaseAdmin } from '@/lib/supabase-admin'
import { BLOCK_SHAPES, BLOCK_SHADOWS, FONT_PRESETS, GRADIENT_PRESETS } from '@/lib/link-themes'

const INPOCK_CDN = 'https://d13k46lqgoj3d6.cloudfront.net'
const IMPORT_BUCKET = 'link-import-assets'

export interface ParsedProfile {
  displayName: string
  bio: string | null
  avatarUrl: string | null
  snsLinks: { platform: string; url: string }[]
}

export interface ParsedDesign {
  themePreset: string | null
  layoutPreset: string
  fontPreset: string
  background: {
    pageMode: 'theme' | 'solid' | 'gradient' | 'image'
    color?: string
    hex?: string
    imageUrl?: string | null
    coverImageUrl?: string | null
  }
  blockStyle: {
    shape: string
    shadow: string
    align: string
    animation: string
    buttonColor?: string
    noticeRolling: boolean
    noticeColor?: string
  }
  noticeText: string
}

export interface ParsedBlock {
  type: 'text' | 'link' | 'image' | 'divider'
  payload: Record<string, unknown>
  position: number
  sourceId?: number
}

export interface ParsedImport {
  sourceType: string
  sourceUrl: string
  profile: ParsedProfile
  design: ParsedDesign
  blocks: ParsedBlock[]
}

function resolveInpockImage(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const stripped = path.startsWith('images/') ? path.slice(7) : path
  return `${INPOCK_CDN}/${stripped}`
}

function mapInpockShape(inpockShape: string | null): string {
  const mapping: Record<string, string> = {
    'round': 'pill',
    'square-rounded': 'round',
    'square': 'sharp',
  }
  if (!inpockShape) return 'round'
  return mapping[inpockShape] || closestShape(inpockShape)
}

function closestShape(shape: string): string {
  const keys = Object.keys(BLOCK_SHAPES)
  if (keys.includes(shape)) return shape
  return 'round'
}

function mapInpockShadow(shadow: string | null): string {
  const keys = Object.keys(BLOCK_SHADOWS)
  if (!shadow) return 'medium'
  if (keys.includes(shadow)) return shadow
  return 'medium'
}

function mapInpockFont(typography: string | null): string {
  if (!typography) return 'pretendard'
  const lower = typography.toLowerCase()
  if (lower.includes('pretendard')) return 'pretendard'
  if (lower.includes('noto')) return 'noto-sans-kr'
  if (lower.includes('gowun') || lower.includes('dodum')) return 'gowun-dodum'
  if (lower.includes('nanum')) return 'nanum-gothic'
  return 'pretendard'
}

function mapInpockLayout(layoutType: string | null): string {
  const mapping: Record<string, string> = {
    'cover_top': 'cover_top',
    'cover_overlap': 'cover_profile_overlap',
    'profile': 'profile_only',
  }
  if (!layoutType) return 'profile_only'
  return mapping[layoutType] || 'profile_only'
}

function mapInpockSns(snsItems: Array<{ type: string; value: string }> | null): { platform: string; url: string }[] {
  if (!snsItems || !Array.isArray(snsItems)) return []
  return snsItems
    .filter(s => s.value)
    .map(s => ({
      platform: s.type || 'website',
      url: s.value.startsWith('http') ? s.value : `https://www.instagram.com/${s.value}`,
    }))
}

function mapInpockAnimation(animation: string | null): string {
  if (!animation) return 'none'
  if (animation === 'wave' || animation === 'bounce') return animation
  return 'none'
}

function mapBlockStyle(style: string | null): string {
  if (!style) return 'simple'
  const mapping: Record<string, string> = {
    'thumbnail': 'thumbnail',
    'simple': 'simple',
    'card': 'card',
    'background': 'background',
    'text': 'simple',
  }
  return mapping[style] || 'simple'
}

export async function parseInpockPage(url: string): Promise<ParsedImport> {
  const match = url.match(/link\.inpock\.co\.kr\/([^/?#]+)/)
  if (!match) throw new Error('올바르지 않은 인포크링크 URL입니다')
  const handle = match[1]

  const pageUrl = `https://link.inpock.co.kr/${encodeURIComponent(handle)}`
  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PuzzleSajangnim/1.0)',
      'Accept': 'text/html',
    },
  })

  if (!response.ok) {
    throw new Error(`인포크링크 페이지를 불러올 수 없습니다 (${response.status})`)
  }

  const html = await response.text()
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!nextDataMatch) {
    throw new Error('인포크링크 페이지에서 데이터를 추출할 수 없습니다')
  }

  const nextData = JSON.parse(nextDataMatch[1])
  const pageProps = nextData?.props?.pageProps
  if (!pageProps) {
    throw new Error('인포크링크 페이지 데이터 구조가 예상과 다릅니다')
  }

  const design = pageProps.design || {}
  const blocks = pageProps.blocks || []

  const profile: ParsedProfile = {
    displayName: design.title || pageProps.username || handle,
    bio: design.bio || null,
    avatarUrl: resolveInpockImage(design.profile_image),
    snsLinks: mapInpockSns(design.sns),
  }

  const bgColor = design.background_color || '#FFFFFF'
  const hasBgImage = !!design.background_image
  const parsedDesign: ParsedDesign = {
    themePreset: null,
    layoutPreset: mapInpockLayout(design.layout_type),
    fontPreset: mapInpockFont(design.typography),
    background: {
      pageMode: hasBgImage ? 'image' : (design.background_type === 'gradient' ? 'gradient' : 'solid'),
      color: bgColor,
      hex: bgColor,
      imageUrl: hasBgImage ? resolveInpockImage(design.background_image) : null,
      coverImageUrl: resolveInpockImage(design.cover_image),
    },
    blockStyle: {
      shape: mapInpockShape(design.block_shape),
      shadow: mapInpockShadow(design.block_shadow),
      align: design.block_alignment || design.profile_alignment || 'center',
      animation: mapInpockAnimation(design.block_animation),
      noticeRolling: !!(design.notice?.contents),
      noticeColor: design.notice?.background_color || undefined,
    },
    noticeText: design.notice?.contents || '',
  }

  const parsedBlocks: ParsedBlock[] = blocks
    .filter((b: Record<string, unknown>) => b.is_open !== false)
    .map((b: Record<string, unknown>, i: number) => {
      const blockType = (b.block_type as string) || 'link'
      if (blockType === 'divider') {
        return {
          type: 'divider' as const,
          payload: { style: 'solid' },
          position: i,
          sourceId: b.id as number,
        }
      }
      return {
        type: 'link' as const,
        payload: {
          title: b.title || '',
          url: b.url || '',
          image_url: resolveInpockImage(b.image as string | null),
          style: mapBlockStyle(b.style as string | null),
          needsRedirectResolve: typeof b.url === 'string' && b.url.startsWith('/api/r/'),
        },
        position: i,
        sourceId: b.id as number,
      }
    })

  return {
    sourceType: 'inpock',
    sourceUrl: pageUrl,
    profile,
    design: parsedDesign,
    blocks: parsedBlocks,
  }
}

export async function resolveTrackingRedirects(parsed: ParsedImport): Promise<ParsedImport> {
  const updatedBlocks = await Promise.all(
    parsed.blocks.map(async (block) => {
      if (block.type !== 'link') return block
      const blockUrl = block.payload.url as string
      if (!block.payload.needsRedirectResolve || !blockUrl) return block

      try {
        const fullUrl = blockUrl.startsWith('http')
          ? blockUrl
          : `https://link.inpock.co.kr${blockUrl}`

        const resolved = await followRedirects(fullUrl)
        return {
          ...block,
          payload: {
            ...block.payload,
            url: resolved,
            needsRedirectResolve: false,
          },
        }
      } catch {
        return {
          ...block,
          payload: { ...block.payload, needsRedirectResolve: false },
        }
      }
    })
  )
  return { ...parsed, blocks: updatedBlocks }
}

async function followRedirects(url: string, maxHops = 10): Promise<string> {
  let current = url
  for (let i = 0; i < maxHops; i++) {
    const resp = await fetch(current, { redirect: 'manual' })
    const location = resp.headers.get('location')
    if (!location || resp.status < 300 || resp.status >= 400) {
      return current
    }
    current = location.startsWith('http')
      ? location
      : new URL(location, current).toString()
  }
  return current
}

export async function rehostImages(
  parsed: ParsedImport,
  userId: string
): Promise<ParsedImport> {
  const rehostOne = async (imageUrl: string | null | undefined): Promise<string | null> => {
    if (!imageUrl) return null
    try {
      const resp = await fetch(imageUrl)
      if (!resp.ok) return imageUrl
      const contentType = resp.headers.get('content-type') || 'image/jpeg'
      const buffer = Buffer.from(await resp.arrayBuffer())

      const extMap: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif' }
      const ext = extMap[contentType] || 'jpg'
      const fileName = `import/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error } = await supabaseAdmin.storage.from(IMPORT_BUCKET).upload(fileName, buffer, {
        contentType,
        upsert: false,
      })
      if (error) return imageUrl

      const { data } = supabaseAdmin.storage.from(IMPORT_BUCKET).getPublicUrl(fileName)
      return data.publicUrl
    } catch {
      return imageUrl
    }
  }

  const profile = { ...parsed.profile }
  profile.avatarUrl = await rehostOne(profile.avatarUrl)

  const design = { ...parsed.design, background: { ...parsed.design.background } }
  design.background.imageUrl = await rehostOne(design.background.imageUrl)
  design.background.coverImageUrl = await rehostOne(design.background.coverImageUrl)

  const blocks = await Promise.all(
    parsed.blocks.map(async (block) => {
      if (block.type !== 'link') return block
      const imageUrl = await rehostOne(block.payload.image_url as string | null)
      return {
        ...block,
        payload: { ...block.payload, image_url: imageUrl },
      }
    })
  )

  return { ...parsed, profile, design, blocks }
}

export function identifySource(url: string): string | null {
  if (/link\.inpock\.co\.kr/i.test(url)) return 'inpock'
  return null
}
