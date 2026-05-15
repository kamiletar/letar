'use server'

import type { LicenseCategory, NotificationType, PartnershipStatus } from '@letar/driving-school-db/prisma'
import type { Decimal } from 'decimal.js'

import { requireAuth, requireSuperManager } from '@/lib/action-helpers'
import { getAppUrl } from '@/lib/app-url'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import type { DbClient } from '@/lib/db-types'
import { type ActionErrorCode } from '@/lib/errors'
import { createLogger } from '@/lib/logger'
import { notifyUser } from '@/lib/notifications'
import { createNotificationProviders, createOrchestratorRepository } from '@/lib/orchestrator-repository'

import type {
  AddPartnershipCategoryData,
  CreatePartnershipData,
  UpdatePartnershipCategoryData,
  UpdatePartnershipStatusData,
} from '../_schemas/partnership.schema'

const log = createLogger('Partnership')

// === Типы ===

export interface PartnershipSummary {
  id: string
  initiatorOrg: { id: string; name: string; logo: string | null }
  partnerOrg: { id: string; name: string; logo: string | null }
  status: PartnershipStatus
  terms: string | null
  expiresAt: string | null
  createdAt: string
  respondedAt: string | null
  categories: {
    id: string
    category: LicenseCategory
    pricePerLesson: number | null
    isActive: boolean
    notes: string | null
  }[]
}

export interface PartnerSchoolOption {
  id: string
  name: string
  logo: string | null
  slug: string
}

export type GetPartnershipsResult =
  | { success: true; partnerships: PartnershipSummary[] }
  | { success: false; error: ActionErrorCode }

export type GetPartnershipResult =
  | { success: true; partnership: PartnershipSummary }
  | { success: false; error: ActionErrorCode }

export type CreatePartnershipResult =
  | { success: true; partnershipId: string }
  | { success: false; error: ActionErrorCode; message?: string }

export type UpdatePartnershipResult = { success: true } | { success: false; error: ActionErrorCode; message?: string }

export type GetPartnerSchoolsResult =
  | { success: true; schools: PartnerSchoolOption[] }
  | { success: false; error: ActionErrorCode }

export type GetIncomingRequestsResult =
  | { success: true; requests: PartnershipSummary[] }
  | { success: false; error: ActionErrorCode }

// === Вспомогательные функции для уведомлений ===

/**
 * Получает ID владельцев организации
 */
async function getOrganizationOwnerIds(db: DbClient, organizationId: string): Promise<string[]> {
  const members = await db.member.findMany({
    where: {
      organizationId,
      role: 'owner',
    },
    select: { userId: true },
  })
  return members.map((m) => m.userId)
}

/**
 * Отправляет уведомление о партнёрстве владельцам школы
 */
async function sendPartnershipNotification(params: {
  db: DbClient
  userIds: string[]
  type: NotificationType
  title: string
  body: string
  partnershipId: string
}): Promise<void> {
  const { db, userIds, type, title, body, partnershipId } = params
  const repo = createOrchestratorRepository(db)
  const providers = createNotificationProviders()
  const appUrl = getAppUrl()

  await Promise.all(
    userIds.map((userId) =>
      notifyUser({
        userId,
        type,
        title,
        body,
        data: { partnershipId, actionUrl: '/school/partnerships' },
        repo,
        providers,
        appUrl,
      }).catch((error) => {
        log.error(`Ошибка отправки уведомления пользователю ${userId}:`, error)
      })
    )
  )
}

// === Вспомогательная функция для проверки owner ===

async function requireSchoolOwner(organizationId: string) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return authResult
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем школам
  if (user.roles.includes('OWNER')) {
    return { success: true as const, user }
  }

  // Проверяем членство с ролью owner
  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
  })

  if (!membership || membership.role !== 'owner') {
    return { success: false as const, error: 'NOT_OWNER' as const }
  }

  return { success: true as const, user }
}

// === Получение списка партнёрств школы (исходящие + входящие активные) ===

export async function getPartnershipsAction(organizationId: string): Promise<GetPartnershipsResult> {
  try {
    const authResult = await requireSuperManager(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Получаем все партнёрства где школа — инициатор или партнёр (кроме PENDING для партнёра)
    const partnerships = await db.schoolPartnership.findMany({
      where: {
        OR: [{ initiatorOrgId: organizationId }, { partnerOrgId: organizationId, status: { not: 'PENDING' } }],
      },
      include: {
        initiatorOrg: { select: { id: true, name: true, logo: true } },
        partnerOrg: { select: { id: true, name: true, logo: true } },
        categories: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const summaries: PartnershipSummary[] = partnerships.map((p) => ({
      id: p.id,
      initiatorOrg: p.initiatorOrg,
      partnerOrg: p.partnerOrg,
      status: p.status,
      terms: p.terms,
      expiresAt: p.expiresAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      respondedAt: p.respondedAt?.toISOString() ?? null,
      categories: p.categories.map((c) => ({
        id: c.id,
        category: c.category,
        pricePerLesson: c.pricePerLesson ? Number(c.pricePerLesson) : null,
        isActive: c.isActive,
        notes: c.notes,
      })),
    }))

    return { success: true, partnerships: summaries }
  } catch (error) {
    log.error('Ошибка получения списка партнёрств:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение входящих запросов на партнёрство (для школы-партнёра) ===

export async function getIncomingRequestsAction(organizationId: string): Promise<GetIncomingRequestsResult> {
  try {
    const authResult = await requireSchoolOwner(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const requests = await db.schoolPartnership.findMany({
      where: {
        partnerOrgId: organizationId,
        status: 'PENDING',
      },
      include: {
        initiatorOrg: { select: { id: true, name: true, logo: true } },
        partnerOrg: { select: { id: true, name: true, logo: true } },
        categories: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const summaries: PartnershipSummary[] = requests.map((p) => ({
      id: p.id,
      initiatorOrg: p.initiatorOrg,
      partnerOrg: p.partnerOrg,
      status: p.status,
      terms: p.terms,
      expiresAt: p.expiresAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      respondedAt: p.respondedAt?.toISOString() ?? null,
      categories: p.categories.map((c) => ({
        id: c.id,
        category: c.category,
        pricePerLesson: c.pricePerLesson ? Number(c.pricePerLesson) : null,
        isActive: c.isActive,
        notes: c.notes,
      })),
    }))

    return { success: true, requests: summaries }
  } catch (error) {
    log.error('Ошибка получения входящих запросов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение партнёрства по ID ===

export async function getPartnershipAction(partnershipId: string): Promise<GetPartnershipResult> {
  try {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(authResult.user)
    const partnership = await db.schoolPartnership.findUnique({
      where: { id: partnershipId },
      include: {
        initiatorOrg: { select: { id: true, name: true, logo: true } },
        partnerOrg: { select: { id: true, name: true, logo: true } },
        categories: true,
      },
    })

    if (!partnership) {
      return { success: false, error: 'NOT_FOUND' }
    }

    return {
      success: true,
      partnership: {
        id: partnership.id,
        initiatorOrg: partnership.initiatorOrg,
        partnerOrg: partnership.partnerOrg,
        status: partnership.status,
        terms: partnership.terms,
        expiresAt: partnership.expiresAt?.toISOString() ?? null,
        createdAt: partnership.createdAt.toISOString(),
        respondedAt: partnership.respondedAt?.toISOString() ?? null,
        categories: partnership.categories.map((c) => ({
          id: c.id,
          category: c.category,
          pricePerLesson: c.pricePerLesson ? Number(c.pricePerLesson) : null,
          isActive: c.isActive,
          notes: c.notes,
        })),
      },
    }
  } catch (error) {
    log.error('Ошибка получения партнёрства:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение списка школ для выбора партнёра ===

export async function getPartnerSchoolsAction(
  organizationId: string,
  search?: string
): Promise<GetPartnerSchoolsResult> {
  try {
    const authResult = await requireSchoolOwner(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Получаем все публичные школы, кроме текущей
    // и исключаем те, с которыми уже есть активное партнёрство
    const existingPartnerships = await db.schoolPartnership.findMany({
      where: {
        initiatorOrgId: organizationId,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
      select: { partnerOrgId: true },
    })

    const excludedIds = [organizationId, ...existingPartnerships.map((p) => p.partnerOrgId)]

    const schools = await db.organization.findMany({
      where: {
        id: { notIn: excludedIds },
        isPublic: true,
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
      },
      select: {
        id: true,
        name: true,
        logo: true,
        slug: true,
      },
      take: 20,
      orderBy: { name: 'asc' },
    })

    return { success: true, schools }
  } catch (error) {
    log.error('Ошибка получения списка школ:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Создание запроса на партнёрство ===

export async function createPartnershipAction(
  organizationId: string,
  data: CreatePartnershipData
): Promise<CreatePartnershipResult> {
  try {
    const authResult = await requireSchoolOwner(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // Нельзя создать партнёрство с самим собой
    if (data.partnerOrgId === organizationId) {
      return { success: false, error: 'CANNOT_PARTNER_SELF', message: 'Нельзя создать партнёрство с собой' }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Проверяем, что партнёр существует
    const partnerOrg = await db.organization.findUnique({
      where: { id: data.partnerOrgId },
      select: { id: true },
    })

    if (!partnerOrg) {
      return { success: false, error: 'NOT_FOUND', message: 'Школа-партнёр не найдена' }
    }

    // Проверяем, что партнёрство ещё не существует
    const existing = await db.schoolPartnership.findUnique({
      where: {
        initiatorOrgId_partnerOrgId: {
          initiatorOrgId: organizationId,
          partnerOrgId: data.partnerOrgId,
        },
      },
    })

    if (existing) {
      return { success: false, error: 'ALREADY_EXISTS', message: 'Партнёрство с этой школой уже существует' }
    }

    // Получаем название школы-инициатора для уведомления
    const initiatorOrg = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    })

    // Создаём партнёрство
    const partnership = await db.schoolPartnership.create({
      data: {
        initiatorOrgId: organizationId,
        partnerOrgId: data.partnerOrgId,
        terms: data.terms ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        categories: {
          create: data.categories.map((cat) => ({
            category: cat.category,
            pricePerLesson: cat.pricePerLesson !== null ? (cat.pricePerLesson as unknown as Decimal) : null,
            notes: cat.notes ?? null,
          })),
        },
      },
    })

    // Отправляем уведомление владельцам школы-партнёра (fire-and-forget)
    const partnerOwnerIds = await getOrganizationOwnerIds(db, data.partnerOrgId)
    if (partnerOwnerIds.length > 0) {
      sendPartnershipNotification({
        db,
        userIds: partnerOwnerIds,
        type: 'PARTNERSHIP_REQUEST_RECEIVED',
        title: 'Новый запрос на партнёрство',
        body: `Автошкола "${
          initiatorOrg?.name || 'Неизвестная школа'
        }" предлагает установить партнёрство. Рассмотрите запрос в разделе партнёрств.`,
        partnershipId: partnership.id,
      }).catch((error) => {
        log.error('Ошибка отправки уведомления о новом партнёрстве:', error)
      })
    }

    return { success: true, partnershipId: partnership.id }
  } catch (error) {
    log.error('Ошибка создания партнёрства:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Принять/отклонить запрос на партнёрство ===

export async function respondPartnershipAction(
  partnershipId: string,
  accept: boolean
): Promise<UpdatePartnershipResult> {
  try {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(authResult.user)
    const partnership = await db.schoolPartnership.findUnique({
      where: { id: partnershipId },
      select: {
        id: true,
        partnerOrgId: true,
        initiatorOrgId: true,
        status: true,
        partnerOrg: { select: { name: true } },
      },
    })

    if (!partnership) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем, что пользователь — owner партнёрской школы
    const ownerCheck = await requireSchoolOwner(partnership.partnerOrgId)
    if (!ownerCheck.success) {
      return { success: false, error: ownerCheck.error }
    }

    if (partnership.status !== 'PENDING') {
      return { success: false, error: 'INVALID_STATUS', message: 'Запрос уже обработан' }
    }

    const ownerDb = getEnhancedPrisma(ownerCheck.user)
    await ownerDb.schoolPartnership.update({
      where: { id: partnershipId },
      data: {
        status: accept ? 'ACTIVE' : 'TERMINATED',
        respondedAt: new Date(),
        ...(accept ? {} : { terminationReason: 'Запрос отклонён' }),
      },
    })

    // Отправляем уведомление владельцам школы-инициатора (fire-and-forget)
    const initiatorOwnerIds = await getOrganizationOwnerIds(db, partnership.initiatorOrgId)
    if (initiatorOwnerIds.length > 0) {
      const partnerName = partnership.partnerOrg.name || 'Школа-партнёр'
      sendPartnershipNotification({
        db,
        userIds: initiatorOwnerIds,
        type: accept ? 'PARTNERSHIP_REQUEST_ACCEPTED' : 'PARTNERSHIP_REQUEST_REJECTED',
        title: accept ? 'Партнёрство принято!' : 'Запрос на партнёрство отклонён',
        body: accept
          ? `Автошкола "${partnerName}" приняла ваш запрос на партнёрство. Теперь вы можете направлять учеников.`
          : `Автошкола "${partnerName}" отклонила ваш запрос на партнёрство.`,
        partnershipId,
      }).catch((error) => {
        log.error('Ошибка отправки уведомления о ответе на партнёрство:', error)
      })
    }

    return { success: true }
  } catch (error) {
    log.error('Ошибка ответа на запрос партнёрства:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Обновление статуса партнёрства (приостановить, возобновить, расторгнуть) ===

export async function updatePartnershipStatusAction(
  data: UpdatePartnershipStatusData
): Promise<UpdatePartnershipResult> {
  try {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(authResult.user)
    const partnership = await db.schoolPartnership.findUnique({
      where: { id: data.partnershipId },
      select: {
        id: true,
        initiatorOrgId: true,
        partnerOrgId: true,
        status: true,
        initiatorOrg: { select: { name: true } },
        partnerOrg: { select: { name: true } },
      },
    })

    if (!partnership) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем, что пользователь — owner инициатора или партнёра
    const initiatorOwnerCheck = await requireSchoolOwner(partnership.initiatorOrgId)
    const partnerOwnerCheck = await requireSchoolOwner(partnership.partnerOrgId)

    if (!initiatorOwnerCheck.success && !partnerOwnerCheck.success) {
      return { success: false, error: 'NOT_OWNER' }
    }

    const ownerUser = initiatorOwnerCheck.success
      ? initiatorOwnerCheck.user
      : partnerOwnerCheck.success
        ? partnerOwnerCheck.user
        : null
    if (!ownerUser) {
      return { success: false, error: 'NOT_OWNER' }
    }

    // Валидация переходов статусов
    const { action } = data
    const currentStatus = partnership.status

    if (action === 'suspend' && currentStatus !== 'ACTIVE') {
      return { success: false, error: 'INVALID_STATUS', message: 'Приостановить можно только активное партнёрство' }
    }

    if (action === 'resume' && currentStatus !== 'SUSPENDED') {
      return {
        success: false,
        error: 'INVALID_STATUS',
        message: 'Возобновить можно только приостановленное партнёрство',
      }
    }

    if (action === 'terminate' && currentStatus === 'TERMINATED') {
      return { success: false, error: 'INVALID_STATUS', message: 'Партнёрство уже расторгнуто' }
    }

    const ownerDb = getEnhancedPrisma(ownerUser)
    const newStatus: PartnershipStatus =
      action === 'suspend' ? 'SUSPENDED' : action === 'resume' ? 'ACTIVE' : 'TERMINATED'

    await ownerDb.schoolPartnership.update({
      where: { id: data.partnershipId },
      data: {
        status: newStatus,
        ...(action === 'terminate' && {
          terminatedAt: new Date(),
          terminationReason: data.reason ?? null,
        }),
      },
    })

    // Определяем, кто инициировал действие и кому отправить уведомление
    const isInitiatorAction = initiatorOwnerCheck.success
    const targetOrgId = isInitiatorAction ? partnership.partnerOrgId : partnership.initiatorOrgId
    const actionByName = isInitiatorAction ? partnership.initiatorOrg.name : partnership.partnerOrg.name

    // Отправляем уведомление другой стороне (fire-and-forget)
    const targetOwnerIds = await getOrganizationOwnerIds(db, targetOrgId)
    if (targetOwnerIds.length > 0) {
      let notificationType: NotificationType
      let title: string
      let body: string

      if (action === 'suspend') {
        notificationType = 'PARTNERSHIP_SUSPENDED'
        title = 'Партнёрство приостановлено'
        body = `Партнёрство с автошколой "${actionByName}" временно приостановлено. Направление учеников недоступно.`
      } else if (action === 'resume') {
        notificationType = 'PARTNERSHIP_REQUEST_ACCEPTED' // Используем тип "принято" для возобновления
        title = 'Партнёрство возобновлено'
        body = `Партнёрство с автошколой "${actionByName}" было возобновлено. Направление учеников снова доступно.`
      } else {
        // terminate
        notificationType = 'PARTNERSHIP_TERMINATED'
        title = 'Партнёрство расторгнуто'
        const reasonText = data.reason ? ` Причина: ${data.reason}` : ''
        body = `Партнёрство с автошколой "${actionByName}" было расторгнуто.${reasonText}`
      }

      sendPartnershipNotification({
        db,
        userIds: targetOwnerIds,
        type: notificationType,
        title,
        body,
        partnershipId: data.partnershipId,
      }).catch((error) => {
        log.error('Ошибка отправки уведомления об изменении статуса:', error)
      })
    }

    return { success: true }
  } catch (error) {
    log.error('Ошибка обновления статуса партнёрства:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Добавление категории к партнёрству ===

export async function addPartnershipCategoryAction(data: AddPartnershipCategoryData): Promise<UpdatePartnershipResult> {
  try {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(authResult.user)
    const partnership = await db.schoolPartnership.findUnique({
      where: { id: data.partnershipId },
      select: { id: true, initiatorOrgId: true, status: true },
    })

    if (!partnership) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Только owner школы-инициатора может добавлять категории
    const ownerCheck = await requireSchoolOwner(partnership.initiatorOrgId)
    if (!ownerCheck.success) {
      return { success: false, error: ownerCheck.error }
    }

    if (partnership.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'INVALID_STATUS',
        message: 'Добавлять категории можно только к активному партнёрству',
      }
    }

    const ownerDb = getEnhancedPrisma(ownerCheck.user)
    await ownerDb.partnershipCategory.create({
      data: {
        partnershipId: data.partnershipId,
        category: data.category,
        pricePerLesson: data.pricePerLesson !== null ? (data.pricePerLesson as unknown as Decimal) : null,
        notes: data.notes ?? null,
      },
    })

    return { success: true }
  } catch (error) {
    log.error('Ошибка добавления категории:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Обновление категории партнёрства ===

export async function updatePartnershipCategoryAction(
  data: UpdatePartnershipCategoryData
): Promise<UpdatePartnershipResult> {
  try {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(authResult.user)
    const category = await db.partnershipCategory.findUnique({
      where: { id: data.categoryId },
      include: { partnership: { select: { initiatorOrgId: true } } },
    })

    if (!category) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Только owner школы-инициатора может редактировать
    const ownerCheck = await requireSchoolOwner(category.partnership.initiatorOrgId)
    if (!ownerCheck.success) {
      return { success: false, error: ownerCheck.error }
    }

    const ownerDb = getEnhancedPrisma(ownerCheck.user)
    await ownerDb.partnershipCategory.update({
      where: { id: data.categoryId },
      data: {
        ...(data.pricePerLesson !== undefined && {
          pricePerLesson: data.pricePerLesson !== null ? (data.pricePerLesson as unknown as Decimal) : null,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })

    return { success: true }
  } catch (error) {
    log.error('Ошибка обновления категории:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Удаление категории партнёрства ===

export async function deletePartnershipCategoryAction(categoryId: string): Promise<UpdatePartnershipResult> {
  try {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(authResult.user)
    const category = await db.partnershipCategory.findUnique({
      where: { id: categoryId },
      include: { partnership: { select: { initiatorOrgId: true } } },
    })

    if (!category) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Только owner школы-инициатора может удалять
    const ownerCheck = await requireSchoolOwner(category.partnership.initiatorOrgId)
    if (!ownerCheck.success) {
      return { success: false, error: ownerCheck.error }
    }

    const ownerDb = getEnhancedPrisma(ownerCheck.user)
    await ownerDb.partnershipCategory.delete({
      where: { id: categoryId },
    })

    return { success: true }
  } catch (error) {
    log.error('Ошибка удаления категории:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
