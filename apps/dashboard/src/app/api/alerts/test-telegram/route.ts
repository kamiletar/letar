import { getAlertSettings } from '@/lib/alerts'
import { testTelegramNotification } from '@/lib/notifications'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/alerts/test-telegram
 * Тестирование Telegram уведомлений
 */
export async function POST() {
  try {
    const settings = await getAlertSettings()

    if (!settings.telegramEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Telegram notifications are disabled',
        },
        { status: 400 }
      )
    }

    if (!settings.telegramBotToken || !settings.telegramChatId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Telegram bot token or chat ID not configured',
        },
        { status: 400 }
      )
    }

    const result = await testTelegramNotification(settings.telegramBotToken, settings.telegramChatId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error testing Telegram:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
