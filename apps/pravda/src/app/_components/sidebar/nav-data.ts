/**
 * Данные навигации для сайта законодательства.
 * Использует единый реестр документов из lib/documents.ts.
 */

import {
  type DocumentCategory,
  type DocumentInfo,
  getAllDocuments as getAll,
  getDocumentsByCategory,
} from '@/lib/documents'

export interface NavItem {
  title: string
  href: string
  description?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

/**
 * Конвертирует документ в NavItem.
 */
function toNavItem(doc: DocumentInfo): NavItem {
  return {
    title: doc.title,
    href: doc.href,
    description: doc.description,
  }
}

/**
 * Порядок категорий в навигации.
 */
const CATEGORY_ORDER: DocumentCategory[] = ['Основные законы', 'Кодексы', 'Уставы', 'Регламенты']

/**
 * Данные навигации — генерируются из единого реестра документов.
 */
export const navData: NavSection[] = CATEGORY_ORDER.map((category) => ({
  title: category,
  items: getDocumentsByCategory(category).map(toNavItem),
}))

/**
 * Получить все документы одним списком.
 */
export function getAllDocuments(): NavItem[] {
  return getAll().map(toNavItem)
}

/**
 * Найти документ по href.
 */
export function findDocumentByHref(href: string): NavItem | undefined {
  return getAllDocuments().find((item) => item.href === href)
}
