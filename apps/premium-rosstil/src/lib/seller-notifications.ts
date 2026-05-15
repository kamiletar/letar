/**
 * Уведомления для продавцов — Email + Telegram
 *
 * Покрывает:
 * - Новый подзаказ (SubOrder)
 * - Одобрение/отклонение заявки (SellerApplication)
 * - Выплата (Payout)
 */

import { createEmailProvider, getConfigFromEnv } from '@letar/email'
import { logger } from './logger'

// === Типы ===

export interface SellerSubOrderNotificationData {
  /** Номер основного заказа */
  orderNumber: string
  /** ID подзаказа */
  subOrderId: string
  /** Имя покупателя */
  customerName: string
  /** Товары в подзаказе */
  items: Array<{
    productName: string
    variantColor?: string
    sizeName?: string
    quantity: number
    price: number
  }>
  /** Итого по подзаказу */
  totalAmount: number
  /** Комиссия площадки */
  commissionAmount: number
  /** Сумма к выплате продавцу */
  sellerAmount: number
  /** Дата создания */
  createdAt: Date
}

export interface SellerApplicationNotificationData {
  /** Имя магазина из заявки */
  shopName: string
  /** Email продавца */
  contactEmail: string
}

export interface SellerPayoutNotificationData {
  /** Название магазина */
  shopName: string
  /** Сумма выплаты */
  amount: number
  /** Дата выплаты */
  paidAt: Date
}

// === Хелперы ===

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'https://premium.rosstil.ru'
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

function getProvider() {
  return createEmailProvider(getConfigFromEnv())
}

const TELEGRAM_BOT_TOKEN = process.env.AUTH_TELEGRAM_BOT_TOKEN

async function sendTelegram(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn('[Telegram] AUTH_TELEGRAM_BOT_TOKEN not set, skipping seller notification')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })

    const result = await response.json()
    if (!response.ok || !result.ok) {
      logger.error('[Telegram] Seller notification failed:', result)
    }
  } catch (error) {
    logger.error('[Telegram] Seller notification error:', error)
  }
}

// === Email: Новый подзаказ ===

function getSubOrderEmailHtml(data: SellerSubOrderNotificationData): string {
  const sellerUrl = `${getBaseUrl()}/seller/orders`

  const itemsRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}${
        item.variantColor ? ` (${item.variantColor})` : ''
      }${item.sizeName ? `, ${item.sizeName}` : ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(
        item.price * item.quantity
      )}</td>
    </tr>
  `
    )
    .join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #CA9E67; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Новый заказ</h1>
      </div>
      <div style="padding: 20px; background: #fff;">
        <p>У вас новый заказ от покупателя <strong>${data.customerName}</strong>.</p>
        <p style="color: #666; font-size: 14px;">Заказ №${data.orderNumber} от ${formatDate(data.createdAt)}</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f7f7f7;">
              <th style="padding: 8px; text-align: left;">Товар</th>
              <th style="padding: 8px; text-align: center;">Кол-во</th>
              <th style="padding: 8px; text-align: right;">Сумма</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>

        <table style="width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 4px 0; color: #666;">Итого:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: bold;">${formatPrice(data.totalAmount)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #666;">Комиссия площадки:</td>
            <td style="padding: 4px 0; text-align: right; color: #e53e3e;">−${formatPrice(data.commissionAmount)}</td>
          </tr>
          <tr style="border-top: 2px solid #CA9E67;">
            <td style="padding: 8px 0; font-weight: bold;">Ваш доход:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #38a169; font-size: 18px;">${formatPrice(
              data.sellerAmount
            )}</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${sellerUrl}" style="background: #CA9E67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Посмотреть заказы
          </a>
        </div>
      </div>
      <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        Premium РосСтиль — Маркетплейс дизайнерской одежды
      </div>
    </div>
  `
}

export async function sendSellerSubOrderEmail(
  sellerEmail: string,
  data: SellerSubOrderNotificationData
): Promise<void> {
  try {
    const provider = getProvider()
    const itemsText = data.items
      .map((i) => `${i.productName} × ${i.quantity} = ${formatPrice(i.price * i.quantity)}`)
      .join('\n')
    await provider.sendEmail({
      to: sellerEmail,
      subject: `🛒 Новый заказ №${data.orderNumber} — ${formatPrice(data.sellerAmount)}`,
      html: getSubOrderEmailHtml(data),
      text: `Новый заказ №${data.orderNumber}\n\nПокупатель: ${data.customerName}\n\n${itemsText}\n\nИтого: ${formatPrice(
        data.totalAmount
      )}\nКомиссия: ${formatPrice(data.commissionAmount)}\nВаш доход: ${formatPrice(data.sellerAmount)}`,
    })
    logger.info(`[Email] Seller sub-order notification sent to ${sellerEmail}`)
  } catch (error) {
    logger.error('[Email] Failed to send seller sub-order notification:', error)
  }
}

// === Telegram: Новый подзаказ ===

export async function sendSellerSubOrderTelegram(chatId: string, data: SellerSubOrderNotificationData): Promise<void> {
  const items = data.items
    .map(
      (i) =>
        `• ${i.productName}${i.variantColor ? ` (${i.variantColor})` : ''} × ${i.quantity} = ${formatPrice(
          i.price * i.quantity
        )}`
    )
    .join('\n')

  const text = `🛒 <b>Новый заказ №${data.orderNumber}</b>

👤 Покупатель: ${data.customerName}
📅 ${formatDate(data.createdAt)}

📦 Товары:
${items}

💰 Итого: ${formatPrice(data.totalAmount)}
📊 Комиссия: −${formatPrice(data.commissionAmount)}
✅ <b>Ваш доход: ${formatPrice(data.sellerAmount)}</b>`

  await sendTelegram(chatId, text)
}

// === Email: Заявка одобрена ===

function getApplicationApprovedHtml(data: SellerApplicationNotificationData): string {
  const sellerUrl = `${getBaseUrl()}/seller`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #38a169; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Заявка одобрена!</h1>
      </div>
      <div style="padding: 20px; background: #fff;">
        <p>Поздравляем! Ваша заявка на создание магазина <strong>${data.shopName}</strong> одобрена.</p>
        <p>Теперь вы можете:</p>
        <ul>
          <li>Добавлять товары в каталог</li>
          <li>Управлять заказами</li>
          <li>Отслеживать финансы и запрашивать выплаты</li>
        </ul>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${sellerUrl}" style="background: #CA9E67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Перейти в панель продавца
          </a>
        </div>
      </div>
      <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        Premium РосСтиль — Маркетплейс дизайнерской одежды
      </div>
    </div>
  `
}

export async function sendApplicationApprovedEmail(data: SellerApplicationNotificationData): Promise<void> {
  try {
    const provider = getProvider()
    await provider.sendEmail({
      to: data.contactEmail,
      subject: `✅ Ваша заявка на магазин "${data.shopName}" одобрена`,
      html: getApplicationApprovedHtml(data),
      text: `Поздравляем! Ваша заявка на магазин "${data.shopName}" одобрена. Перейдите в панель продавца: ${getBaseUrl()}/seller`,
    })
    logger.info(`[Email] Application approved notification sent to ${data.contactEmail}`)
  } catch (error) {
    logger.error('[Email] Failed to send application approved notification:', error)
  }
}

// === Email: Заявка отклонена ===

function getApplicationRejectedHtml(data: SellerApplicationNotificationData & { reviewNote?: string }): string {
  const retryUrl = `${getBaseUrl()}/become-seller`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #e53e3e; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Заявка отклонена</h1>
      </div>
      <div style="padding: 20px; background: #fff;">
        <p>К сожалению, ваша заявка на создание магазина <strong>${data.shopName}</strong> была отклонена.</p>
        ${
          data.reviewNote
            ? `<p style="background: #fff5f5; padding: 12px; border-left: 4px solid #e53e3e; margin: 16px 0;"><strong>Причина:</strong> ${data.reviewNote}</p>`
            : ''
        }
        <p>Вы можете исправить указанные замечания и подать заявку повторно.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${retryUrl}" style="background: #CA9E67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Подать заявку повторно
          </a>
        </div>
      </div>
      <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        Premium РосСтиль — Маркетплейс дизайнерской одежды
      </div>
    </div>
  `
}

export async function sendApplicationRejectedEmail(
  data: SellerApplicationNotificationData & { reviewNote?: string }
): Promise<void> {
  try {
    const provider = getProvider()
    await provider.sendEmail({
      to: data.contactEmail,
      subject: `❌ Заявка на магазин "${data.shopName}" отклонена`,
      html: getApplicationRejectedHtml(data),
      text: `Заявка на магазин "${data.shopName}" отклонена.${
        data.reviewNote ? ` Причина: ${data.reviewNote}` : ''
      } Подать повторно: ${getBaseUrl()}/become-seller`,
    })
    logger.info(`[Email] Application rejected notification sent to ${data.contactEmail}`)
  } catch (error) {
    logger.error('[Email] Failed to send application rejected notification:', error)
  }
}

// === Email: Выплата выполнена ===

function getPayoutCompletedHtml(data: SellerPayoutNotificationData): string {
  const financesUrl = `${getBaseUrl()}/seller/finances`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #38a169; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Выплата выполнена</h1>
      </div>
      <div style="padding: 20px; background: #fff;">
        <p>Вам была выполнена выплата за продажи в магазине <strong>${data.shopName}</strong>.</p>
        <div style="background: #f0fff4; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <p style="color: #666; margin: 0 0 4px;">Сумма выплаты</p>
          <p style="font-size: 28px; font-weight: bold; color: #38a169; margin: 0;">${formatPrice(data.amount)}</p>
          <p style="color: #999; font-size: 12px; margin: 4px 0 0;">${formatDate(data.paidAt)}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${financesUrl}" style="background: #CA9E67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Посмотреть финансы
          </a>
        </div>
      </div>
      <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        Premium РосСтиль — Маркетплейс дизайнерской одежды
      </div>
    </div>
  `
}

export async function sendPayoutCompletedEmail(sellerEmail: string, data: SellerPayoutNotificationData): Promise<void> {
  try {
    const provider = getProvider()
    await provider.sendEmail({
      to: sellerEmail,
      subject: `💰 Выплата ${formatPrice(data.amount)} — ${data.shopName}`,
      html: getPayoutCompletedHtml(data),
      text: `Выплата ${formatPrice(data.amount)} выполнена. Магазин: ${data.shopName}. Дата: ${formatDate(
        data.paidAt
      )}`,
    })
    logger.info(`[Email] Payout notification sent to ${sellerEmail}`)
  } catch (error) {
    logger.error('[Email] Failed to send payout notification:', error)
  }
}

// === Telegram: Выплата выполнена ===

export async function sendPayoutCompletedTelegram(chatId: string, data: SellerPayoutNotificationData): Promise<void> {
  const text = `💰 <b>Выплата выполнена</b>

Магазин: ${data.shopName}
Сумма: <b>${formatPrice(data.amount)}</b>
Дата: ${formatDate(data.paidAt)}`

  await sendTelegram(chatId, text)
}
