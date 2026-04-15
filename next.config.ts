import type { NextConfig } from 'next'

/** 개발 환경 여부 */
const isDev = process.env.NODE_ENV === 'development'

/**
 * Content-Security-Policy 헤더 값 생성
 * 개발 환경에서는 unsafe-eval을 허용하고, 프로덕션에서는 엄격한 정책 적용
 */
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim()

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // XSS 공격 방지: 브라우저가 다른 origin에 있는 프레임에서 렌더링되지 않도록
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // MIME 타입 스니핑 방지
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // 리퍼러 정책: 동일 출처에서만 전체 URL 전송
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // XSS 필터 (구형 브라우저 대응)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // 콘텐츠 보안 정책: 허용된 리소스 출처만 로드
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          // 권한 정책: 불필요한 브라우저 기능 비활성화
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // HTTPS 강제 적용 (프로덕션에서만 HSTS 활성화)
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]),
        ],
      },
    ]
  },
}

export default nextConfig
