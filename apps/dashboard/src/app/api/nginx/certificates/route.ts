import { npmApi } from '@/lib/nginx-proxy-manager'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/nginx/certificates
 * Получить список всех SSL сертификатов
 */
export async function GET() {
  try {
    const certificates = await npmApi.getCertificates()
    return NextResponse.json({
      success: true,
      data: certificates,
      count: certificates.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
