/* eslint-disable no-console */
import { PrismaClient } from '../src/generated/prisma/index.js'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Создаём шаблоны этикеток
  const defaultTemplate = await prisma.template.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Стандартный',
      path: 'label-template.png',
      width: 685,
      height: 461,
      isDefault: true,
    },
  })

  const muzkoiTemplate = await prisma.template.upsert({
    where: { id: 'muzkoi' },
    update: {},
    create: {
      id: 'muzkoi',
      name: 'Мужской',
      path: 'label-template-muzkoi.png',
      width: 685,
      height: 461,
      isDefault: false,
    },
  })

  console.log('Created templates:', { defaultTemplate, muzkoiTemplate })

  // Создаём настройки по умолчанию
  const settings = await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      printerName: 'TSC_TE300',
      printerMode: 'MOCK',
      printerSpeed: 4,
      printerDensity: 8,
      copies: 1,
      templateId: 'default',
      datamatrixX: 26,
      datamatrixY: 160,
      datamatrixSize: 90,
      gtinX: 526,
      gtinY: 10,
      gtinWidth: 140,
      gtinHeight: 440,
      allowDuplicates: false,
      autoReconnect: true,
      retryAttempts: 3,
    },
  })

  console.log('Created settings:', settings)

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
