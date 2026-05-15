/**
 * Email уведомления для заказов
 *
 * Использует @letar/email для отправки через Maddy SMTP
 * Замена устаревшего email.ts с eager initialization
 */

import { createEmailProvider, getConfigFromEnv } from '@letar/email'
import { logger } from './logger'
import type { LowStockItem } from './telegram-notify'

// === Типы ===

export interface CustomOrderEmailData {
  orderNumber: string
  orderType: 'MADE_TO_ORDER' | 'CUSTOM_DESIGN' | 'B2B_PARTNERSHIP'
  customerName: string
  customerPhone: string
  customerEmail?: string
  // Product info (optional for CUSTOM_DESIGN)
  productName?: string
  variantName?: string
  // MADE_TO_ORDER specific
  sizeName?: string
  quantity?: number
  customBust?: number
  customWaist?: number
  customHips?: number
  customHeight?: number
  customDetails?: string
  // CUSTOM_DESIGN specific
  designDescription?: string
  referenceImages?: string[]
  // B2B_PARTNERSHIP specific
  companyName?: string
  companyINN?: string
  companyAddress?: string
  preferredColor?: string
  wholesaleItems?: Array<{ sizeName: string; quantity: number }>
  // Common
  notes?: string
  createdAt: Date
}

export interface CustomOrderStatusChangeEmailData {
  orderNumber: string
  orderType: 'MADE_TO_ORDER' | 'CUSTOM_DESIGN' | 'B2B_PARTNERSHIP'
  customerName: string
  newStatus: 'NEW' | 'CONFIRMED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED'
  productName?: string
  orderId: string
}

export interface OrderEmailData {
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  deliveryAddress: string
  deliveryCity?: string
  deliveryRegion?: string
  deliveryPostalCode?: string
  items: Array<{
    productName: string
    variantColor?: string
    sizeName?: string
    quantity: number
    price: number
  }>
  totalAmount: number
  notes?: string
  createdAt: Date
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

function getOrderTypeLabel(type: CustomOrderEmailData['orderType']): string {
  const labels = {
    MADE_TO_ORDER: 'На заказ',
    CUSTOM_DESIGN: 'Индивидуальный заказ',
    B2B_PARTNERSHIP: 'Сотрудничество (B2B)',
  }
  return labels[type]
}

function getStatusLabel(status: CustomOrderStatusChangeEmailData['newStatus']): {
  label: string
  emoji: string
  color: string
} {
  const labels = {
    NEW: { label: 'Новый', emoji: '🆕', color: '#3182ce' },
    CONFIRMED: { label: 'Подтверждён', emoji: '✅', color: '#38a169' },
    IN_PRODUCTION: { label: 'В производстве', emoji: '🧵', color: '#d69e2e' },
    COMPLETED: { label: 'Выполнен', emoji: '🎉', color: '#48bb78' },
    CANCELLED: { label: 'Отменён', emoji: '❌', color: '#e53e3e' },
  }
  return labels[status]
}

// === Lazy email provider (создаётся только при вызове) ===

function getProvider() {
  return createEmailProvider(getConfigFromEnv())
}

// === Шаблоны Custom Order ===

function getCustomOrderAdminEmailHtml(data: CustomOrderEmailData): string {
  const orderTypeLabel = getOrderTypeLabel(data.orderType)
  const adminUrl = `${getBaseUrl()}/admin/custom-orders`

  let orderDetails = ''

  if (data.orderType === 'MADE_TO_ORDER') {
    orderDetails = `
      ${
        data.sizeName
          ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Размер:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.sizeName}</td>
      </tr>
      `
          : ''
      }
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Обхват груди:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customBust} см</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Обхват талии:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customWaist} см</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Обхват бёдер:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customHips} см</td>
      </tr>
      ${
        data.customHeight
          ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Рост:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customHeight} см</td>
      </tr>
      `
          : ''
      }
      ${
        data.customDetails
          ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Детали кастомизации:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customDetails}</td>
      </tr>
      `
          : ''
      }
    `
  } else if (data.orderType === 'CUSTOM_DESIGN') {
    orderDetails = `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Обхват груди:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customBust} см</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Обхват талии:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customWaist} см</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Обхват бёдер:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customHips} см</td>
      </tr>
      ${
        data.customHeight
          ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Рост:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customHeight} см</td>
      </tr>
      `
          : ''
      }
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Описание дизайна:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.designDescription || '—'}</td>
      </tr>
      ${
        data.referenceImages?.length
          ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Фото-ориентиры:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.referenceImages.length} фото</td>
      </tr>
      `
          : ''
      }
    `
  } else if (data.orderType === 'B2B_PARTNERSHIP') {
    const itemsHtml = data.wholesaleItems?.length
      ? data.wholesaleItems.map((item) => `${item.sizeName}: ${item.quantity} шт.`).join('<br>')
      : '—'

    orderDetails = `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Компания:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.companyName || '—'}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>ИНН:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.companyINN || '—'}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Адрес:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.companyAddress || '—'}</td>
      </tr>
      ${
        data.preferredColor
          ? `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Предпочитаемый цвет:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.preferredColor}</td>
      </tr>
      `
          : ''
      }
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Позиции заказа:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${itemsHtml}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Общее кол-во:</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.quantity || 0} шт.</td>
      </tr>
    `
  }

  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Новый специальный заказ</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; border-radius: 10px; padding: 30px;">
        <h1 style="color: #CA9E67; margin-bottom: 10px; text-align: center;">Premium РосСтиль</h1>
        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">🔔 Новый специальный заказ</h2>

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;">
            <span style="display: inline-block; background-color: #CA9E67; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px;">
              ${orderTypeLabel}
            </span>
          </p>
          <p style="font-size: 18px; font-weight: bold; margin: 0;">
            Заказ №${data.orderNumber}
          </p>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">
            ${formatDate(data.createdAt)}
          </p>
        </div>

        ${
          data.productName
            ? `
        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📦 Товар</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Название:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.productName}</td>
            </tr>
            ${
              data.variantName
                ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Цвет:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.variantName}</td>
            </tr>
            `
                : ''
            }
            ${orderDetails}
          </table>
        </div>
        `
            : `
        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">✂️ Детали заказа</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${orderDetails}
          </table>
        </div>
        `
        }

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">👤 Контактные данные</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Имя:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Телефон:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <a href="tel:${data.customerPhone}" style="color: #CA9E67;">${data.customerPhone}</a>
              </td>
            </tr>
            ${
              data.customerEmail
                ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <a href="mailto:${data.customerEmail}" style="color: #CA9E67;">${data.customerEmail}</a>
              </td>
            </tr>
            `
                : ''
            }
          </table>
        </div>

        ${
          data.notes
            ? `
        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📝 Комментарий клиента</h3>
          <p style="margin: 0; color: #666;">${data.notes}</p>
        </div>
        `
            : ''
        }

        <div style="text-align: center; margin-top: 20px;">
          <a href="${adminUrl}"
             style="display: inline-block; background-color: #CA9E67; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Открыть в админке
          </a>
        </div>

        <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
          Это автоматическое уведомление от сайта Premium РосСтиль
        </p>
      </div>
    </body>
    </html>
  `
}

function getCustomOrderAdminEmailText(data: CustomOrderEmailData): string {
  const orderTypeLabel = getOrderTypeLabel(data.orderType)

  let orderDetails = ''

  if (data.orderType === 'MADE_TO_ORDER') {
    orderDetails = `${data.sizeName ? `Размер: ${data.sizeName}\n` : ''}Обхват груди: ${data.customBust} см
Обхват талии: ${data.customWaist} см
Обхват бёдер: ${data.customHips} см${data.customHeight ? `\nРост: ${data.customHeight} см` : ''}${
      data.customDetails ? `\nДетали кастомизации: ${data.customDetails}` : ''
    }`
  } else if (data.orderType === 'CUSTOM_DESIGN') {
    orderDetails = `Обхват груди: ${data.customBust} см
Обхват талии: ${data.customWaist} см
Обхват бёдер: ${data.customHips} см${data.customHeight ? `\nРост: ${data.customHeight} см` : ''}
Описание дизайна: ${data.designDescription || '—'}${
      data.referenceImages?.length ? `\nФото-ориентиры: ${data.referenceImages.length} фото` : ''
    }`
  } else if (data.orderType === 'B2B_PARTNERSHIP') {
    const itemsText = data.wholesaleItems?.length
      ? data.wholesaleItems.map((item) => `  - ${item.sizeName}: ${item.quantity} шт.`).join('\n')
      : '—'

    orderDetails = `Компания: ${data.companyName || '—'}
ИНН: ${data.companyINN || '—'}
Адрес: ${data.companyAddress || '—'}${data.preferredColor ? `\nПредпочитаемый цвет: ${data.preferredColor}` : ''}
Позиции заказа:
${itemsText}
Общее количество: ${data.quantity || 0} шт.`
  }

  const productSection = data.productName
    ? `ТОВАР
-----
Название: ${data.productName}${data.variantName ? `\nЦвет: ${data.variantName}` : ''}
${orderDetails}`
    : `ДЕТАЛИ ЗАКАЗА
-------------
${orderDetails}`

  return `
НОВЫЙ СПЕЦИАЛЬНЫЙ ЗАКАЗ
========================

${orderTypeLabel}
Заказ №${data.orderNumber}
Дата: ${formatDate(data.createdAt)}

${productSection}

КОНТАКТНЫЕ ДАННЫЕ
-----------------
Имя: ${data.customerName}
Телефон: ${data.customerPhone}${data.customerEmail ? `\nEmail: ${data.customerEmail}` : ''}
${data.notes ? `\nКОММЕНТАРИЙ КЛИЕНТА\n-------------------\n${data.notes}` : ''}

---
Это автоматическое уведомление от сайта Premium РосСтиль
  `.trim()
}

// === Шаблоны Status Change ===

function getCustomOrderStatusChangeEmailHtml(data: CustomOrderStatusChangeEmailData): string {
  const orderTypeLabel = getOrderTypeLabel(data.orderType)
  const statusInfo = getStatusLabel(data.newStatus)
  const orderUrl = `${getBaseUrl()}/profile/custom-orders`

  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Статус заказа изменён</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; border-radius: 10px; padding: 30px;">
        <h1 style="color: #CA9E67; margin-bottom: 10px; text-align: center;">Premium РосСтиль</h1>
        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">${statusInfo.emoji} Статус заказа изменён</h2>

        <p style="font-size: 16px; margin-bottom: 20px;">
          Здравствуйте, ${data.customerName}!
        </p>

        <p style="font-size: 16px; margin-bottom: 30px;">
          Статус вашего заказа был изменён.
        </p>

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Номер заказа:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">№${data.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Тип заказа:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${orderTypeLabel}</td>
            </tr>
            ${
              data.productName
                ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Товар:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.productName}</td>
            </tr>
            `
                : ''
            }
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Новый статус:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <span style="display: inline-block; background-color: ${statusInfo.color}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px;">
                  ${statusInfo.emoji} ${statusInfo.label}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <a href="${orderUrl}"
             style="display: inline-block; background-color: #CA9E67; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Посмотреть заказы
          </a>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Если у вас есть вопросы, свяжитесь с нами по телефону или email.
        </p>

        <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
          Это автоматическое уведомление от сайта Premium РосСтиль
        </p>
      </div>
    </body>
    </html>
  `
}

function getCustomOrderStatusChangeEmailText(data: CustomOrderStatusChangeEmailData): string {
  const orderTypeLabel = getOrderTypeLabel(data.orderType)
  const statusInfo = getStatusLabel(data.newStatus)

  return `
СТАТУС ЗАКАЗА ИЗМЕНЁН
=====================

Здравствуйте, ${data.customerName}!

Статус вашего заказа был изменён.

Номер заказа: №${data.orderNumber}
Тип заказа: ${orderTypeLabel}${data.productName ? `\nТовар: ${data.productName}` : ''}
Новый статус: ${statusInfo.emoji} ${statusInfo.label}

Посмотреть заказы: ${getBaseUrl()}/profile/custom-orders

Если у вас есть вопросы, свяжитесь с нами по телефону или email.

---
Это автоматическое уведомление от сайта Premium РосСтиль
  `.trim()
}

// === Шаблоны Order (корзина) ===

function getOrderAdminEmailHtml(data: OrderEmailData): string {
  const adminUrl = `${getBaseUrl()}/admin/orders`

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">
          ${item.productName}
          ${item.variantColor ? `<br><small style="color: #666;">Цвет: ${item.variantColor}</small>` : ''}
          ${item.sizeName ? `<br><small style="color: #666;">Размер: ${item.sizeName}</small>` : ''}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(
          item.price * item.quantity
        )}</td>
      </tr>
    `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Новый заказ</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; border-radius: 10px; padding: 30px;">
        <h1 style="color: #CA9E67; margin-bottom: 10px; text-align: center;">Premium РосСтиль</h1>
        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">🛒 Новый заказ</h2>

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <p style="font-size: 18px; font-weight: bold; margin: 0;">
            Заказ №${data.orderNumber}
          </p>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">
            ${formatDate(data.createdAt)}
          </p>
        </div>

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📦 Товары</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8f8f8;">
                <th style="padding: 8px; text-align: left;">Товар</th>
                <th style="padding: 8px; text-align: center;">Кол-во</th>
                <th style="padding: 8px; text-align: right;">Цена</th>
                <th style="padding: 8px; text-align: right;">Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f8f8f8; font-weight: bold;">
                <td colspan="3" style="padding: 12px 8px; text-align: right;">Итого:</td>
                <td style="padding: 12px 8px; text-align: right; color: #CA9E67; font-size: 18px;">${formatPrice(
                  data.totalAmount
                )}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">👤 Покупатель</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Имя:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Телефон:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <a href="tel:${data.customerPhone}" style="color: #CA9E67;">${data.customerPhone}</a>
              </td>
            </tr>
            ${
              data.customerEmail
                ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <a href="mailto:${data.customerEmail}" style="color: #CA9E67;">${data.customerEmail}</a>
              </td>
            </tr>
            `
                : ''
            }
          </table>
        </div>

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">🚚 Доставка</h3>
          <p style="margin: 0; color: #333;">${data.deliveryAddress}</p>
          ${
            data.deliveryCity
              ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${data.deliveryCity}${
                  data.deliveryRegion ? `, ${data.deliveryRegion}` : ''
                }${data.deliveryPostalCode ? `, ${data.deliveryPostalCode}` : ''}</p>`
              : ''
          }
        </div>

        ${
          data.notes
            ? `
        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📝 Комментарий</h3>
          <p style="margin: 0; color: #666;">${data.notes}</p>
        </div>
        `
            : ''
        }

        <div style="text-align: center; margin-top: 20px;">
          <a href="${adminUrl}"
             style="display: inline-block; background-color: #CA9E67; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Открыть в админке
          </a>
        </div>

        <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
          Это автоматическое уведомление от сайта Premium РосСтиль
        </p>
      </div>
    </body>
    </html>
  `
}

function getOrderAdminEmailText(data: OrderEmailData): string {
  const itemsText = data.items
    .map(
      (item) =>
        `• ${item.productName}${item.variantColor ? ` (${item.variantColor})` : ''}${
          item.sizeName ? ` - ${item.sizeName}` : ''
        }: ${item.quantity} шт. × ${formatPrice(item.price)} = ${formatPrice(item.price * item.quantity)}`
    )
    .join('\n')

  return `
НОВЫЙ ЗАКАЗ
===========

Заказ №${data.orderNumber}
Дата: ${formatDate(data.createdAt)}

ТОВАРЫ
------
${itemsText}

Итого: ${formatPrice(data.totalAmount)}

ПОКУПАТЕЛЬ
----------
Имя: ${data.customerName}
Телефон: ${data.customerPhone}${data.customerEmail ? `\nEmail: ${data.customerEmail}` : ''}

ДОСТАВКА
--------
${data.deliveryAddress}${
    data.deliveryCity
      ? `\n${data.deliveryCity}${data.deliveryRegion ? `, ${data.deliveryRegion}` : ''}${
          data.deliveryPostalCode ? `, ${data.deliveryPostalCode}` : ''
        }`
      : ''
  }
${data.notes ? `\nКОММЕНТАРИЙ\n-----------\n${data.notes}` : ''}

---
Это автоматическое уведомление от сайта Premium РосСтиль
  `.trim()
}

function getOrderConfirmationEmailHtml(data: OrderEmailData): string {
  const ordersUrl = `${getBaseUrl()}/profile/orders`

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">
          ${item.productName}
          ${item.variantColor ? `<br><small style="color: #666;">Цвет: ${item.variantColor}</small>` : ''}
          ${item.sizeName ? `<br><small style="color: #666;">Размер: ${item.sizeName}</small>` : ''}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(
          item.price * item.quantity
        )}</td>
      </tr>
    `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ваш заказ принят</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; border-radius: 10px; padding: 30px;">
        <h1 style="color: #CA9E67; margin-bottom: 10px; text-align: center;">Premium РосСтиль</h1>
        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">✅ Ваш заказ принят!</h2>

        <p style="font-size: 16px; margin-bottom: 20px;">
          Здравствуйте, ${data.customerName}!
        </p>

        <p style="font-size: 16px; margin-bottom: 30px;">
          Спасибо за ваш заказ! Мы получили его и скоро свяжемся с вами для подтверждения.
        </p>

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <p style="font-size: 18px; font-weight: bold; margin: 0;">
            Заказ №${data.orderNumber}
          </p>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">
            ${formatDate(data.createdAt)}
          </p>
        </div>

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📦 Ваш заказ</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8f8f8;">
                <th style="padding: 8px; text-align: left;">Товар</th>
                <th style="padding: 8px; text-align: center;">Кол-во</th>
                <th style="padding: 8px; text-align: right;">Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f8f8f8; font-weight: bold;">
                <td colspan="2" style="padding: 12px 8px; text-align: right;">Итого:</td>
                <td style="padding: 12px 8px; text-align: right; color: #CA9E67; font-size: 18px;">${formatPrice(
                  data.totalAmount
                )}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">🚚 Адрес доставки</h3>
          <p style="margin: 0; color: #333;">${data.deliveryAddress}</p>
          ${
            data.deliveryCity
              ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${data.deliveryCity}${
                  data.deliveryRegion ? `, ${data.deliveryRegion}` : ''
                }${data.deliveryPostalCode ? `, ${data.deliveryPostalCode}` : ''}</p>`
              : ''
          }
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <a href="${ordersUrl}"
             style="display: inline-block; background-color: #CA9E67; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Посмотреть мои заказы
          </a>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Если у вас есть вопросы, свяжитесь с нами по телефону или email.
        </p>

        <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
          Это автоматическое уведомление от сайта Premium РосСтиль
        </p>
      </div>
    </body>
    </html>
  `
}

function getOrderConfirmationEmailText(data: OrderEmailData): string {
  const itemsText = data.items
    .map(
      (item) =>
        `• ${item.productName}${item.variantColor ? ` (${item.variantColor})` : ''}${
          item.sizeName ? ` - ${item.sizeName}` : ''
        }: ${item.quantity} шт. = ${formatPrice(item.price * item.quantity)}`
    )
    .join('\n')

  return `
ВАШ ЗАКАЗ ПРИНЯТ!
=================

Здравствуйте, ${data.customerName}!

Спасибо за ваш заказ! Мы получили его и скоро свяжемся с вами для подтверждения.

Заказ №${data.orderNumber}
Дата: ${formatDate(data.createdAt)}

ВАШИ ТОВАРЫ
-----------
${itemsText}

Итого: ${formatPrice(data.totalAmount)}

АДРЕС ДОСТАВКИ
--------------
${data.deliveryAddress}${
    data.deliveryCity
      ? `\n${data.deliveryCity}${data.deliveryRegion ? `, ${data.deliveryRegion}` : ''}${
          data.deliveryPostalCode ? `, ${data.deliveryPostalCode}` : ''
        }`
      : ''
  }

Посмотреть заказы: ${getBaseUrl()}/profile/orders

Если у вас есть вопросы, свяжитесь с нами по телефону или email.

---
Это автоматическое уведомление от сайта Premium РосСтиль
  `.trim()
}

// === Функции отправки ===

/**
 * Отправить уведомление админу о новом заказе из корзины
 */
export async function sendOrderAdminNotification(data: OrderEmailData) {
  const adminEmail = process.env.ADMIN_EMAIL

  if (!adminEmail) {
    logger.warn('[Email] ADMIN_EMAIL not set, skipping order notification')
    return { success: false, error: 'ADMIN_EMAIL not configured' }
  }

  const provider = getProvider()
  const subject = `🛒 Новый заказ №${data.orderNumber} - Premium РосСтиль`
  const html = getOrderAdminEmailHtml(data)
  const text = getOrderAdminEmailText(data)

  const result = await provider.sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
  })

  if (result.success) {
    logger.info(`[Email] Order notification sent for order ${data.orderNumber}`)
  } else {
    logger.error(`[Email] Failed to send order notification for order ${data.orderNumber}:`, result.error)
  }

  return result
}

/**
 * Отправить подтверждение заказа клиенту
 */
export async function sendOrderConfirmationToCustomer(customerEmail: string, data: OrderEmailData) {
  if (!customerEmail) {
    logger.warn('[Email] Customer email not provided, skipping order confirmation')
    return { success: false, error: 'Customer email not provided' }
  }

  const provider = getProvider()
  const subject = `✅ Ваш заказ №${data.orderNumber} принят - Premium РосСтиль`
  const html = getOrderConfirmationEmailHtml(data)
  const text = getOrderConfirmationEmailText(data)

  const result = await provider.sendEmail({
    to: customerEmail,
    subject,
    html,
    text,
  })

  if (result.success) {
    logger.info(`[Email] Order confirmation sent for order ${data.orderNumber} to ${customerEmail}`)
  } else {
    logger.error(`[Email] Failed to send order confirmation for order ${data.orderNumber}:`, result.error)
  }

  return result
}

/**
 * Отправить уведомление админу о новом специальном заказе
 */
export async function sendCustomOrderAdminNotification(data: CustomOrderEmailData) {
  const adminEmail = process.env.ADMIN_EMAIL

  if (!adminEmail) {
    logger.warn('[Email] ADMIN_EMAIL not set, skipping custom order notification')
    return { success: false, error: 'ADMIN_EMAIL not configured' }
  }

  const orderTypeLabels = {
    MADE_TO_ORDER: 'на заказ',
    CUSTOM_DESIGN: 'индивидуального дизайна',
    B2B_PARTNERSHIP: 'B2B сотрудничества',
  }

  const provider = getProvider()
  const subject = `🔔 Новый заказ ${orderTypeLabels[data.orderType]} №${data.orderNumber} - Premium РосСтиль`
  const html = getCustomOrderAdminEmailHtml(data)
  const text = getCustomOrderAdminEmailText(data)

  const result = await provider.sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
  })

  if (result.success) {
    logger.info(`[Email] Custom order notification sent for order ${data.orderNumber}`)
  } else {
    logger.error(`[Email] Failed to send custom order notification for order ${data.orderNumber}:`, result.error)
  }

  return result
}

/**
 * Отправить уведомление клиенту об изменении статуса заказа
 */
export async function sendCustomOrderStatusChangeNotification(
  customerEmail: string,
  data: CustomOrderStatusChangeEmailData
) {
  if (!customerEmail) {
    logger.warn('[Email] Customer email not provided, skipping status change notification')
    return { success: false, error: 'Customer email not provided' }
  }

  const statusLabels = {
    NEW: 'Новый',
    CONFIRMED: 'Подтверждён',
    IN_PRODUCTION: 'В производстве',
    COMPLETED: 'Выполнен',
    CANCELLED: 'Отменён',
  }

  const provider = getProvider()
  const subject = `📦 Статус заказа №${data.orderNumber} изменён: ${statusLabels[data.newStatus]} - Premium РосСтиль`
  const html = getCustomOrderStatusChangeEmailHtml(data)
  const text = getCustomOrderStatusChangeEmailText(data)

  const result = await provider.sendEmail({
    to: customerEmail,
    subject,
    html,
    text,
  })

  if (result.success) {
    logger.info(`[Email] Status change notification sent for order ${data.orderNumber} to ${customerEmail}`)
  } else {
    logger.error(`[Email] Failed to send status change notification for order ${data.orderNumber}:`, result.error)
  }

  return result
}

// === Уведомления о низких остатках ===

function getLowStockAdminEmailHtml(items: LowStockItem[]): string {
  const adminUrl = `${getBaseUrl()}/admin/products`

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.variantColor}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.sizeName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; color: #e53e3e; font-weight: bold;">${item.availableCount} шт.</td>
      </tr>
    `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Низкие остатки товаров</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; border-radius: 10px; padding: 30px;">
        <h1 style="color: #CA9E67; margin-bottom: 10px; text-align: center;">Premium РосСтиль</h1>
        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">⚠️ Низкие остатки товаров</h2>

        <p style="font-size: 16px; margin-bottom: 20px;">
          Следующие позиции имеют остаток ниже порога. Рекомендуется пополнить запасы.
        </p>

        <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8f8f8;">
                <th style="padding: 8px; text-align: left;">Товар</th>
                <th style="padding: 8px; text-align: left;">Цвет</th>
                <th style="padding: 8px; text-align: left;">Размер</th>
                <th style="padding: 8px; text-align: center;">Остаток</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <a href="${adminUrl}"
             style="display: inline-block; background-color: #CA9E67; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Управление товарами
          </a>
        </div>

        <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
          Это автоматическое уведомление от сайта Premium РосСтиль
        </p>
      </div>
    </body>
    </html>
  `
}

function getLowStockAdminEmailText(items: LowStockItem[]): string {
  const itemsText = items
    .map((item) => `• ${item.productName} (${item.variantColor}, ${item.sizeName}): ${item.availableCount} шт.`)
    .join('\n')

  return `
НИЗКИЕ ОСТАТКИ ТОВАРОВ
======================

Следующие позиции имеют остаток ниже порога:

${itemsText}

Рекомендуется пополнить запасы.

Управление товарами: ${getBaseUrl()}/admin/products

---
Это автоматическое уведомление от сайта Premium РосСтиль
  `.trim()
}

/**
 * Отправить уведомление админу о низких остатках товаров по email
 */
export async function sendLowStockAdminNotification(items: LowStockItem[]) {
  const adminEmail = process.env.ADMIN_EMAIL

  if (!adminEmail) {
    logger.warn('[Email] ADMIN_EMAIL not set, skipping low stock notification')
    return { success: false, error: 'ADMIN_EMAIL not configured' }
  }

  if (items.length === 0) {
    return { success: true }
  }

  const provider = getProvider()
  const subject = `⚠️ Низкие остатки: ${items.length} позиций — Premium РосСтиль`
  const html = getLowStockAdminEmailHtml(items)
  const text = getLowStockAdminEmailText(items)

  const result = await provider.sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
  })

  if (result.success) {
    logger.info(`[Email] Low stock notification sent for ${items.length} items`)
  } else {
    logger.error('[Email] Failed to send low stock notification:', result.error)
  }

  return result
}
