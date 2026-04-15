/**
 * PDF 생성 API Route
 * 견적서 데이터를 받아 PDF Blob을 생성하여 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import ReactPDF from '@react-pdf/renderer'
import { z } from 'zod'
import { InvoicePDFDocument } from '@/components/pdf/InvoiceTemplate'
import { ERROR_MESSAGES, PDF_CONFIG } from '@/lib/constants'
import { sanitizeFilename } from '@/lib/format'

/**
 * 견적 항목 Zod 스키마
 */
const invoiceItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  unitPrice: z.number().nonnegative(),
  amount: z.number().nonnegative(),
})

/**
 * 견적서 Zod 스키마 — 악의적인 요청 바디 차단
 */
const invoiceSchema = z.object({
  id: z.string().min(1),
  invoiceNumber: z.string().min(1),
  clientName: z.string().min(1),
  issueDate: z.string().min(1),
  validUntil: z.string().min(1),
  items: z.array(invoiceItemSchema),
  totalAmount: z.number().nonnegative(),
  status: z.enum(['pending', 'approved', 'rejected']),
})

const requestBodySchema = z.object({
  invoice: invoiceSchema,
})

/**
 * POST /api/generate-pdf
 * 견적서 데이터를 받아 PDF를 생성하여 반환
 */
export async function POST(req: NextRequest) {
  try {
    // 1단계: 요청 바디 파싱
    const rawBody: unknown = await req.json()

    // 2단계: Zod 스키마 검증
    const parseResult = requestBodySchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.INVALID_INVOICE_DATA,
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { invoice } = parseResult.data

    // 3단계: PDF Document 생성
    const pdfDoc = createElement(InvoicePDFDocument, { invoice })

    // 4단계: PDF Blob 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await ReactPDF.pdf(pdfDoc as any).toBlob()

    // 5단계: Blob을 ArrayBuffer로 변환
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 6단계: 파일명 생성 및 RFC 5987 인코딩
    // filename*=UTF-8''... 형식으로 한글 파일명을 안전하게 처리합니다
    const filename = `${PDF_CONFIG.FILENAME_PREFIX}-${sanitizeFilename(invoice.invoiceNumber)}.pdf`
    const encodedFilename = encodeURIComponent(filename)

    // 7단계: 응답 반환
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'public, max-age=0',
      },
    })
  } catch (error) {
    console.error(ERROR_MESSAGES.PDF_GENERATION_ERROR, error)
    return NextResponse.json(
      { error: ERROR_MESSAGES.PDF_GENERATION_ERROR },
      { status: 500 }
    )
  }
}
