/**
 * Единый реестр документов.
 * Является единственным источником истины для названий,
 * категорий и URL всех документов на сайте.
 */

/** Категория документа */
export type DocumentCategory = 'Основные законы' | 'Кодексы' | 'Уставы' | 'Регламенты'

/** Информация о документе */
export interface DocumentInfo {
  /** Уникальный slug документа (используется в URL) */
  slug: string
  /** Полное название документа */
  title: string
  /** Короткое название для TOC и закладок */
  shortTitle?: string
  /** Категория документа */
  category: DocumentCategory
  /** Полный путь URL */
  href: string
  /** Описание (опционально) */
  description?: string
}

/**
 * Полный список всех документов.
 * Порядок соответствует навигации на сайте.
 */
export const documents: DocumentInfo[] = [
  // Основные законы
  {
    slug: 'constitution',
    title: 'Конституция',
    category: 'Основные законы',
    href: '/constitution',
    description: 'Основной закон государства',
  },
  {
    slug: 'pravda',
    title: 'Русская Правда',
    category: 'Основные законы',
    href: '/pravda',
    description: 'Свод законов Руси',
  },

  // Кодексы
  {
    slug: 'tax',
    title: 'Налоговый кодекс',
    category: 'Кодексы',
    href: '/codes/tax',
  },
  {
    slug: 'criminal',
    title: 'Уголовный кодекс',
    category: 'Кодексы',
    href: '/codes/criminal',
  },
  {
    slug: 'family',
    title: 'Семейный кодекс',
    category: 'Кодексы',
    href: '/codes/family',
  },
  {
    slug: 'labor',
    title: 'Трудовой кодекс',
    category: 'Кодексы',
    href: '/codes/labor',
  },
  {
    slug: 'digital',
    title: 'Цифровой кодекс',
    category: 'Кодексы',
    href: '/codes/digital',
  },
  {
    slug: 'medical',
    title: 'Медицинский кодекс',
    category: 'Кодексы',
    href: '/codes/medical',
  },
  {
    slug: 'ordeals',
    title: 'Кодекс испытаний и ордалий',
    shortTitle: 'Кодекс ордалий',
    category: 'Кодексы',
    href: '/codes/ordeals',
  },
  {
    slug: 'criminal-procedure',
    title: 'Уголовно-процессуальный кодекс',
    shortTitle: 'УПК',
    category: 'Кодексы',
    href: '/codes/criminal-procedure',
  },
  {
    slug: 'penal',
    title: 'Уголовно-исполнительный кодекс',
    shortTitle: 'УИК',
    category: 'Кодексы',
    href: '/codes/penal',
  },
  {
    slug: 'construction',
    title: 'Строительный кодекс',
    category: 'Кодексы',
    href: '/codes/construction',
  },
  {
    slug: 'state-secrets',
    title: 'Кодекс государственных тайн',
    shortTitle: 'Кодекс гос. тайн',
    category: 'Кодексы',
    href: '/codes/state-secrets',
  },

  // Уставы
  {
    slug: 'church',
    title: 'Церковный устав',
    category: 'Уставы',
    href: '/statutes/church',
  },
  {
    slug: 'trade',
    title: 'Торговый устав',
    category: 'Уставы',
    href: '/statutes/trade',
  },
  {
    slug: 'military',
    title: 'Военный устав',
    category: 'Уставы',
    href: '/statutes/military',
  },
  {
    slug: 'education',
    title: 'Образовательный устав',
    category: 'Уставы',
    href: '/statutes/education',
  },
  {
    slug: 'road',
    title: 'Дорожный устав',
    category: 'Уставы',
    href: '/statutes/road',
  },
  {
    slug: 'postal',
    title: 'Почтовый устав',
    category: 'Уставы',
    href: '/statutes/postal',
  },
  {
    slug: 'fair',
    title: 'Ярмарочный устав',
    category: 'Уставы',
    href: '/statutes/fair',
  },

  // Регламенты
  {
    slug: 'duel',
    title: 'Дуэльный регламент',
    category: 'Регламенты',
    href: '/regulations/duel',
  },
  {
    slug: 'veche',
    title: 'Вечевой регламент',
    category: 'Регламенты',
    href: '/regulations/veche',
  },
  {
    slug: 'municipality',
    title: 'Муниципальный регламент',
    category: 'Регламенты',
    href: '/regulations/municipality',
  },
]

/**
 * Получить документ по slug.
 */
export function getDocumentBySlug(slug: string): DocumentInfo | undefined {
  return documents.find((d) => d.slug === slug)
}

/**
 * Получить документы по категории.
 */
export function getDocumentsByCategory(category: DocumentCategory): DocumentInfo[] {
  return documents.filter((d) => d.category === category)
}

/**
 * Получить все документы.
 */
export function getAllDocuments(): DocumentInfo[] {
  return documents
}

/**
 * Получить маппинг slug -> короткое название (для закладок).
 */
export function getTitleMap(): Record<string, string> {
  return Object.fromEntries(documents.map((d) => [d.slug, d.shortTitle || d.title]))
}

/**
 * Получить маппинг URL prefix -> категория.
 */
export function getCategoryFromPath(path: string): DocumentCategory {
  if (path.startsWith('/codes/')) {
    return 'Кодексы'
  }
  if (path.startsWith('/statutes/')) {
    return 'Уставы'
  }
  if (path.startsWith('/regulations/')) {
    return 'Регламенты'
  }
  return 'Основные законы'
}
