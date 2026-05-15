'use server'

/**
 * Server Actions для документов ученика с версионированием (v0.204.0)
 *
 * Новая система документов:
 * - Связь с моделью File для реальных файлов
 * - Версионирование через self-relation
 * - Срок действия (критично для медсправки — 1 год!)
 * - Workflow: PENDING → UPLOADED → APPROVED/REJECTED
 */

import type { StudentDocument, StudentDocumentType } from '@letar/driving-school-db/prisma'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'

// === Типы ===

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: ActionErrorCode; message?: string }

// Документ с файлом и версиями
export interface StudentDocumentWithRelations extends StudentDocument {
  file: {
    id: string
    filename: string
    path: string
    mimeType: string
    size: number
  } | null
  reviewedBy: {
    id: string
    name: string | null
  } | null
  previousVersion: {
    id: string
    version: number
    createdAt: Date
  } | null
}

// Информация о типе документа для UI
export const DOCUMENT_TYPE_INFO: Record<
  StudentDocumentType,
  {
    label: string
    description: string
    hasExpiration: boolean
    required: boolean
    acceptedMimeTypes: string[]
  }
> = {
  MEDICAL_CERT: {
    label: 'Медсправка 003-В/у',
    description: 'Срок действия 1 год',
    hasExpiration: true,
    required: true,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  PASSPORT_COPY: {
    label: 'Копия паспорта',
    description: 'Страницы с фото и регистрацией',
    hasExpiration: false,
    required: true,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  PHOTOS_3X4: {
    label: 'Фото 3x4',
    description: '4 штуки',
    hasExpiration: false,
    required: true,
    acceptedMimeTypes: ['image/jpeg', 'image/png'],
  },
  SNILS_COPY: {
    label: 'Копия СНИЛС',
    description: 'Страховой номер',
    hasExpiration: false,
    required: true,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  APPLICATION: {
    label: 'Заявление',
    description: 'Заявление на обучение',
    hasExpiration: false,
    required: true,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  CONTRACT: {
    label: 'Договор',
    description: 'Договор на обучение',
    hasExpiration: false,
    required: true,
    acceptedMimeTypes: ['application/pdf'],
  },
  PAYMENT_RECEIPT: {
    label: 'Квитанция об оплате',
    description: 'Подтверждение оплаты',
    hasExpiration: false,
    required: false,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  STATE_FEE_RECEIPT: {
    label: 'Квитанция госпошлины',
    description: 'Оплата госпошлины',
    hasExpiration: false,
    required: false,
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  TRAINING_CERT: {
    label: 'Свидетельство',
    description: 'Свидетельство об обучении (выдаётся школой)',
    hasExpiration: false,
    required: false,
    acceptedMimeTypes: ['application/pdf'],
  },
}

// === Получение документов ученика ===

export async function getStudentDocumentsAction(
  progressId: string
): Promise<ActionResult<StudentDocumentWithRelations[]>> {
  try {
    const authResult = await requireSchoolManager('')

    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Получаем progress для проверки прав
    const progress = await db.studentProgress.findUnique({
      where: { id: progressId },
      select: { id: true, organizationId: true },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверка прав на школу
    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Получаем только актуальные версии документов (без nextVersions)
    const documents = await schoolDb.studentDocument.findMany({
      where: {
        progressId,
        nextVersions: { none: {} }, // Только последние версии
      },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            path: true,
            mimeType: true,
            size: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        previousVersion: {
          select: {
            id: true,
            version: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: documents as StudentDocumentWithRelations[] }
  } catch (error) {
    console.error('Ошибка получения документов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Создание/Загрузка документа ===

export interface CreateStudentDocumentInput {
  progressId: string
  type: StudentDocumentType
  fileId: string
  validFrom?: Date | string
  expiresAt?: Date | string // Для медсправки обязательно!
}

export async function createStudentDocumentAction(
  input: CreateStudentDocumentInput
): Promise<ActionResult<StudentDocumentWithRelations>> {
  try {
    const authResult = await requireSchoolManager('')

    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Получаем progress
    const progress = await db.studentProgress.findUnique({
      where: { id: input.progressId },
      select: { id: true, organizationId: true },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверка прав на школу
    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Валидация: для медсправки обязателен срок действия
    const typeInfo = DOCUMENT_TYPE_INFO[input.type]
    if (typeInfo.hasExpiration && !input.expiresAt) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Для медсправки обязательно указать срок действия',
      }
    }

    // Проверяем, есть ли предыдущая версия
    const existingDoc = await schoolDb.studentDocument.findFirst({
      where: {
        progressId: input.progressId,
        type: input.type,
        nextVersions: { none: {} },
      },
      select: { id: true, version: true },
    })

    // Создаём документ
    const document = await schoolDb.studentDocument.create({
      data: {
        progressId: input.progressId,
        type: input.type,
        status: 'UPLOADED',
        fileId: input.fileId,
        version: existingDoc ? existingDoc.version + 1 : 1,
        previousVersionId: existingDoc?.id ?? null,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            path: true,
            mimeType: true,
            size: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        previousVersion: {
          select: {
            id: true,
            version: true,
            createdAt: true,
          },
        },
      },
    })

    return { success: true, data: document as StudentDocumentWithRelations }
  } catch (error) {
    console.error('Ошибка создания документа:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Одобрение документа ===

export async function approveDocumentAction(
  documentId: string,
  note?: string
): Promise<ActionResult<StudentDocumentWithRelations>> {
  try {
    const authResult = await requireSchoolManager('')

    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Получаем документ
    const document = await db.studentDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        status: true,
        progress: {
          select: { organizationId: true },
        },
      },
    })

    if (!document) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверка прав на школу
    const schoolAuthResult = await requireSchoolManager(document.progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    if (document.status === 'APPROVED') {
      return { success: false, error: 'ALREADY_APPROVED', message: 'Документ уже одобрен' }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Обновляем статус
    const updated = await schoolDb.studentDocument.update({
      where: { id: documentId },
      data: {
        status: 'APPROVED',
        reviewedById: schoolAuthResult.user.id,
        reviewedAt: new Date(),
        reviewNote: note ?? null,
      },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            path: true,
            mimeType: true,
            size: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        previousVersion: {
          select: {
            id: true,
            version: true,
            createdAt: true,
          },
        },
      },
    })

    return { success: true, data: updated as StudentDocumentWithRelations }
  } catch (error) {
    console.error('Ошибка одобрения документа:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Отклонение документа ===

export async function rejectDocumentAction(
  documentId: string,
  note: string
): Promise<ActionResult<StudentDocumentWithRelations>> {
  try {
    if (!note.trim()) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Укажите причину отклонения',
      }
    }

    const authResult = await requireSchoolManager('')

    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Получаем документ
    const document = await db.studentDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        status: true,
        progress: {
          select: { organizationId: true },
        },
      },
    })

    if (!document) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверка прав на школу
    const schoolAuthResult = await requireSchoolManager(document.progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    if (document.status === 'APPROVED') {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Нельзя отклонить уже одобренный документ',
      }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Обновляем статус
    const updated = await schoolDb.studentDocument.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED',
        reviewedById: schoolAuthResult.user.id,
        reviewedAt: new Date(),
        reviewNote: note,
      },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            path: true,
            mimeType: true,
            size: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        previousVersion: {
          select: {
            id: true,
            version: true,
            createdAt: true,
          },
        },
      },
    })

    return { success: true, data: updated as StudentDocumentWithRelations }
  } catch (error) {
    console.error('Ошибка отклонения документа:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение истекающих документов школы ===

export interface ExpiringDocument {
  id: string
  type: StudentDocumentType
  expiresAt: Date
  daysUntilExpiration: number
  student: {
    id: string
    name: string | null
    phone: string | null
  }
  progress: {
    id: string
  }
}

export async function getExpiringDocumentsAction(
  organizationId: string,
  daysAhead = 30
): Promise<ActionResult<ExpiringDocument[]>> {
  try {
    // Проверка прав на школу
    const authResult = await requireSchoolManager(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const now = new Date()
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + daysAhead)

    // Получаем документы с истекающим сроком
    const documents = await db.studentDocument.findMany({
      where: {
        progress: {
          organizationId,
          status: 'ACTIVE', // Только активные ученики
        },
        status: 'APPROVED', // Только одобренные документы
        expiresAt: {
          not: null,
          lte: deadline,
        },
        nextVersions: { none: {} }, // Только актуальные версии
      },
      include: {
        progress: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    })

    const result: ExpiringDocument[] = documents.map((doc) => ({
      id: doc.id,
      type: doc.type,

      expiresAt: doc.expiresAt!,

      daysUntilExpiration: Math.ceil((doc.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      student: {
        id: doc.progress.user.id,
        name: doc.progress.user.name,
        phone: doc.progress.user.phone,
      },
      progress: {
        id: doc.progress.id,
      },
    }))

    return { success: true, data: result }
  } catch (error) {
    console.error('Ошибка получения истекающих документов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение документов на проверке ===

export interface PendingDocument {
  id: string
  type: StudentDocumentType
  createdAt: Date
  student: {
    id: string
    name: string | null
  }
  progress: {
    id: string
  }
}

export async function getPendingDocumentsAction(organizationId: string): Promise<ActionResult<PendingDocument[]>> {
  try {
    const authResult = await requireSchoolManager(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const documents = await db.studentDocument.findMany({
      where: {
        progress: {
          organizationId,
          status: 'ACTIVE',
        },
        status: 'UPLOADED', // Ожидают проверки
        nextVersions: { none: {} },
      },
      include: {
        progress: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Старые первыми
    })

    const result: PendingDocument[] = documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      createdAt: doc.createdAt,
      student: {
        id: doc.progress.user.id,
        name: doc.progress.user.name,
      },
      progress: {
        id: doc.progress.id,
      },
    }))

    return { success: true, data: result }
  } catch (error) {
    console.error('Ошибка получения документов на проверке:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Статистика документов школы ===

export interface DocumentsStats {
  total: number
  pending: number
  uploaded: number
  approved: number
  rejected: number
  expired: number
  expiringSoon: number // В ближайшие 30 дней
}

export async function getDocumentsStatsAction(organizationId: string): Promise<ActionResult<DocumentsStats>> {
  try {
    const authResult = await requireSchoolManager(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const now = new Date()
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30)

    // Базовый фильтр — только актуальные версии активных учеников
    const baseWhere = {
      progress: {
        organizationId,
        status: 'ACTIVE' as const,
      },
      nextVersions: { none: {} },
    }

    const [total, pending, uploaded, approved, rejected, expired, expiringSoon] = await Promise.all([
      db.studentDocument.count({ where: baseWhere }),
      db.studentDocument.count({ where: { ...baseWhere, status: 'PENDING' } }),
      db.studentDocument.count({ where: { ...baseWhere, status: 'UPLOADED' } }),
      db.studentDocument.count({ where: { ...baseWhere, status: 'APPROVED' } }),
      db.studentDocument.count({ where: { ...baseWhere, status: 'REJECTED' } }),
      db.studentDocument.count({ where: { ...baseWhere, status: 'EXPIRED' } }),
      db.studentDocument.count({
        where: {
          ...baseWhere,
          status: 'APPROVED',
          expiresAt: {
            not: null,
            gte: now,
            lte: deadline,
          },
        },
      }),
    ])

    return {
      success: true,
      data: {
        total,
        pending,
        uploaded,
        approved,
        rejected,
        expired,
        expiringSoon,
      },
    }
  } catch (error) {
    console.error('Ошибка получения статистики документов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Отметка документа как истёкшего (для cron job) ===

export async function markExpiredDocumentsAction(organizationId: string): Promise<ActionResult<number>> {
  try {
    const authResult = await requireSchoolManager(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const now = new Date()

    // Обновляем все истёкшие документы
    const result = await db.studentDocument.updateMany({
      where: {
        progress: {
          organizationId,
          status: 'ACTIVE',
        },
        status: 'APPROVED',
        expiresAt: {
          not: null,
          lt: now,
        },
        nextVersions: { none: {} },
      },
      data: {
        status: 'EXPIRED',
      },
    })

    return { success: true, data: result.count }
  } catch (error) {
    console.error('Ошибка отметки истёкших документов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
