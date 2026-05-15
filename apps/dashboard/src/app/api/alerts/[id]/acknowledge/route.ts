import { acknowledgeAlert } from '@/lib/alerts'
import { NextResponse } from 'next/server'

/**
 * POST /api/alerts/[id]/acknowledge
 * Подтверждает алерт
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const success = await acknowledgeAlert(id)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Alert acknowledged',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Alert not found',
        },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error in /api/alerts/[id]/acknowledge:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
