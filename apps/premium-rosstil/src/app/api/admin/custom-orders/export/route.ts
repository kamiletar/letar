'use server'

import type { CustomOrderStatus, CustomOrderType } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// Тип заказа для экспорта
type CustomOrderExport = {
  orderNumber: string
  type: CustomOrderType
  status: CustomOrderStatus
  customerName: string
  customerPhone: string
  customerEmail: string | null
  customBust: number | null
  customWaist: number | null
  customHips: number | null
  customHeight: number | null
  customDetails: string | null
  designDescription: string | null
  preferredColor: string | null
  companyName: string | null
  companyINN: string | null
  companyAddress: string | null
  notes: string | null
  adminNotes: string | null
  createdAt: Date
  updatedAt: Date
  product?: { name: string } | null
  variant?: { color: string } | null
  productItem?: { size?: { ru: string | null; international: string | null } | null } | null
  wholesaleItems: unknown[]
}

// Labels for order types
const TYPE_LABELS: Record<CustomOrderType, string> = {
  MADE_TO_ORDER: 'На заказ',
  CUSTOM_DESIGN: 'Индивидуальный дизайн',
  B2B_PARTNERSHIP: 'Сотрудничество B2B',
}

// Labels for order statuses
const STATUS_LABELS: Record<CustomOrderStatus, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  IN_PRODUCTION: 'В производстве',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменён',
}

export async function GET(request: Request) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getEnhancedPrisma(session.user)

  // Parse URL params for filters
  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type')
  const statusFilter = searchParams.get('status')
  const searchQuery = searchParams.get('search') || ''
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  // Build where clause (same as page.tsx)
  const where: Record<string, unknown> = {}

  if (typeFilter && typeFilter !== 'ALL') {
    where.type = typeFilter as CustomOrderType
  }

  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter as CustomOrderStatus
  }

  if (searchQuery) {
    where.OR = [
      { orderNumber: { contains: searchQuery, mode: 'insensitive' } },
      { customerName: { contains: searchQuery, mode: 'insensitive' } },
      { customerPhone: { contains: searchQuery, mode: 'insensitive' } },
      { customerEmail: { contains: searchQuery, mode: 'insensitive' } },
      { companyName: { contains: searchQuery, mode: 'insensitive' } },
    ]
  }

  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {}
    if (dateFrom) {
      createdAt.gte = new Date(dateFrom)
    }
    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      createdAt.lt = endDate
    }
    where.createdAt = createdAt
  }

  // Fetch orders with all related data
  // Лимит 10000 — защита от OOM при экспорте больших объёмов данных
  const customOrders = (await db.customOrder.findMany({
    where: where as never,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          name: true,
        },
      },
      variant: {
        select: {
          color: true,
        },
      },
      productItem: {
        include: {
          size: {
            select: {
              ru: true,
              international: true,
            },
          },
        },
      },
      wholesaleItems: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10000,
  })) as unknown as CustomOrderExport[]

  // Transform data for Excel
  const excelData = customOrders.map((order) => ({
    '№ Заказа': order.orderNumber,
    Тип: TYPE_LABELS[order.type] || order.type,
    Статус: STATUS_LABELS[order.status] || order.status,
    'Имя клиента': order.customerName,
    Телефон: order.customerPhone,
    Email: order.customerEmail || '',
    Товар: order.product?.name || 'Индивидуальный дизайн',
    Цвет: order.variant?.color || '',
    Размер: order.productItem?.size?.ru || order.productItem?.size?.international || '',
    // Measurements
    Грудь: order.customBust ? `${order.customBust} см` : '',
    Талия: order.customWaist ? `${order.customWaist} см` : '',
    Бёдра: order.customHips ? `${order.customHips} см` : '',
    Рост: order.customHeight ? `${order.customHeight} см` : '',
    // Custom details
    'Детали кастомизации': order.customDetails || '',
    'Описание дизайна': order.designDescription || '',
    'Предпочитаемый цвет': order.preferredColor || '',
    // B2B fields
    'Название компании': order.companyName || '',
    ИНН: order.companyINN || '',
    'Адрес компании': order.companyAddress || '',
    // Wholesale items as JSON string
    'Оптовые позиции': order.wholesaleItems ? JSON.stringify(order.wholesaleItems) : '',
    // Notes
    Примечания: order.notes || '',
    'Заметки админа': order.adminNotes || '',
    // Dates
    Создан: new Date(order.createdAt).toLocaleString('ru-RU'),
    Обновлён: new Date(order.updatedAt).toLocaleString('ru-RU'),
  }))

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(excelData)

  // Set column widths
  const colWidths = [
    { wch: 12 }, // № Заказа
    { wch: 18 }, // Тип
    { wch: 14 }, // Статус
    { wch: 20 }, // Имя клиента
    { wch: 18 }, // Телефон
    { wch: 25 }, // Email
    { wch: 25 }, // Товар
    { wch: 12 }, // Цвет
    { wch: 10 }, // Размер
    { wch: 10 }, // Грудь
    { wch: 10 }, // Талия
    { wch: 10 }, // Бёдра
    { wch: 10 }, // Рост
    { wch: 30 }, // Детали кастомизации
    { wch: 30 }, // Описание дизайна
    { wch: 15 }, // Предпочитаемый цвет
    { wch: 25 }, // Название компании
    { wch: 15 }, // ИНН
    { wch: 30 }, // Адрес компании
    { wch: 40 }, // Оптовые позиции
    { wch: 30 }, // Примечания
    { wch: 30 }, // Заметки админа
    { wch: 20 }, // Создан
    { wch: 20 }, // Обновлён
  ]
  worksheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Заказы')

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  // Generate filename with current date
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const filename = `custom-orders-${dateStr}.xlsx`

  // Return file as response
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
