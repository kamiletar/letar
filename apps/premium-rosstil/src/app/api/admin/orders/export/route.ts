'use server'

import type { OrderStatus } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// Тип заказа для экспорта
type OrderExport = {
  orderNumber: string
  status: OrderStatus
  customerName: string
  customerPhone: string
  customerEmail: string | null
  deliveryAddress: string
  deliveryCity: string | null
  deliveryRegion: string | null
  deliveryPostalCode: string | null
  totalAmount: unknown
  notes: string | null
  adminNotes: string | null
  createdAt: Date
  updatedAt: Date
  user?: { name: string | null; email: string } | null
  items: Array<{
    productName: string
    variantColor: string | null
    sizeName: string | null
    quantity: number
    price: unknown
  }>
}

// Лейблы статусов заказов
const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  PROCESSING: 'В обработке',
  PREORDER: 'Предзаказ',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
}

export async function GET(request: Request) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getEnhancedPrisma(session.user)

  // Парсим URL параметры для фильтров
  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')
  const searchQuery = searchParams.get('search') || ''
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  // Строим where условие (как в page.tsx)
  const where: Record<string, unknown> = {}

  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter as OrderStatus
  }

  if (searchQuery) {
    where.OR = [
      { orderNumber: { contains: searchQuery, mode: 'insensitive' } },
      { customerName: { contains: searchQuery, mode: 'insensitive' } },
      { customerPhone: { contains: searchQuery, mode: 'insensitive' } },
      { customerEmail: { contains: searchQuery, mode: 'insensitive' } },
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

  // Получаем заказы со всеми связанными данными
  // Лимит 10000 — защита от OOM при экспорте больших объёмов данных
  const orders = (await db.order.findMany({
    where: where as never,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      items: {
        select: {
          productName: true,
          variantColor: true,
          sizeName: true,
          quantity: true,
          price: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10000,
  })) as unknown as OrderExport[]

  // Преобразуем данные для Excel
  const excelData = orders.map((order) => {
    // Форматируем товары как читаемую строку
    const itemsStr = order.items
      .map((item) => {
        let itemDesc = item.productName
        if (item.variantColor) {
          itemDesc += ` (${item.variantColor})`
        }
        if (item.sizeName) {
          itemDesc += ` - ${item.sizeName}`
        }
        itemDesc += ` x${item.quantity} = ${Number(item.price) * item.quantity} ₽`
        return itemDesc
      })
      .join('; ')

    return {
      '№ Заказа': order.orderNumber,
      Статус: STATUS_LABELS[order.status] || order.status,
      'Имя клиента': order.customerName,
      Телефон: order.customerPhone,
      Email: order.customerEmail || '',
      // Адрес доставки
      'Адрес доставки': order.deliveryAddress,
      Город: order.deliveryCity || '',
      Регион: order.deliveryRegion || '',
      Индекс: order.deliveryPostalCode || '',
      // Товары и итого
      Товары: itemsStr,
      'Кол-во позиций': order.items.length,
      'Сумма заказа': `${Number(order.totalAmount)} ₽`,
      // Заметки
      'Комментарий клиента': order.notes || '',
      'Заметки админа': order.adminNotes || '',
      // Информация о пользователе
      'Пользователь (имя)': order.user?.name || '',
      'Пользователь (email)': order.user?.email || '',
      // Даты
      Создан: new Date(order.createdAt).toLocaleString('ru-RU'),
      Обновлён: new Date(order.updatedAt).toLocaleString('ru-RU'),
    }
  })

  // Создаём книгу и лист
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(excelData)

  // Устанавливаем ширину колонок
  const colWidths = [
    { wch: 12 }, // № Заказа
    { wch: 14 }, // Статус
    { wch: 20 }, // Имя клиента
    { wch: 18 }, // Телефон
    { wch: 25 }, // Email
    { wch: 40 }, // Адрес доставки
    { wch: 15 }, // Город
    { wch: 15 }, // Регион
    { wch: 10 }, // Индекс
    { wch: 60 }, // Товары
    { wch: 12 }, // Кол-во позиций
    { wch: 15 }, // Сумма заказа
    { wch: 30 }, // Комментарий клиента
    { wch: 30 }, // Заметки админа
    { wch: 20 }, // Пользователь (имя)
    { wch: 25 }, // Пользователь (email)
    { wch: 20 }, // Создан
    { wch: 20 }, // Обновлён
  ]
  worksheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Заказы')

  // Генерируем буфер
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  // Генерируем имя файла с текущей датой
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const filename = `orders-${dateStr}.xlsx`

  // Возвращаем файл как ответ
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
