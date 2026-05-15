'use server'

import { z } from 'zod/v4'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { ContractTemplateType } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface ContractTemplateListItem {
  id: string
  name: string
  type: ContractTemplateType
  description: string | null
  isActive: boolean
  currentVersion: {
    id: string
    version: string
  } | null
  updatedAt: Date
}

export interface ContractTemplateDetail {
  id: string
  name: string
  type: ContractTemplateType
  description: string | null
  isActive: boolean
  organizationId: string
  currentVersion: {
    id: string
    version: string
    content: string
    changelog: string | null
    effectiveAt: Date
    createdAt: Date
  } | null
  versions: {
    id: string
    version: string
    changelog: string | null
    effectiveAt: Date
    createdAt: Date
  }[]
  createdAt: Date
  updatedAt: Date
}

// === Схемы валидации ===

const CreateTemplateSchema = z
  .object({
    organizationId: z.string().cuid(),
    name: z.string().min(2, 'Минимум 2 символа').max(200, 'Максимум 200 символов'),
    type: z.enum(['TRAINING_CONTRACT', 'THEORY_CONTRACT', 'PRACTICE_CONTRACT', 'CUSTOM']),
    description: z.string().max(1000).optional(),
    content: z.string().min(10, 'Минимум 10 символов'),
  })
  .strip()

const UpdateTemplateSchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(1000).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strip()

const CreateVersionSchema = z
  .object({
    templateId: z.string().cuid(),
    content: z.string().min(10, 'Минимум 10 символов'),
    changelog: z.string().max(500).optional(),
  })
  .strip()

// === Получение списка шаблонов ===

export type GetTemplatesResult =
  | { success: true; templates: ContractTemplateListItem[] }
  | { success: false; error: 'UNAUTHORIZED' | 'NOT_SCHOOL_ADMIN' | 'UNKNOWN_ERROR' }

export async function getContractTemplates(organizationId: string): Promise<GetTemplatesResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    // Проверяем права доступа
    const membership = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
    })

    if (!membership) {
      return { success: false, error: 'NOT_SCHOOL_ADMIN' }
    }

    const templates = await prisma.contractTemplate.findMany({
      where: { organizationId },
      include: {
        currentVersion: {
          select: {
            id: true,
            version: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return {
      success: true,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        description: t.description,
        isActive: t.isActive,
        currentVersion: t.currentVersion,
        updatedAt: t.updatedAt,
      })),
    }
  } catch (error) {
    console.error('Ошибка получения шаблонов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение деталей шаблона ===

export type GetTemplateDetailResult =
  | { success: true; template: ContractTemplateDetail }
  | { success: false; error: 'UNAUTHORIZED' | 'NOT_FOUND' | 'NOT_SCHOOL_ADMIN' | 'UNKNOWN_ERROR' }

export async function getContractTemplateDetail(templateId: string): Promise<GetTemplateDetailResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const template = await prisma.contractTemplate.findUnique({
      where: { id: templateId },
      include: {
        currentVersion: true,
        versions: {
          select: {
            id: true,
            version: true,
            changelog: true,
            effectiveAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!template) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права доступа
    const membership = await prisma.member.findFirst({
      where: {
        organizationId: template.organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
    })

    if (!membership) {
      return { success: false, error: 'NOT_SCHOOL_ADMIN' }
    }

    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        description: template.description,
        isActive: template.isActive,
        organizationId: template.organizationId,
        currentVersion: template.currentVersion
          ? {
              id: template.currentVersion.id,
              version: template.currentVersion.version,
              content: template.currentVersion.content,
              changelog: template.currentVersion.changelog,
              effectiveAt: template.currentVersion.effectiveAt,
              createdAt: template.currentVersion.createdAt,
            }
          : null,
        versions: template.versions,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    }
  } catch (error) {
    console.error('Ошибка получения шаблона:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Создание шаблона ===

export type CreateTemplateResult = { success: true; templateId: string } | { success: false; error: string }

export async function createContractTemplate(input: unknown): Promise<CreateTemplateResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'Необходима авторизация' }
    }

    const parsed = CreateTemplateSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return { success: false, error: firstError?.message || 'Ошибка валидации' }
    }

    const { organizationId, name, type, description, content } = parsed.data

    // Проверяем права доступа
    const membership = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
    })

    if (!membership) {
      return { success: false, error: 'Недостаточно прав' }
    }

    // Проверяем уникальность имени
    const existing = await prisma.contractTemplate.findFirst({
      where: { organizationId, name },
    })

    if (existing) {
      return { success: false, error: 'Шаблон с таким названием уже существует' }
    }

    // Создаём шаблон с первой версией
    const template = await prisma.$transaction(async (tx) => {
      // Создаём шаблон
      const template = await tx.contractTemplate.create({
        data: {
          organizationId,
          name,
          type: type as ContractTemplateType,
          description: description || null,
          isActive: true,
        },
      })

      // Создаём первую версию
      const version = await tx.contractTemplateVersion.create({
        data: {
          templateId: template.id,
          version: '1.0',
          content,
          changelog: 'Первоначальная версия',
        },
      })

      // Обновляем шаблон с текущей версией
      await tx.contractTemplate.update({
        where: { id: template.id },
        data: { currentVersionId: version.id },
      })

      return template
    })

    return { success: true, templateId: (template as unknown as { id: string }).id }
  } catch (error) {
    console.error('Ошибка создания шаблона:', error)
    return { success: false, error: 'Не удалось создать шаблон' }
  }
}

// === Обновление шаблона ===

export type UpdateTemplateResult = { success: true } | { success: false; error: string }

export async function updateContractTemplate(input: unknown): Promise<UpdateTemplateResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'Необходима авторизация' }
    }

    const parsed = UpdateTemplateSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return { success: false, error: firstError?.message || 'Ошибка валидации' }
    }

    const { id, ...data } = parsed.data

    // Получаем шаблон
    const template = await prisma.contractTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return { success: false, error: 'Шаблон не найден' }
    }

    // Проверяем права доступа
    const membership = await prisma.member.findFirst({
      where: {
        organizationId: template.organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
    })

    if (!membership) {
      return { success: false, error: 'Недостаточно прав' }
    }

    // Если меняется имя — проверяем уникальность
    if (data.name && data.name !== template.name) {
      const existing = await prisma.contractTemplate.findFirst({
        where: {
          organizationId: template.organizationId,
          name: data.name,
          id: { not: id },
        },
      })

      if (existing) {
        return { success: false, error: 'Шаблон с таким названием уже существует' }
      }
    }

    await prisma.contractTemplate.update({
      where: { id },
      data,
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка обновления шаблона:', error)
    return { success: false, error: 'Не удалось обновить шаблон' }
  }
}

// === Создание новой версии шаблона ===

export type CreateVersionResult = { success: true; versionId: string } | { success: false; error: string }

export async function createTemplateVersion(input: unknown): Promise<CreateVersionResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'Необходима авторизация' }
    }

    const parsed = CreateVersionSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return { success: false, error: firstError?.message || 'Ошибка валидации' }
    }

    const { templateId, content, changelog } = parsed.data

    // Получаем шаблон с текущей версией
    const template = await prisma.contractTemplate.findUnique({
      where: { id: templateId },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!template) {
      return { success: false, error: 'Шаблон не найден' }
    }

    // Проверяем права доступа
    const membership = await prisma.member.findFirst({
      where: {
        organizationId: template.organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
    })

    if (!membership) {
      return { success: false, error: 'Недостаточно прав' }
    }

    // Определяем номер новой версии
    const lastVersion = template.versions[0]
    const [major, minor] = (lastVersion?.version || '0.0').split('.').map(Number)
    const newVersion = `${major}.${(minor || 0) + 1}`

    // Создаём версию и обновляем шаблон
    const version = await prisma.$transaction(async (tx) => {
      const version = await tx.contractTemplateVersion.create({
        data: {
          templateId,
          version: newVersion,
          content,
          changelog: changelog || null,
        },
      })

      await tx.contractTemplate.update({
        where: { id: templateId },
        data: { currentVersionId: version.id },
      })

      return version
    })

    return { success: true, versionId: (version as unknown as { id: string }).id }
  } catch (error) {
    console.error('Ошибка создания версии:', error)
    return { success: false, error: 'Не удалось создать версию' }
  }
}

// === Удаление шаблона ===

export type DeleteTemplateResult = { success: true } | { success: false; error: string }

export async function deleteContractTemplate(templateId: string): Promise<DeleteTemplateResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'Необходима авторизация' }
    }

    const template = await prisma.contractTemplate.findUnique({
      where: { id: templateId },
      include: {
        _count: {
          select: {
            versions: true,
          },
        },
      },
    })

    if (!template) {
      return { success: false, error: 'Шаблон не найден' }
    }

    // Проверяем права доступа
    const membership = await prisma.member.findFirst({
      where: {
        organizationId: template.organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'super_manager'] },
      },
    })

    if (!membership) {
      return { success: false, error: 'Недостаточно прав' }
    }

    // Проверяем наличие сгенерированных договоров
    const generatedCount = await prisma.generatedContract.count({
      where: {
        templateVersion: {
          templateId,
        },
      },
    })

    if (generatedCount > 0) {
      return {
        success: false,
        error: `Невозможно удалить: по этому шаблону уже создано ${generatedCount} договоров`,
      }
    }

    // Удаляем шаблон (версии удалятся каскадно)
    await prisma.contractTemplate.delete({
      where: { id: templateId },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления шаблона:', error)
    return { success: false, error: 'Не удалось удалить шаблон' }
  }
}
