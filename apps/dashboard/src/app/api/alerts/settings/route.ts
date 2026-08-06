import type { AlertSettings } from '@/lib/alerts'
import { getAlertSettings, saveAlertSettings } from '@/lib/alerts'
import { NextResponse } from 'next/server'

const MASKED_TOKEN = '••••••••'

/**
 * GET /api/alerts/settings
 * Возвращает настройки алертов (токен маскируется)
 */
export async function GET() {
  try {
    const settings = await getAlertSettings()

    // Маскируем токен для безопасности, но показываем что он есть
    return NextResponse.json({
      ...settings,
      telegramBotToken: settings.telegramBotToken ? MASKED_TOKEN : '',
    })
  } catch (error) {
    console.error('Error in GET /api/alerts/settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/alerts/settings
 * Сохраняет настройки алертов
 */
export async function POST(request: Request) {
  try {
    const newSettings: AlertSettings = await request.json()

    // Получаем текущие настройки для сохранения токена, если он замаскирован
    const currentSettings = await getAlertSettings()

    // Если токен замаскирован, сохраняем старый
    const settingsToSave: AlertSettings = {
      ...newSettings,
      telegramBotToken: newSettings.telegramBotToken === MASKED_TOKEN
        ? currentSettings.telegramBotToken
        : newSettings.telegramBotToken,
    }

    await saveAlertSettings(settingsToSave)

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
    })
  } catch (error) {
    console.error('Error in POST /api/alerts/settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
