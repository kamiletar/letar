'use server'

import { getOrmClient } from '../../lib/db-orm'

/**
 * Поиск товара по GTIN
 */
export async function findProductByGtin(gtin: string) {
  const db = await getOrmClient()
  return db.product.findFirst({
    where: {
      OR: [{ gtin }, { gtin: gtin.slice(1) }],
    },
  })
}

/**
 * Создание нового товара
 */
export async function createProduct(data: {
  name: string
  gtin: string
  articleCode?: string | null
  composition?: string | null
  color?: string | null
  size?: string | null
}) {
  const db = await getOrmClient()
  return db.product.create({
    data: {
      name: data.name,
      gtin: data.gtin,
      articleCode: data.articleCode || null,
      composition: data.composition || null,
      color: data.color || null,
      size: data.size || null,
    },
  })
}

/**
 * Проверка: был ли этот код уже напечатан
 */
export async function checkDuplicate(fullCode: string) {
  const db = await getOrmClient()
  return db.printJob.findUnique({
    where: { fullCode },
    select: { id: true, printed: true, scanCount: true, lastScannedAt: true },
  })
}

/**
 * Записать результат печати (create или update при повторном сканировании)
 */
export async function recordPrintJob(data: {
  fullCode: string
  gtin: string
  serialNumber: string
  cryptoCode?: string
  productId?: string
}) {
  const db = await getOrmClient()
  return db.printJob.upsert({
    where: { fullCode: data.fullCode },
    update: {
      scanCount: { increment: 1 },
      lastScannedAt: new Date(),
      printed: true,
    },
    create: {
      fullCode: data.fullCode,
      gtin: data.gtin,
      serialNumber: data.serialNumber,
      cryptoCode: data.cryptoCode || null,
      productId: data.productId || null,
      printed: true,
      scanCount: 1,
    },
  })
}
