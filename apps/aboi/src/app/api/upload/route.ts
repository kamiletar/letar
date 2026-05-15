import { requireAdmin } from '@/lib/auth-utils'
import { createImageRecord } from '@/lib/images/upload'
import { NextResponse } from 'next/server'

/**
 * POST /api/upload — загрузка одного изображения.
 * Только для админов. Multipart/form-data.
 *
 * Поля:
 *   file (required) — файл (image/jpeg|png|webp, ≤ 10 МБ)
 *   category (optional, default "products") — логическая папка
 *   alt (optional) — альт-текст
 */
export async function POST(request: Request) {
  const admin = await requireAdmin()

  const form = await request.formData()
  const file = form.get('file')
  const category = (form.get('category') as string | null)?.trim() || 'products'
  const alt = (form.get('alt') as string | null) ?? undefined

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Поле "file" обязательно и должно быть файлом' }, { status: 400 })
  }

  if (!/^[a-z0-9-]+$/i.test(category)) {
    return NextResponse.json({ error: 'Недопустимое имя категории' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const result = await createImageRecord({
      buffer,
      mimeType: file.type,
      originalName: file.name,
      category,
      alt,
      uploadedById: admin.id,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
