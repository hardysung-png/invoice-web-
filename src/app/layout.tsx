import type { Metadata } from 'next'
import { Geist_Mono, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'

// 한글 폰트 최적화: Noto Sans KR (Google Fonts)
const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  display: 'optional', // 폰트 로딩이 페이지 렌더링을 블로킹하지 않도록 설정
  variable: '--font-noto-sans-kr',
  preload: false, // 연결 실패 시 타임아웃 방지
  fallback: ['system-ui', 'sans-serif'],
  weight: ['400', '500', '700'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'optional',
  preload: false,
})

export const metadata: Metadata = {
  title: '견적서 조회 시스템',
  description:
    '노션 기반 견적서 관리 시스템 - 웹에서 견적서를 확인하고 PDF로 다운로드하세요',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={notoSansKR.variable}>
      <body className={`${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
