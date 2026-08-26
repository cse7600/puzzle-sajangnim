// 이미지 업로드 공통 검증 (어드민 썸네일 · 사용자 설문 응답 공유).
// 클라이언트가 보낸 file.type은 위조될 수 있으므로 1차로만 쓰고,
// 실제 업로드 전에 매직 바이트로 파일 내용을 다시 검증한다 (business-verification 패턴).

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const MAGIC_SIGNATURES: { extension: string; contentType: string; matches: (buf: Buffer) => boolean }[] = [
  { extension: 'jpg', contentType: 'image/jpeg', matches: b => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { extension: 'png', contentType: 'image/png', matches: b => b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { extension: 'webp', contentType: 'image/webp', matches: b => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
]

export interface ValidatedImage {
  buffer: Buffer
  extension: string
  contentType: string
}

export interface ImageErrorMessages {
  missing: string
  badType: string
}

export async function readAndValidateImage(
  entry: FormDataEntryValue | null,
  messages: ImageErrorMessages
): Promise<{ error: string } | ValidatedImage> {
  if (!(entry instanceof File) || entry.size === 0) {
    return { error: messages.missing }
  }
  if (!ALLOWED_CONTENT_TYPES.has(entry.type)) {
    return { error: messages.badType }
  }
  if (entry.size > MAX_IMAGE_SIZE_BYTES) {
    return { error: '파일 크기는 5MB를 초과할 수 없습니다' }
  }
  const buffer = Buffer.from(await entry.arrayBuffer())
  const signature = MAGIC_SIGNATURES.find(sig => sig.matches(buffer))
  if (!signature) {
    return { error: '파일 내용이 올바른 이미지 형식이 아닙니다' }
  }
  return { buffer, extension: signature.extension, contentType: signature.contentType }
}
