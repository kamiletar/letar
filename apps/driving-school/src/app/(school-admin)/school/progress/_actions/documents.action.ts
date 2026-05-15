'use server'

import type { DocumentsStatus } from '@letar/driving-school-db/prisma'
import type { Decimal } from 'decimal.js'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'

// === Типы для документов ===

export interface DocumentsChecklist {
  medicalCert?: boolean // Медицинская справка
  photos?: boolean // Фотографии
  passport?: boolean // Паспорт
  snils?: boolean // СНИЛС
  oldLicense?: boolean // Старые права (при обмене)
  militaryId?: boolean // Военный билет (если применимо)
  [key: string]: boolean | undefined
}

// === Результаты операций ===

export type UpdateDocumentsResult = { success: true } | { success: false; error: ActionErrorCode; message?: string }

// === Обновление статуса документов ===

export interface UpdateDocumentsStatusData {
  progressId: string
  status?: DocumentsStatus
  checklist?: DocumentsChecklist
  note?: string
}

export async function updateDocumentsStatusAction(data: UpdateDocumentsStatusData): Promise<UpdateDocumentsResult> {
  try {
    // Сначала получаем progress без авторизации для определения organizationId
    // Потом проверяем права менеджера
    const authResult = await requireSchoolManager('')

    // Если первая проверка прошла (пользователь авторизован), получаем данные
    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const progress = await db.studentProgress.findUnique({
        where: { id: data.progressId },
        select: { id: true, organizationId: true, documentsStatus: true },
      })

      if (!progress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

      // Определяем новый статус
      let newStatus = data.status ?? progress.documentsStatus
      let documentsReadyAt: Date | null = null

      // Если указан чеклист, проверяем полноту
      if (data.checklist) {
        const requiredDocs = ['medicalCert', 'photos', 'passport']
        const allReady = requiredDocs.every((doc) => data.checklist?.[doc] === true)

        if (allReady && newStatus !== 'READY') {
          newStatus = 'READY'
          documentsReadyAt = new Date()
        } else if (!allReady && newStatus === 'READY') {
          newStatus = 'IN_PROGRESS'
        }
      }

      await schoolDb.studentProgress.update({
        where: { id: data.progressId },
        data: {
          documentsStatus: newStatus,
          ...(data.checklist && { documentsChecklist: data.checklist }),
          ...(data.note !== undefined && { documentsNote: data.note }),
          ...(documentsReadyAt && { documentsReadyAt }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка обновления документов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Отметка оплаты госпошлины ===

export interface MarkStateFeePaidData {
  progressId: string
  amount: number
  receipt?: string
}

export async function markStateFeePaidAction(data: MarkStateFeePaidData): Promise<UpdateDocumentsResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const progress = await db.studentProgress.findUnique({
        where: { id: data.progressId },
        select: { id: true, organizationId: true },
      })

      if (!progress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      if (data.amount <= 0) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Сумма должна быть больше 0' }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      await schoolDb.studentProgress.update({
        where: { id: data.progressId },
        data: {
          // Cast для совместимости типов Decimal между ZenStack и Prisma
          stateFeeAmount: data.amount as unknown as Decimal,
          stateFeePaidAt: new Date(),
          stateFeeReceipt: data.receipt ?? null,
        },
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка отметки госпошлины:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Отмена оплаты госпошлины ===

export async function cancelStateFeePaidAction(progressId: string): Promise<UpdateDocumentsResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const progress = await db.studentProgress.findUnique({
        where: { id: progressId },
        select: { id: true, organizationId: true },
      })

      if (!progress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      await schoolDb.studentProgress.update({
        where: { id: progressId },
        data: {
          stateFeeAmount: null,
          stateFeePaidAt: null,
          stateFeeReceipt: null,
        },
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка отмены госпошлины:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Отметка подачи документов в ГИБДД ===

export interface MarkDocsSubmittedData {
  progressId: string
  applicationNumber?: string
}

export async function markDocsSubmittedToGibddAction(data: MarkDocsSubmittedData): Promise<UpdateDocumentsResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const progress = await db.studentProgress.findUnique({
        where: { id: data.progressId },
        select: { id: true, organizationId: true, docsSubmittedToGibdd: true, documentsStatus: true },
      })

      if (!progress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      if (progress.docsSubmittedToGibdd) {
        return { success: false, error: 'ALREADY_SUBMITTED', message: 'Документы уже поданы в ГИБДД' }
      }

      if (progress.documentsStatus !== 'READY') {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Документы ещё не готовы' }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      await schoolDb.studentProgress.update({
        where: { id: data.progressId },
        data: {
          docsSubmittedToGibdd: true,
          docsSubmittedAt: new Date(),
          gibddApplicationNumber: data.applicationNumber ?? null,
        },
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка подачи в ГИБДД:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Отмена подачи в ГИБДД ===

export async function cancelDocsSubmittedToGibddAction(progressId: string): Promise<UpdateDocumentsResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const progress = await db.studentProgress.findUnique({
        where: { id: progressId },
        select: { id: true, organizationId: true },
      })

      if (!progress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      await schoolDb.studentProgress.update({
        where: { id: progressId },
        data: {
          docsSubmittedToGibdd: false,
          docsSubmittedAt: null,
          gibddApplicationNumber: null,
        },
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка отмены подачи в ГИБДД:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
