/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,

  experimental: {
    // 정산내역서 PDF에 쓰는 한글 폰트 파일 — 서버리스 번들 트레이싱에 명시적으로 포함
    outputFileTracingIncludes: {
      '/api/paybacks/statement': ['./assets/fonts/**'],
    },
  },

  async headers() {
    return [
      // 정적 에셋 — 1년 불변 캐시
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // 이미지
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
