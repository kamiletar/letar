import animatronaPreview from '@/assets/projects/animatrona.webp'
import kamiPreview from '@/assets/projects/kami.webp'
import mandalaPreview from '@/assets/projects/mandala.webp'
import studioPreview from '@/assets/projects/studio.webp'
import type { StaticImageData } from 'next/image'

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

/** Большое превью одного из ключевых входов или продуктов экосистемы */
export interface ShowcaseProject {
  name: string
  label: string
  description: string
  url: string
  image: StaticImageData
  imageAlt: string
  tone: 'terminal' | 'paper' | 'color' | 'violet'
}

/** Два главных входа в экосистему: услуги студии и личный сайт автора */
export const ecosystemEntrances: ShowcaseProject[] = [
  {
    name: 'Studio Letar',
    label: 'Разработка',
    description: 'Сайты, приложения и цифровые продукты — от идеи до продакшена.',
    url: 'https://studio.letar.best',
    image: studioPreview,
    imageAlt: 'Главная страница Studio Letar в эстетике компьютерного терминала',
    tone: 'terminal',
  },
  {
    name: 'Kami',
    label: 'Автор',
    description: 'Личный сайт, блог и профессиональная история архитектора ПО.',
    url: 'https://kami.letar.best',
    image: kamiPreview,
    imageAlt: 'Главная страница личного сайта Kami',
    tone: 'paper',
  },
]

/** Проекты, которые первыми показывают широту экосистемы */
export const featuredProjects: ShowcaseProject[] = [
  {
    name: 'Mandala',
    label: 'PWA · Искусство',
    description: 'Медитативная галерея мандал, которая работает и без интернета.',
    url: 'https://mandala.letar.best',
    image: mandalaPreview,
    imageAlt: 'Интерактивная галерея проекта Mandala',
    tone: 'color',
  },
  {
    name: 'Animatrona',
    label: 'Desktop · Медиа',
    description: 'Управление аниме-коллекцией и GPU-транскодирование в одном приложении.',
    url: 'https://animatrona.letar.best',
    image: animatronaPreview,
    imageAlt: 'Лендинг десктопного приложения Animatrona',
    tone: 'violet',
  },
]

/** Все проекты, сгруппированные по категориям */
export const projectCategories: ProjectCategory[] = [
  {
    title: 'Веб-приложения',
    projects: [
      {
        name: 'Studio Letar',
        description: 'Веб-студия разработки сайтов, приложений и цифровых продуктов',
        url: 'https://studio.letar.best',
        emoji: '💻',
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
        description: 'Личный сайт и блог архитектора ПО',
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
    defaultCollapsed: true,
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
    defaultCollapsed: true,
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

/** Количество уникальных карточек полного каталога */
export const projectCount = projectCategories.reduce((total, category) => total + category.projects.length, 0)
