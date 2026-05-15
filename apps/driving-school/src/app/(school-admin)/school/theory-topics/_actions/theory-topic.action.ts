'use server'

import { withSchoolAdmin, withSchoolMember } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { parseOrganizationMetadata } from '@/lib/organization-metadata'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'

import type { TheoryTopicFormData } from '../_schemas/theory-topic.schema'

// Тип для списка тем
export interface TheoryTopicSummary {
  id: string
  name: string
  description: string | null
  categories: LicenseCategory[]
  sortOrder: number
  isActive: boolean
  lessonsCount: number
  createdAt: Date
}

// Тип для детальной информации о теме
export interface TheoryTopicDetails {
  id: string
  name: string
  description: string | null
  categories: LicenseCategory[]
  sortOrder: number
  materials: string[]
  isActive: boolean
  lessonsCount: number
  createdAt: Date
  updatedAt: Date
}

// Получение списка тем для школы
export async function getTheoryTopicsAction(
  schoolId: string
): Promise<{ success: true; topics: TheoryTopicSummary[] } | { success: false; topics?: never; error: string }> {
  return withSchoolMember(schoolId, async () => {
    try {
      // ZenStack v3.2.1 баг: select/include с relations генерирует невалидный SQL
      // Используем prisma напрямую для запросов с relations
      const topics = await prisma.theoryTopic.findMany({
        where: { organizationId: schoolId },
        select: {
          id: true,
          name: true,
          description: true,
          categories: true,
          sortOrder: true,
          isActive: true,
          createdAt: true,
          theoryLessons: { select: { id: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })

      return {
        success: true,
        topics: topics.map(
          (t): TheoryTopicSummary => ({
            id: t.id,
            name: t.name,
            description: t.description,
            categories: t.categories,
            sortOrder: t.sortOrder,
            isActive: t.isActive,
            // ZenStack v3: вычисляем count через .length
            lessonsCount: t.theoryLessons.length,
            createdAt: t.createdAt,
          })
        ),
      }
    } catch (error) {
      console.error('Ошибка получения тем:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// Получение детальной информации о теме
export async function getTheoryTopicAction(topicId: string): Promise<{
  success: boolean
  topic?: TheoryTopicDetails
  error?: string
}> {
  return withSchoolMember('', async () => {
    try {
      // ZenStack v3.2.1 баг: select/include с relations генерирует невалидный SQL
      // Используем prisma напрямую для запросов с relations
      const topic = await prisma.theoryTopic.findUnique({
        where: { id: topicId },
        select: {
          id: true,
          name: true,
          description: true,
          categories: true,
          sortOrder: true,
          materials: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          organizationId: true,
          theoryLessons: { select: { id: true } },
        },
      })

      if (!topic) {
        return { success: false, error: 'NOT_FOUND' }
      }

      // Проверяем доступ к школе через обёртку
      return withSchoolMember(topic.organizationId, async () => {
        return {
          success: true,
          topic: {
            id: topic.id,
            name: topic.name,
            description: topic.description,
            categories: topic.categories,
            sortOrder: topic.sortOrder,
            materials: (topic.materials as string[]) || [],
            isActive: topic.isActive,
            // ZenStack v3: вычисляем count через .length
            lessonsCount: topic.theoryLessons.length,
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt,
          },
        }
      })
    } catch (error) {
      console.error('Ошибка получения темы:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// Создание новой темы
export async function createTheoryTopicAction(data: TheoryTopicFormData): Promise<{
  success: boolean
  topicId?: string
  error?: string
}> {
  return withSchoolAdmin(data.schoolId, async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      // ZenStack v3: aggregate поддерживается, используем для получения максимального sortOrder
      const allTopics = await db.theoryTopic.findMany({
        where: { organizationId: data.schoolId },
        select: { sortOrder: true },
        orderBy: { sortOrder: 'desc' },
        take: 1,
      })
      const maxSortOrder = allTopics[0]?.sortOrder ?? 0

      const topic = await db.theoryTopic.create({
        data: {
          organizationId: data.schoolId,
          name: data.name,
          description: data.description || null,
          categories: data.categories,
          sortOrder: data.sortOrder || maxSortOrder + 1,
          materials: data.materials || [],
          isActive: true,
        },
      })

      return { success: true, topicId: topic.id }
    } catch (error) {
      console.error('Ошибка создания темы:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// Обновление темы
export async function updateTheoryTopicAction(
  topicId: string,
  data: Partial<TheoryTopicFormData>
): Promise<{
  success: boolean
  error?: string
}> {
  return withSchoolAdmin('', async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      // Получаем тему для определения organizationId
      const topic = await db.theoryTopic.findUnique({
        where: { id: topicId },
        select: { organizationId: true },
      })

      if (!topic) {
        return { success: false, error: 'NOT_FOUND' }
      }

      // Проверяем права через обёртку и обновляем
      return withSchoolAdmin(topic.organizationId, async (adminUser) => {
        const adminDb = getEnhancedPrisma(adminUser)
        await adminDb.theoryTopic.update({
          where: { id: topicId },
          data: {
            name: data.name,
            description: data.description,
            categories: data.categories,
            sortOrder: data.sortOrder,
            materials: data.materials,
          },
        })

        return { success: true }
      })
    } catch (error) {
      console.error('Ошибка обновления темы:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// Архивирование темы
export async function archiveTheoryTopicAction(topicId: string): Promise<{
  success: boolean
  error?: string
}> {
  return withSchoolAdmin('', async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      const topic = await db.theoryTopic.findUnique({
        where: { id: topicId },
        select: { organizationId: true },
      })

      if (!topic) {
        return { success: false, error: 'NOT_FOUND' }
      }

      return withSchoolAdmin(topic.organizationId, async (adminUser) => {
        const adminDb = getEnhancedPrisma(adminUser)
        await adminDb.theoryTopic.update({
          where: { id: topicId },
          data: { isActive: false },
        })

        return { success: true }
      })
    } catch (error) {
      console.error('Ошибка архивирования темы:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// Восстановление темы
export async function restoreTheoryTopicAction(topicId: string): Promise<{
  success: boolean
  error?: string
}> {
  return withSchoolAdmin('', async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      const topic = await db.theoryTopic.findUnique({
        where: { id: topicId },
        select: { organizationId: true },
      })

      if (!topic) {
        return { success: false, error: 'NOT_FOUND' }
      }

      return withSchoolAdmin(topic.organizationId, async (adminUser) => {
        const adminDb = getEnhancedPrisma(adminUser)
        await adminDb.theoryTopic.update({
          where: { id: topicId },
          data: { isActive: true },
        })

        return { success: true }
      })
    } catch (error) {
      console.error('Ошибка восстановления темы:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// Изменение порядка тем
export async function reorderTheoryTopicsAction(
  schoolId: string,
  topicIds: string[]
): Promise<{
  success: boolean
  error?: string
}> {
  return withSchoolAdmin(schoolId, async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      // Обновляем порядок тем
      await Promise.all(
        topicIds.map((topicId, index) =>
          db.theoryTopic.update({
            where: { id: topicId },
            data: { sortOrder: index },
          })
        )
      )

      return { success: true }
    } catch (error) {
      console.error('Ошибка изменения порядка тем:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// Получение категорий прав школы из metadata
export async function getSchoolLicenseCategoriesAction(
  schoolId: string
): Promise<{ success: true; categories: LicenseCategory[] } | { success: false; error: string }> {
  return withSchoolMember(schoolId, async () => {
    try {
      const school = await prisma.organization.findUnique({
        where: { id: schoolId },
        select: { metadata: true },
      })

      if (!school) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const { licenseCategories } = parseOrganizationMetadata(school.metadata)
      return { success: true, categories: licenseCategories }
    } catch (error) {
      console.error('Ошибка получения категорий школы:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// Удаление темы (полное удаление, только если нет занятий)
export async function deleteTheoryTopicAction(topicId: string): Promise<{
  success: boolean
  error?: string
  message?: string
}> {
  return withSchoolAdmin('', async () => {
    try {
      // ZenStack v3.2.1 баг: select/include с relations генерирует невалидный SQL
      // Используем prisma напрямую для запросов с relations
      const topic = await prisma.theoryTopic.findUnique({
        where: { id: topicId },
        select: {
          organizationId: true,
          theoryLessons: { select: { id: true } },
        },
      })

      if (!topic) {
        return { success: false, error: 'NOT_FOUND' }
      }

      // ZenStack v3: вычисляем count через .length
      const lessonsCount = topic.theoryLessons.length

      return withSchoolAdmin(topic.organizationId, async (adminUser) => {
        const adminDb = getEnhancedPrisma(adminUser)
        // Проверяем, что нет связанных занятий
        if (lessonsCount > 0) {
          return {
            success: false,
            error: 'HAS_LESSONS',
            message: `Невозможно удалить тему: есть ${lessonsCount} связанных занятий. Используйте архивирование.`,
          }
        }

        await adminDb.theoryTopic.delete({
          where: { id: topicId },
        })

        return { success: true }
      })
    } catch (error) {
      console.error('Ошибка удаления темы:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}
