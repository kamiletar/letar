import { prisma } from '@/lib/db'
import type { LegalDocumentType } from '@letar/driving-school-db/prisma'

/**
 * Сервис для работы с юридическими документами
 */
export const legalService = {
  /**
   * Получить текущую версию документа по типу
   */
  async getCurrentVersion(type: LegalDocumentType) {
    const document = await prisma.legalDocument.findUnique({
      where: { type },
      include: {
        currentVersion: true,
      },
    })

    return document?.currentVersion ?? null
  },

  /**
   * Получить документ по slug
   */
  async getDocumentBySlug(slug: string) {
    const document = await prisma.legalDocument.findUnique({
      where: { slug },
      include: {
        currentVersion: true,
      },
    })

    return document
  },

  /**
   * Получить все версии документа
   */
  async getVersionHistory(documentId: string) {
    return prisma.legalDocumentVersion.findMany({
      where: { documentId },
      orderBy: { effectiveAt: 'desc' },
    })
  },

  /**
   * Проверить, принял ли пользователь текущую версию оферты
   */
  async hasUserAcceptedCurrentOffer(userId: string) {
    const offerDocument = await prisma.legalDocument.findUnique({
      where: { type: 'OFFER' },
      select: { currentVersionId: true },
    })

    if (!offerDocument?.currentVersionId) {
      // Если оферты нет в БД, считаем что принимать нечего
      return true
    }

    // Используем exists API (ZenStack v3.2.0) вместо findUnique + !!
    return prisma.userAgreement.exists({
      where: {
        userId,
        versionId: offerDocument.currentVersionId,
      },
    })
  },

  /**
   * Принять версию документа
   */
  async acceptVersion(userId: string, versionId: string, metadata?: { ipAddress?: string; userAgent?: string }) {
    return prisma.userAgreement.create({
      data: {
        userId,
        versionId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    })
  },

  /**
   * Получить все принятия пользователя
   */
  async getUserAgreements(userId: string) {
    return prisma.userAgreement.findMany({
      where: { userId },
      include: {
        version: {
          include: {
            document: true,
          },
        },
      },
      orderBy: { acceptedAt: 'desc' },
    })
  },

  /**
   * Создать или обновить документ (только для владельца)
   */
  async upsertDocument(data: {
    type: LegalDocumentType
    title: string
    slug: string
    version: string
    content: string
    summary?: string
  }) {
    // Сначала создаём или получаем документ
    let document = await prisma.legalDocument.findUnique({
      where: { type: data.type },
    })

    if (!document) {
      document = await prisma.legalDocument.create({
        data: {
          type: data.type,
          title: data.title,
          slug: data.slug,
        },
      })
    }

    // Создаём новую версию
    const version = await prisma.legalDocumentVersion.create({
      data: {
        documentId: document.id,
        version: data.version,
        content: data.content,
        summary: data.summary,
      },
    })

    // Обновляем текущую версию документа
    await prisma.legalDocument.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
    })

    return { document, version }
  },

  /**
   * Получить ID текущей версии оферты
   */
  async getCurrentOfferVersionId(): Promise<string | null> {
    const document = await prisma.legalDocument.findUnique({
      where: { type: 'OFFER' },
      select: { currentVersionId: true },
    })

    return document?.currentVersionId ?? null
  },
}
