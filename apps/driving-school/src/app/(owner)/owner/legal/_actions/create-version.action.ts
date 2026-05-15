'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { isOwner } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import type { CreateVersionData } from '../_schemas/legal-document.schema'

// Конфигурация документов
const documentConfig = {
  OFFER: {
    title: 'Договор-оферта',
    slug: 'offer',
  },
  PRIVACY_POLICY: {
    title: 'Политика конфиденциальности',
    slug: 'privacy-policy',
  },
} as const

export type CreateVersionResult =
  | { success: true; versionId: string }
  | { success: false; error: 'UNAUTHORIZED' | 'INVALID_TYPE' | 'VERSION_EXISTS' | 'UNKNOWN_ERROR' }

/**
 * Создание новой версии юридического документа
 */
export async function createDocumentVersion(data: CreateVersionData): Promise<CreateVersionResult> {
  try {
    // Проверка авторизации
    const session = await getSession()
    if (!session?.user || !isOwner(session.user.roles)) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(session.user)

    // Проверка типа документа
    const config = documentConfig[data.documentType]
    if (!config) {
      return { success: false, error: 'INVALID_TYPE' }
    }

    // Получаем или создаём документ
    let document = await db.legalDocument.findUnique({
      where: { type: data.documentType },
    })

    if (!document) {
      document = await db.legalDocument.create({
        data: {
          type: data.documentType,
          title: config.title,
          slug: config.slug,
        },
      })
    }

    // Проверяем, нет ли уже такой версии
    const existingVersion = await db.legalDocumentVersion.findFirst({
      where: {
        documentId: document.id,
        version: data.version,
      },
    })

    if (existingVersion) {
      return { success: false, error: 'VERSION_EXISTS' }
    }

    // Создаём новую версию
    const version = await db.legalDocumentVersion.create({
      data: {
        documentId: document.id,
        version: data.version,
        content: data.content,
        summary: data.summary || null,
      },
    })

    // Обновляем текущую версию документа
    await db.legalDocument.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
    })

    // Ревалидируем кеш страниц
    revalidatePath('/owner/legal')
    revalidatePath(`/owner/legal/${data.documentType.toLowerCase()}`)
    revalidatePath(`/legal/${config.slug}`)

    return { success: true, versionId: version.id }
  } catch (error) {
    console.error('Error creating document version:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
