import { prisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { NextResponse } from 'next/server'

/**
 * API для получения манифеста прекеширования.
 * Возвращает список URL всех страниц и изображений для оффлайн-режима.
 *
 * ОПТИМИЗАЦИЯ ПАМЯТИ:
 * - Лимит на количество записей (защита при большом количестве контента)
 * - Кэширование на 1 час
 */

// Кешируем на 1 час
export const revalidate = 3600

// Лимиты для защиты от OOM при большом количестве контента
const MAX_MANDALAS = 500
const MAX_PRODUCTS = 500
const MAX_IMAGES_PER_PRODUCT = 5

// Статические страницы приложения
// Роуты соответствуют [locale]/(main)/* структуре
const STATIC_PAGES = ['/', '/offline/', '/mandalas/', '/shop/', '/about-elfafeya/', '/about-mandalas/', '/contacts/']

export async function GET() {
  try {
    // Получаем опубликованные мандалы с изображениями (с лимитом)
    const mandalas = await prisma.mandala.findMany({
      where: { published: true },
      select: {
        slug: true,
        image: { select: { path: true } },
        centerImage: { select: { path: true } },
      },
      orderBy: { order: 'asc' },
      take: MAX_MANDALAS,
    })

    // Получаем опубликованные товары с изображениями (с лимитом)
    const products = await prisma.product.findMany({
      where: { published: true },
      select: {
        slug: true,
        images: {
          select: { image: { select: { path: true } } },
          orderBy: { order: 'asc' },
          take: MAX_IMAGES_PER_PRODUCT, // Ограничиваем изображения на товар
        },
      },
      orderBy: { order: 'asc' },
      take: MAX_PRODUCTS,
    })

    // Формируем список страниц
    const pages = [
      ...STATIC_PAGES,
      ...mandalas.map((m) => `/mandalas/${m.slug}`),
      ...products.map((p) => `/shop/${p.slug}`),
    ]

    // Формируем список изображений
    const images: string[] = []

    // Изображения мандал
    for (const m of mandalas) {
      if (m.image?.path) {
        images.push(getImageUrl(m.image.path))
      }
      if (m.centerImage?.path) {
        images.push(getImageUrl(m.centerImage.path))
      }
    }

    // Изображения товаров
    for (const p of products) {
      for (const pi of p.images) {
        if (pi.image?.path) {
          images.push(getImageUrl(pi.image.path))
        }
      }
    }

    return NextResponse.json({
      pages,
      images,
      stats: {
        pagesCount: pages.length,
        imagesCount: images.length,
        mandalasCount: mandalas.length,
        productsCount: products.length,
      },
    })
  } catch (error) {
    console.error('[precache-manifest] Ошибка:', error)
    // В случае ошибки возвращаем только статические страницы
    return NextResponse.json({
      pages: STATIC_PAGES,
      images: [],
      stats: {
        pagesCount: STATIC_PAGES.length,
        imagesCount: 0,
        mandalasCount: 0,
        productsCount: 0,
      },
      error: 'Не удалось загрузить данные из БД',
    })
  }
}
