/**
 * Seed данных для Dashboard
 * Запуск: bun prisma db seed --schema=./src/generated/schema.prisma
 */

import { randomBytes } from 'crypto'
import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

/**
 * Генерация безопасного токена для агента
 */
function generateAgentToken(): string {
  return randomBytes(32).toString('hex')
}

async function main() {
  console.log('🌱 Seeding database...')

  // ============================================================================
  // Сервер s2.letar.best (локальный) — dashboard, driving-school
  // ============================================================================
  generateAgentToken()
  const s2Server = await prisma.server.upsert({
    where: { name: 's2-letar' },
    update: {},
    create: {
      name: 's2-letar',
      displayName: 's2.letar.best',
      host: '185.28.85.195',
      port: 3100,
      isLocal: true,
      isActive: true,
      sortOrder: 0,
    },
  })
  console.log(`✅ Server: ${s2Server.displayName} (id: ${s2Server.id})`)

  // Приложения на s2
  const s2Apps = [
    {
      name: 'dashboard',
      displayName: 'Dashboard',
      containerName: 'dashboard-app',
      port: 3002,
      type: 'WEB' as const,
      domain: 'dash.letar.best',
    },
    {
      name: 'driving-school',
      displayName: 'Автошкола',
      containerName: 'driving-school-app',
      port: 3003,
      type: 'WEB' as const,
      domain: 'направа.рф',
    },
    {
      name: 'auth-hub',
      displayName: 'Ключница',
      containerName: 'auth-hub-app',
      port: 3010,
      type: 'WEB' as const,
      domain: 'auth.letar.best',
    },
    {
      name: 'archetest',
      displayName: 'Архетест',
      containerName: 'archetest-app',
      port: 3012,
      type: 'WEB' as const,
      domain: 'archetest.letar.best',
    },
    {
      name: 'time',
      displayName: 'Time',
      containerName: 'time-app',
      port: 3013,
      type: 'WEB' as const,
      domain: 'time.letar.best',
    },
    {
      name: 'form-docs',
      displayName: '@letar/forms Docs',
      containerName: 'form-docs-app',
      port: 3020,
      type: 'WEB' as const,
      domain: 'forms.letar.best',
    },
    {
      name: 'form-example',
      displayName: '@letar/forms Example',
      containerName: 'form-example-app',
      port: 3022,
      type: 'WEB' as const,
      domain: 'forms-example.letar.best',
    },
    {
      name: 'grandslamcup',
      displayName: 'Grand Slam Cup',
      containerName: 'grandslamcup-app',
      port: 3016,
      type: 'WEB' as const,
      domain: 'grandslamcup.letar.best',
    },
    {
      name: 'aira-web',
      displayName: 'Aira',
      containerName: 'aira-web-app',
      port: 3017,
      type: 'WEB' as const,
      domain: 'aira.letar.best',
    },
    {
      name: 'mandala',
      displayName: 'Mandala',
      containerName: 'mandala-app',
      port: 3004,
      type: 'WEB' as const,
      domain: 'mandala.letar.best',
    },
    {
      name: 'kami',
      displayName: 'Kami',
      containerName: 'kami-app',
      port: 3005,
      type: 'WEB' as const,
      domain: 'kami.letar.best',
    },
    {
      name: 'pravda',
      displayName: 'Pravda',
      containerName: 'pravda-app',
      port: 3007,
      type: 'WEB' as const,
      domain: 'pravda.letar.best',
    },
    {
      name: 'animatrona-landing',
      displayName: 'Animatrona Landing',
      containerName: 'animatrona-landing-app',
      port: 3008,
      type: 'WEB' as const,
      domain: 'animatrona.letar.best',
    },
    {
      name: 'animatrona-tracker',
      displayName: 'Animatrona Tracker',
      containerName: 'animatrona-tracker-app',
      port: 3009,
      type: 'WEB' as const,
      domain: 'animatrona-tracker.letar.best',
    },
    {
      name: 'umami',
      displayName: 'Umami Analytics',
      containerName: 'umami-app',
      port: 3033,
      type: 'WEB' as const,
      domain: null,
    },
    {
      name: 'kami-key-the-landing',
      displayName: 'KamiKeyThe',
      containerName: 'kami-key-the-landing-app',
      port: 3011,
      type: 'WEB' as const,
      domain: 'kamikeythe.letar.best',
    },
    {
      name: 'letar-landing',
      displayName: 'Letar Landing',
      containerName: 'letar-landing-app',
      port: 3015,
      type: 'WEB' as const,
      domain: 'letar.best',
    },
    {
      name: 'grandslamcup-staging',
      displayName: 'GrandSlamCup Staging',
      containerName: 'grandslamcup-staging-app',
      port: 3016,
      type: 'WEB' as const,
      domain: 'gsc-test.letar.best',
    },
    {
      name: 'aboi',
      displayName: 'НейроАбоИ',
      containerName: 'aboi-app',
      port: 3018,
      type: 'WEB' as const,
      domain: 'aboi.letar.best',
    },
  ]

  for (const app of s2Apps) {
    await prisma.deployedApp.upsert({
      where: { name_serverId: { name: app.name, serverId: s2Server.id } },
      update: { domain: app.domain },
      create: { ...app, serverId: s2Server.id },
    })
    console.log(`  📦 App: ${app.displayName} (${app.name})`)
  }

  // ============================================================================
  // Сервер s1.letar.best (удалённый с агентом) — premium-rosstil, imot
  // ============================================================================
  const s1Token = generateAgentToken()
  const s1Server = await prisma.server.upsert({
    where: { name: 's1-letar' },
    update: {},
    create: {
      name: 's1-letar',
      displayName: 's1.letar.best',
      host: '194.164.245.97',
      port: 3100,
      isLocal: false,
      isActive: true,
      agentToken: s1Token,
      sortOrder: 1,
    },
  })
  console.log(`✅ Server: ${s1Server.displayName} (id: ${s1Server.id})`)
  console.log(`  🔑 Agent Token: ${s1Token}`)

  // Приложения на s1
  const s1Apps = [
    {
      name: 'premium-rosstil',
      displayName: 'Premium Rosstil',
      containerName: 'premium-rosstil-app',
      port: 3000,
      type: 'WEB' as const,
      domain: 'premium.rosstil.ru',
    },
    {
      name: 'imot',
      displayName: 'IMOT',
      containerName: 'imot-app',
      port: 3001,
      type: 'WEB' as const,
      domain: 'integrelle.com',
    },
  ]

  for (const app of s1Apps) {
    await prisma.deployedApp.upsert({
      where: { name_serverId: { name: app.name, serverId: s1Server.id } },
      update: { domain: app.domain },
      create: { ...app, serverId: s1Server.id },
    })
    console.log(`  📦 App: ${app.displayName} (${app.name})`)
  }

  console.log('\n🎉 Seed completed!')
  console.log('\n⚠️  ВАЖНО: Сохраните Agent Token для s1-letar в .env файл агента!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
