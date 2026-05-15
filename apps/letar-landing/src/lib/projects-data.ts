/** Проект в каталоге */
export interface Project {
  /** Название проекта */
  name: string
  /** Краткое описание */
  description: string
  /** Ссылка (внешняя или null для десктопных) */
  url: string | null
  /** Эмодзи-иконка */
  emoji: string
  /** Технологии (для бейджей) */
  tech?: string[]
}

/** Категория проектов */
export interface ProjectCategory {
  /** Название категории */
  title: string
  /** Список проектов */
  projects: Project[]
  /** Свёрнуто по умолчанию */
  defaultCollapsed?: boolean
}

/** Все проекты, сгруппированные по категориям */
export const projectCategories: ProjectCategory[] = [
  {
    title: 'Веб-приложения',
    projects: [
      {
        name: 'Premium Rosstil',
        description: 'Fashion e-commerce платформа',
        url: 'https://premium.rosstil.ru',
        emoji: '👗',
        tech: ['Next.js', 'PostgreSQL', 'ZenStack'],
      },
      {
        name: 'Integrelle',
        description: 'Платформа для психотерапии',
        url: 'https://integrelle.com',
        emoji: '🧠',
        tech: ['Next.js', 'PostgreSQL', 'ZenStack'],
      },
      {
        name: 'Mandala',
        description: 'Галерея мандал и магазин (PWA)',
        url: 'https://mandala.letar.best',
        emoji: '🎨',
        tech: ['Next.js', 'PWA', 'PostgreSQL'],
      },
      {
        name: 'Kami',
        description: 'Личный сайт архитектора ПО',
        url: 'https://kami.letar.best',
        emoji: '📝',
        tech: ['Next.js', 'PostgreSQL', 'ZenStack'],
      },
      {
        name: 'Pravda',
        description: 'Шуточное законодательство воображаемой РФ',
        url: 'https://pravda.letar.best',
        emoji: '⚖️',
        tech: ['Next.js'],
      },
      {
        name: 'Направа.рф',
        description: 'Платформа автошколы с чатом',
        url: 'https://направа.рф',
        emoji: '🚗',
        tech: ['Next.js', 'WebSocket', 'PostgreSQL'],
      },
      {
        name: 'Animatrona Tracker',
        description: 'Трекер аниме-коллекции',
        url: 'https://animatrona-tracker.letar.best',
        emoji: '📊',
        tech: ['Next.js', 'PostgreSQL', 'Shikimori'],
      },
      {
        name: 'Grand Slam Cup',
        description: 'Командный поэтический турнир',
        url: 'https://grandslamcup.letar.best',
        emoji: '🏆',
        tech: ['Next.js', 'PostgreSQL', 'ZenStack'],
      },
      {
        name: 'Aira',
        description: 'Релизы пост-квантового P2P мессенджера',
        url: 'https://aira.letar.best',
        emoji: '🛡️',
        tech: ['Next.js', 'MDX'],
      },
      {
        name: 'Time',
        description: 'Приложение для управления временем',
        url: 'https://time.letar.best',
        emoji: '⏱️',
        tech: ['Next.js', 'PostgreSQL', 'ZenStack'],
      },
      {
        name: 'Archetest',
        description: 'Тест определения архетипа личности',
        url: 'https://archetest.letar.best',
        emoji: '🔮',
        tech: ['Next.js', 'PostgreSQL'],
      },
    ],
  },
  {
    title: 'Десктоп и мобильные',
    projects: [
      {
        name: 'Animatrona',
        description: 'Видеоконвертер с GPU-транскодированием и IPFS',
        url: 'https://animatrona.letar.best',
        emoji: '🖥️',
        tech: ['Electron', 'AV1', 'HEVC', 'IPFS'],
      },
      {
        name: 'Animatrona Mobile',
        description: 'Мобильный клиент для просмотра аниме',
        url: null,
        emoji: '📱',
        tech: ['React Native', 'IPFS'],
      },
      {
        name: 'Label Printer',
        description: 'Печать этикеток с поддержкой Честного Знака',
        url: null,
        emoji: '🏷️',
        tech: ['Electron', 'TSPL'],
      },
      {
        name: 'KamiKeyThe',
        description: 'Ввод типографских символов через AltGr',
        url: 'https://kamikeythe.letar.best',
        emoji: '⌨️',
        tech: ['Electron'],
      },
      {
        name: 'Animatrona TV',
        description: 'Просмотр аниме на телевизоре',
        url: null,
        emoji: '📺',
        tech: ['Next.js', 'IPFS'],
      },
    ],
  },
  {
    title: 'Инфраструктура',
    projects: [
      {
        name: 'Dashboard',
        description: 'Мониторинг серверов в реальном времени',
        url: 'https://dash.letar.best',
        emoji: '📈',
        tech: ['Next.js', 'SSE', 'Docker'],
      },
      {
        name: 'Ключница',
        description: 'Единый центр авторизации (OIDC)',
        url: 'https://auth.letar.best',
        emoji: '🔑',
        tech: ['Next.js', 'Better Auth', 'PostgreSQL'],
      },
      {
        name: 'Umami',
        description: 'Self-hosted веб-аналитика',
        url: 'https://stats.letar.best',
        emoji: '📉',
        tech: ['Umami', 'PostgreSQL'],
      },
    ],
  },
  {
    title: 'Библиотеки',
    projects: [
      {
        name: '@letar/forms',
        description: 'Декларативные формы на TanStack Form + Zod + Chakra UI',
        url: null,
        emoji: '📋',
        tech: ['React', 'Zod', 'TanStack Form'],
      },
      {
        name: 'Form Docs',
        description: 'Документация @letar/forms',
        url: 'https://forms.letar.best',
        emoji: '📚',
        tech: ['Fumadocs', 'MDX'],
      },
      {
        name: '@letar/zenstack-form-plugin',
        description: 'Генерация Zod-схем форм из ZenStack моделей',
        url: null,
        emoji: '🔌',
        tech: ['ZenStack', 'Zod', 'Prisma'],
      },
      {
        name: 'Form Example',
        description: 'Демо и примеры использования @letar/forms',
        url: 'https://forms-example.letar.best',
        emoji: '🧪',
        tech: ['Next.js', 'Zod', 'Prisma'],
      },
      {
        name: '@letar/analytics',
        description: 'Интеграция Umami аналитики для Next.js',
        url: null,
        emoji: '📊',
        tech: ['React', 'Umami'],
      },
    ],
  },
]
