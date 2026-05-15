import { sendGenericEmail } from '@letar/email'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getEmailStrings } from '@/lib/email-translations'
import { getActiveNotificationTypes, getNextMilestone, type NotificationType } from '@/lib/milestone'

/** Маппинг типа уведомления на поле подписки */
const SUBSCRIPTION_FIELD_MAP: Record<NotificationType, string> = {
  month: 'notifyMonth',
  week: 'notifyWeek',
  day: 'notifyDay',
  hour: 'notifyHour',
  '5min': 'notify5Min',
}

/** BCP 47 locale для toLocaleString по ISO 639-1 коду */
const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ar: 'ar-SA',
  ko: 'ko-KR',
  es: 'es-ES',
  pt: 'pt-BR',
  hi: 'hi-IN',
  tr: 'tr-TR',
  pl: 'pl-PL',
  uk: 'uk-UA',
  be: 'be-BY',
  kk: 'kk-KZ',
  uz: 'uz-UZ',
  tg: 'tg-TJ',
  ky: 'ky-KG',
  tk: 'tk-TM',
  az: 'az-AZ',
  hy: 'hy-AM',
  ka: 'ka-GE',
  ro: 'ro-RO',
  fa: 'fa-IR',
  bn: 'bn-BD',
  id: 'id-ID',
  ms: 'ms-MY',
  vi: 'vi-VN',
  th: 'th-TH',
  sw: 'sw-KE',
  nl: 'nl-NL',
  sv: 'sv-SE',
  it: 'it-IT',
  el: 'el-GR',
  he: 'he-IL',
  ur: 'ur-PK',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN',
}

/**
 * POST /api/cron/notifications
 *
 * Вызывается cron-задачей каждую минуту.
 * Проверяет, какие уведомления нужно отправить, и отправляет их.
 */
export async function POST(request: Request) {
  // Проверка авторизации cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nextMilestone = getNextMilestone()
  const activeTypes = getActiveNotificationTypes(nextMilestone)

  if (activeTypes.length === 0) {
    return NextResponse.json({ message: 'No notifications to send', nextMilestone })
  }

  const results: Array<{ type: string; sent: number; errors: number }> = []

  for (const type of activeTypes) {
    const fieldName = SUBSCRIPTION_FIELD_MAP[type]
    let sent = 0
    let errors = 0

    // Найти все активные подписки с включённым типом уведомления
    const subscriptions = await prisma.notificationSubscription.findMany({
      where: {
        active: true,
        [fieldName]: true,
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    })

    for (const sub of subscriptions) {
      // Проверить, не отправлялось ли уже
      const existingLog = await prisma.notificationLog.findUnique({
        where: {
          subscriptionId_milestoneHour_notificationType: {
            subscriptionId: sub.id,
            milestoneHour: nextMilestone,
            notificationType: type,
          },
        },
      })

      if (existingLog) {
        continue
      }

      // Получить переводы для языка подписки
      const strings = getEmailStrings(sub.locale)
      const timeLabel = strings.timeLabels[type]
      const milestoneFormatted = nextMilestone.toLocaleString()
      const milestoneDate = new Date(nextMilestone * 3_600_000)
      const appUrl = process.env.BETTER_AUTH_URL || 'https://time.letar.best'
      const unsubscribeUrl = `${appUrl}/unsubscribe?token=${sub.unsubscribeToken}`

      // Форматирование даты в таймзоне пользователя
      const bcp47Locale = LOCALE_BCP47[sub.locale] || 'en-US'
      const dateStr = milestoneDate.toLocaleString(bcp47Locale, {
        timeZone: sub.timezone || 'UTC',
        dateStyle: 'long',
        timeStyle: 'short',
      })

      try {
        await sendGenericEmail({
          to: sub.user.email,
          subject: strings.subject(milestoneFormatted, timeLabel),
          heading: strings.subject(milestoneFormatted, timeLabel),
          greeting: strings.greeting(sub.user.name),
          body: strings.body(milestoneFormatted, dateStr),
          buttonText: strings.buttonText,
          buttonUrl: appUrl,
          footer: strings.footer(unsubscribeUrl),
        })

        await prisma.notificationLog.create({
          data: {
            subscriptionId: sub.id,
            milestoneHour: nextMilestone,
            notificationType: type,
            success: true,
          },
        })

        sent++
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'

        await prisma.notificationLog.create({
          data: {
            subscriptionId: sub.id,
            milestoneHour: nextMilestone,
            notificationType: type,
            success: false,
            error: errorMessage,
          },
        })

        errors++
      }
    }

    results.push({ type, sent, errors })
  }

  return NextResponse.json({
    nextMilestone,
    activeTypes,
    results,
  })
}
