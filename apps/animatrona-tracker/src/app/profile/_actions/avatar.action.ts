'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { createLocalDiskBackend, processUploadImage } from '@letar/image-upload/server'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const backend = createLocalDiskBackend(path.join(process.cwd(), 'uploads'))

/** Загрузить/заменить аватар текущего пользователя */
export async function uploadAvatarAction(
  formData: FormData,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: 'Поддерживаются только JPEG, PNG, WebP' }
  }
  if (file.size > MAX_SIZE) {
    return { success: false, error: 'Файл больше 5MB' }
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer())
  const { data } = await processUploadImage(inputBuffer, {
    rotate: true,
    resize: { width: 256, height: 256, fit: 'cover' },
    format: 'webp',
    quality: 85,
  })

  const filename = `${randomUUID()}.webp`
  const segments = ['avatars', session.user.id, filename]
  await backend.write(segments, data)

  const url = `/api/files/${segments.join('/')}`

  const db = getEnhancedPrisma(session.user)
  await db.user.update({
    where: { id: session.user.id },
    data: { image: url },
  })

  return { success: true, url }
}
