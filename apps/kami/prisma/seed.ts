import { parsePostgresUrl } from '@letar/pg-url'
import { runSeed } from '@letar/seed-utils'
import { ZenStackClient } from '@zenstackhq/orm'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { SkillLevel } from '../src/generated/prisma'
import { schema } from '../src/generated/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан')
}

const prisma = new ZenStackClient(schema, {
  dialect: new PostgresDialect({
    pool: new Pool(parsePostgresUrl(process.env.DATABASE_URL)),
  }) as never,
})

async function main() {
  console.log('Seeding database...')

  // Очистка существующих данных
  await prisma.skill.deleteMany()
  await prisma.skillCategory.deleteMany()
  await prisma.project.deleteMany()

  // ========================================
  // Категории навыков
  // ========================================

  const frontend = await prisma.skillCategory.create({
    data: {
      name: 'Frontend',
      nameEn: 'Frontend',
      slug: 'frontend',
      icon: 'Monitor',
      order: 1,
    },
  })

  const backend = await prisma.skillCategory.create({
    data: {
      name: 'Backend',
      nameEn: 'Backend',
      slug: 'backend',
      icon: 'Server',
      order: 2,
    },
  })

  const tools = await prisma.skillCategory.create({
    data: {
      name: 'Инструменты и DevOps',
      nameEn: 'Tools & DevOps',
      slug: 'tools',
      icon: 'Wrench',
      order: 3,
    },
  })

  const softSkills = await prisma.skillCategory.create({
    data: {
      name: 'Soft Skills',
      nameEn: 'Soft Skills',
      slug: 'soft-skills',
      icon: 'Users',
      order: 4,
    },
  })

  // ========================================
  // Frontend навыки
  // ========================================

  await prisma.skill.createMany({
    data: [
      {
        name: 'React',
        slug: 'react',
        level: SkillLevel.EXPERT,
        startYear: 2016,
        icon: 'react',
        categoryId: frontend.id,
        order: 1,
        featured: true,
        url: 'https://react.dev',
      },
      {
        name: 'Next.js',
        slug: 'nextjs',
        level: SkillLevel.EXPERT,
        startYear: 2021,
        icon: 'nextjs',
        categoryId: frontend.id,
        order: 2,
        featured: true,
        url: 'https://nextjs.org',
      },
      {
        name: 'TypeScript',
        slug: 'typescript',
        level: SkillLevel.EXPERT,
        startYear: 2020,
        icon: 'typescript',
        categoryId: frontend.id,
        order: 3,
        featured: true,
        url: 'https://typescriptlang.org',
      },
      {
        name: 'Chakra UI',
        slug: 'chakra-ui',
        level: SkillLevel.EXPERT,
        startYear: 2022,
        icon: 'chakra',
        categoryId: frontend.id,
        order: 4,
        featured: true,
        url: 'https://chakra-ui.com',
      },
      {
        name: 'TanStack Query',
        slug: 'tanstack-query',
        level: SkillLevel.ADVANCED,
        startYear: 2023,
        icon: 'tanstack',
        categoryId: frontend.id,
        order: 5,
        featured: false,
        url: 'https://tanstack.com/query',
      },
      {
        name: 'TanStack Form',
        slug: 'tanstack-form',
        level: SkillLevel.ADVANCED,
        startYear: 2024,
        icon: 'tanstack',
        categoryId: frontend.id,
        order: 6,
        featured: false,
        url: 'https://tanstack.com/form',
      },
      {
        name: 'Framer Motion',
        slug: 'framer-motion',
        level: SkillLevel.INTERMEDIATE,
        startYear: 2023,
        icon: 'framer',
        categoryId: frontend.id,
        order: 7,
        featured: false,
        url: 'https://motion.dev',
      },
      {
        name: 'React Native',
        slug: 'react-native',
        level: SkillLevel.INTERMEDIATE,
        startYear: 2025,
        icon: 'react',
        categoryId: frontend.id,
        order: 8,
        featured: false,
        url: 'https://reactnative.dev',
      },
    ],
  })

  // ========================================
  // Backend навыки
  // ========================================

  await prisma.skill.createMany({
    data: [
      {
        name: 'Node.js',
        slug: 'nodejs',
        level: SkillLevel.EXPERT,
        startYear: 2019,
        icon: 'nodejs',
        categoryId: backend.id,
        order: 1,
        featured: true,
        url: 'https://nodejs.org',
      },
      {
        name: 'PostgreSQL',
        slug: 'postgresql',
        level: SkillLevel.ADVANCED,
        startYear: 2021,
        icon: 'postgresql',
        categoryId: backend.id,
        order: 2,
        featured: true,
        url: 'https://postgresql.org',
      },
      {
        name: 'Prisma',
        slug: 'prisma',
        level: SkillLevel.EXPERT,
        startYear: 2022,
        icon: 'prisma',
        categoryId: backend.id,
        order: 3,
        featured: true,
        url: 'https://prisma.io',
      },
      {
        name: 'ZenStack',
        slug: 'zenstack',
        level: SkillLevel.EXPERT,
        startYear: 2024,
        icon: 'zenstack',
        categoryId: backend.id,
        order: 4,
        featured: true,
        url: 'https://zenstack.dev',
      },
      {
        name: 'Better Auth',
        slug: 'better-auth',
        level: SkillLevel.ADVANCED,
        startYear: 2024,
        icon: 'lock',
        categoryId: backend.id,
        order: 5,
        featured: false,
        url: 'https://better-auth.com',
      },
      {
        name: 'Zod',
        slug: 'zod',
        level: SkillLevel.EXPERT,
        startYear: 2022,
        icon: 'zod',
        categoryId: backend.id,
        order: 6,
        featured: false,
        url: 'https://zod.dev',
      },
      {
        name: 'Go',
        slug: 'go',
        level: SkillLevel.INTERMEDIATE,
        startYear: 2025,
        icon: 'go',
        categoryId: backend.id,
        order: 7,
        featured: false,
        url: 'https://go.dev',
      },
      {
        name: 'IPFS / libp2p',
        slug: 'ipfs',
        level: SkillLevel.ADVANCED,
        startYear: 2025,
        icon: 'ipfs',
        categoryId: backend.id,
        order: 8,
        featured: false,
        url: 'https://ipfs.tech',
      },
    ],
  })

  // ========================================
  // Инструменты и DevOps
  // ========================================

  await prisma.skill.createMany({
    data: [
      {
        name: 'Git',
        slug: 'git',
        level: SkillLevel.EXPERT,
        startYear: 2017,
        icon: 'git',
        categoryId: tools.id,
        order: 1,
        featured: true,
        url: 'https://git-scm.com',
      },
      {
        name: 'Docker',
        slug: 'docker',
        level: SkillLevel.ADVANCED,
        startYear: 2022,
        icon: 'docker',
        categoryId: tools.id,
        order: 2,
        featured: true,
        url: 'https://docker.com',
      },
      {
        name: 'Nx',
        slug: 'nx',
        level: SkillLevel.EXPERT,
        startYear: 2023,
        icon: 'nx',
        categoryId: tools.id,
        order: 3,
        featured: true,
        url: 'https://nx.dev',
      },
      {
        name: 'Bun',
        slug: 'bun',
        level: SkillLevel.ADVANCED,
        startYear: 2024,
        icon: 'bun',
        categoryId: tools.id,
        order: 4,
        featured: false,
        url: 'https://bun.sh',
      },
      {
        name: 'Playwright',
        slug: 'playwright',
        level: SkillLevel.ADVANCED,
        startYear: 2024,
        icon: 'playwright',
        categoryId: tools.id,
        order: 5,
        featured: false,
        url: 'https://playwright.dev',
      },
      {
        name: 'Vitest',
        slug: 'vitest',
        level: SkillLevel.ADVANCED,
        startYear: 2024,
        icon: 'vitest',
        categoryId: tools.id,
        order: 6,
        featured: false,
        url: 'https://vitest.dev',
      },
      {
        name: 'Nginx / NPM',
        slug: 'nginx',
        level: SkillLevel.ADVANCED,
        startYear: 2022,
        icon: 'nginx',
        categoryId: tools.id,
        order: 7,
        featured: false,
        url: 'https://nginx.org',
      },
      {
        name: 'Linux / SSH',
        slug: 'linux',
        level: SkillLevel.ADVANCED,
        startYear: 2020,
        icon: 'terminal',
        categoryId: tools.id,
        order: 8,
        featured: false,
      },
    ],
  })

  // ========================================
  // Soft Skills
  // ========================================

  await prisma.skill.createMany({
    data: [
      {
        name: 'Архитектура',
        slug: 'architecture',
        level: SkillLevel.ADVANCED,
        icon: 'building',
        categoryId: softSkills.id,
        order: 1,
        featured: true,
      },
      {
        name: 'AI-assisted разработка',
        slug: 'ai-dev',
        level: SkillLevel.EXPERT,
        icon: 'bot',
        categoryId: softSkills.id,
        order: 2,
        featured: true,
        description: 'Claude Code, Copilot, MCP серверы',
      },
      {
        name: 'Code Review',
        slug: 'code-review',
        level: SkillLevel.EXPERT,
        icon: 'search',
        categoryId: softSkills.id,
        order: 3,
        featured: false,
      },
      {
        name: 'Менторство',
        slug: 'mentoring',
        level: SkillLevel.ADVANCED,
        icon: 'users',
        categoryId: softSkills.id,
        order: 4,
        featured: false,
      },
    ],
  })

  // ========================================
  // Проекты
  // ========================================

  await prisma.project.createMany({
    data: [
      {
        title: 'Animatrona',
        titleEn: 'Animatrona',
        slug: 'animatrona',
        description:
          'Медиаплатформа с децентрализованным IPFS-стримингом аниме. Включает веб-плеер, мобильное приложение, TV-клиент, пиннинг-инфраструктуру и кастомный relay на Go.',
        descriptionEn:
          'Decentralized anime streaming platform with IPFS. Includes web player, mobile app, TV client, pinning infrastructure and custom Go relay.',
        demoUrl: 'https://anime.letar.best',
        technologies: ['Next.js', 'React Native', 'IPFS', 'Go', 'FFmpeg', 'HLS', 'Docker'],
        featured: true,
        order: 1,
      },
      {
        title: 'Premium Rosstil',
        titleEn: 'Premium Rosstil',
        slug: 'premium-rosstil',
        description:
          'Интернет-магазин премиальной одежды с кастомными заказами, корзиной и интеграцией платёжных систем.',
        descriptionEn: 'Premium clothing e-commerce store with custom orders, shopping cart and payment integration.',
        technologies: ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL', 'Chakra UI', 'ZenStack'],
        featured: true,
        order: 2,
      },
      {
        title: 'Driving School',
        titleEn: 'Driving School',
        slug: 'driving-school',
        description:
          'SaaS-платформа для управления автошколами с мультитенантностью, расписанием занятий, учётом учеников и инструкторов.',
        descriptionEn:
          'Multi-tenant SaaS platform for driving schools with scheduling, student and instructor management.',
        demoUrl: 'https://driving-school.letar.best',
        technologies: ['Next.js', 'ZenStack', 'Better Auth', 'TanStack Query', 'Chakra UI', 'PWA'],
        featured: true,
        order: 3,
      },
      {
        title: 'IMOT',
        titleEn: 'IMOT',
        slug: 'imot',
        description:
          'Платформа для интегративной психотерапии: запись на консультации, профили терапевтов, онлайн-сессии.',
        descriptionEn: 'Integrative psychotherapy platform: appointment booking, therapist profiles, online sessions.',
        technologies: ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL', 'Better Auth'],
        featured: true,
        order: 4,
      },
      {
        title: 'Dashboard',
        titleEn: 'Dashboard',
        slug: 'dashboard',
        description:
          'Панель мониторинга серверной инфраструктуры: статус контейнеров, метрики, логи, управление деплоем.',
        descriptionEn:
          'Server infrastructure monitoring dashboard: container status, metrics, logs, deployment management.',
        demoUrl: 'https://dashboard.letar.best',
        technologies: ['Next.js', 'Docker API', 'SSE', 'Umami', 'Chakra UI'],
        featured: true,
        order: 5,
      },
      {
        title: 'Archetest',
        titleEn: 'Archetest',
        slug: 'archetest',
        description: 'Платформа архетипических тестов и психологических опросников с визуализацией результатов.',
        descriptionEn: 'Archetypal testing and psychological survey platform with result visualization.',
        demoUrl: 'https://archetest.letar.best',
        technologies: ['Next.js', 'Prisma', 'Chakra UI', 'Chart.js', 'PostgreSQL'],
        featured: false,
        order: 6,
      },
      {
        title: 'Kami',
        titleEn: 'Kami',
        slug: 'kami',
        description: 'Портфолио-сайт с блогом, навыками, проектами и мультиязычностью. Этот сайт.',
        descriptionEn: 'Portfolio website with blog, skills, projects and i18n. This website.',
        demoUrl: 'https://kami.letar.best',
        technologies: ['Next.js', 'ZenStack', 'Chakra UI', 'next-intl', 'Better Auth'],
        featured: false,
        order: 7,
      },
      {
        title: 'Pravda',
        titleEn: 'Pravda',
        slug: 'pravda',
        description: 'Новостная платформа с категориями, тегами и поиском.',
        descriptionEn: 'News platform with categories, tags and search.',
        demoUrl: 'https://pravda.letar.best',
        technologies: ['Next.js', 'Prisma', 'Chakra UI', 'PostgreSQL'],
        featured: false,
        order: 8,
      },
      {
        title: 'Mandala',
        titleEn: 'Mandala',
        slug: 'mandala',
        description: 'Генератор мандал с параметрической графикой и экспортом в PNG/SVG.',
        descriptionEn: 'Mandala generator with parametric graphics and PNG/SVG export.',
        demoUrl: 'https://mandala.letar.best',
        technologies: ['Next.js', 'Canvas API', 'Chakra UI', 'TypeScript'],
        featured: false,
        order: 9,
      },
      {
        title: 'Label Printer',
        titleEn: 'Label Printer',
        slug: 'label-printer',
        description:
          'Desktop-приложение для печати этикеток на TSC TE300. Поддержка штрихкодов, QR-кодов и кастомных шаблонов.',
        descriptionEn:
          'Desktop label printing application for TSC TE300. Barcode, QR code and custom template support.',
        technologies: ['Electron', 'React', 'TypeScript', 'TSPL', 'Node.js'],
        featured: false,
        order: 10,
      },
    ],
  })

  console.log('Database seeded successfully!')
  console.log('  - 4 skill categories')
  console.log('  - 28 skills')
  console.log('  - 10 projects')
}

void runSeed(main, () => prisma.$disconnect())
