/**
 * Уведомления о поступлении товара — отправка email подписчикам.
 */

import { createEmailProvider, getConfigFromEnv } from '@letar/email'
import { logger } from './logger'

interface StockNotificationEmailData {
  /** Email получателя */
  email: string
  /** Название товара */
  productName: string
  /** Цвет варианта */
  variantColor: string
  /** Размер */
  sizeName: string
  /** Ссылка на товар */
  productUrl: string
}

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'https://premium.rosstil.ru'
}

function getProvider() {
  return createEmailProvider(getConfigFromEnv())
}

function getStockNotificationHtml(data: StockNotificationEmailData): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #CA9E67; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Товар снова в наличии!</h1>
      </div>
      <div style="padding: 20px; background: #fff;">
        <p>Отличные новости! Товар, на который вы подписались, снова доступен для заказа.</p>
        <div style="background: #f7f7f7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 4px;"><strong>${data.productName}</strong></p>
          <p style="margin: 0; color: #666; font-size: 14px;">Цвет: ${data.variantColor} · Размер: ${data.sizeName}</p>
        </div>
        <p>Спешите — количество ограничено!</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.productUrl}" style="background: #CA9E67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Перейти к товару
          </a>
        </div>
      </div>
      <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        Premium РосСтиль — Маркетплейс дизайнерской одежды
      </div>
    </div>
  `
}

/** Отправить email о поступлении товара */
export async function sendStockNotificationEmail(data: StockNotificationEmailData): Promise<void> {
  try {
    const provider = getProvider()
    await provider.sendEmail({
      to: data.email,
      subject: `🔔 ${data.productName} снова в наличии — Премиум РосСтиль`,
      html: getStockNotificationHtml(data),
      text: `Товар "${data.productName}" (${data.variantColor}, ${data.sizeName}) снова в наличии! Перейти: ${data.productUrl}`,
    })
    logger.info(`[StockNotification] Email sent to ${data.email} for ${data.productName}`)
  } catch (error) {
    logger.error('[StockNotification] Failed to send email:', error)
  }
}

/** Получить полный URL товара */
export function buildProductUrl(productId: string): string {
  return `${getBaseUrl()}/catalog/${productId}`
}
