'use server'

import type { Decimal } from 'decimal.js'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'

// === Типы для платежей ===

export interface PaymentSummary {
  id: string
  amount: number
  method: string | null
  recordedBy: {
    id: string
    name: string | null
  }
  note: string | null
  paidAt: Date
}

export interface EnrollmentBalanceSummary {
  enrollmentId: string
  courseName: string
  totalPrice: number
  paidAmount: number
  remainingAmount: number
  isFullyPaid: boolean
}

// === Результаты операций ===

export type AddPaymentResult =
  | { success: true; paymentId: string }
  | { success: false; error: ActionErrorCode; message?: string }

export type GetPaymentHistoryResult =
  | { success: true; payments: PaymentSummary[] }
  | { success: false; error: ActionErrorCode }

export type GetEnrollmentBalanceResult =
  | { success: true; balance: EnrollmentBalanceSummary }
  | { success: false; error: ActionErrorCode }

export type GetAllBalancesResult =
  | { success: true; balances: EnrollmentBalanceSummary[] }
  | { success: false; error: ActionErrorCode }

// === Добавление платежа ===

export interface AddPaymentData {
  enrollmentId: string
  amount: number
  method?: string
  note?: string
}

export async function addPaymentAction(data: AddPaymentData): Promise<AddPaymentResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const enrollment = await db.courseEnrollment.findUnique({
        where: { id: data.enrollmentId },
        include: {
          progress: {
            select: { organizationId: true },
          },
        },
      })

      if (!enrollment) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(enrollment.progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      if (data.amount <= 0) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Сумма должна быть больше 0' }
      }

      const remainingAmount = Number(enrollment.totalPrice) - Number(enrollment.paidAmount)
      if (remainingAmount <= 0) {
        return { success: false, error: 'ALREADY_FULLY_PAID', message: 'Курс уже полностью оплачен' }
      }

      // Если платёж больше остатка, ограничиваем
      const paymentAmount = Math.min(data.amount, remainingAmount)

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      // Cast для совместимости типов Decimal между ZenStack и Prisma
      const [payment] = await schoolDb.$transaction([
        schoolDb.coursePayment.create({
          data: {
            enrollmentId: data.enrollmentId,
            amount: paymentAmount as unknown as Decimal,
            method: data.method ?? 'CASH',
            recordedById: schoolAuthResult.user.id,
            note: data.note ?? null,
          },
        }),
        schoolDb.courseEnrollment.update({
          where: { id: data.enrollmentId },
          data: {
            paidAmount: { increment: paymentAmount },
          },
        }),
      ])

      return { success: true, paymentId: payment.id }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка добавления платежа:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === История платежей ===

export async function getPaymentHistoryAction(enrollmentId: string): Promise<GetPaymentHistoryResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const enrollment = await db.courseEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          progress: {
            select: { organizationId: true },
          },
        },
      })

      if (!enrollment) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(enrollment.progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      const payments = await schoolDb.coursePayment.findMany({
        where: { enrollmentId },
        include: {
          recordedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { paidAt: 'desc' },
      })

      const summaries: PaymentSummary[] = payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        recordedBy: p.recordedBy,
        note: p.note,
        paidAt: p.paidAt,
      }))

      return { success: true, payments: summaries }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка получения истории платежей:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Баланс по записи ===

export async function getEnrollmentBalanceAction(enrollmentId: string): Promise<GetEnrollmentBalanceResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const enrollment = await db.courseEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          progress: {
            select: { organizationId: true },
          },
          course: {
            select: { name: true },
          },
        },
      })

      if (!enrollment) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(enrollment.progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      const totalPrice = Number(enrollment.totalPrice)
      const paidAmount = Number(enrollment.paidAmount)
      const remainingAmount = totalPrice - paidAmount
      const isFullyPaid = remainingAmount <= 0

      const balance: EnrollmentBalanceSummary = {
        enrollmentId: enrollment.id,
        courseName: enrollment.course.name,
        totalPrice,
        paidAmount,
        remainingAmount: Math.max(0, remainingAmount),
        isFullyPaid,
      }

      return { success: true, balance }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка получения баланса:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Все балансы ученика ===

export async function getAllBalancesAction(progressId: string): Promise<GetAllBalancesResult> {
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
      const enrollments = await schoolDb.courseEnrollment.findMany({
        where: { progressId },
        include: {
          course: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const balances: EnrollmentBalanceSummary[] = enrollments.map((enrollment) => {
        const totalPrice = Number(enrollment.totalPrice)
        const paidAmount = Number(enrollment.paidAmount)
        const remainingAmount = totalPrice - paidAmount
        const isFullyPaid = remainingAmount <= 0

        return {
          enrollmentId: enrollment.id,
          courseName: enrollment.course.name,
          totalPrice,
          paidAmount,
          remainingAmount: Math.max(0, remainingAmount),
          isFullyPaid,
        }
      })

      return { success: true, balances }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка получения балансов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
