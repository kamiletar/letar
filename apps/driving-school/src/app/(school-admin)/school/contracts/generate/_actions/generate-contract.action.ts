'use server'

import { writeFile } from 'fs/promises'
import { join } from 'path'

import type { TemplateData } from '@letar/contract-generator'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateContractPdf } from '@/lib/pdf/generate-contract-pdf'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

interface GenerateContractResult {
  contractId: string
  pdfUrl: string
  contractNumber: string
}

/**
 * Генерация договора для ученика
 */
export async function generateContractAction(
  studentProgressId: string,
  templateId: string
): Promise<ActionResult<GenerateContractResult>> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  // Загружаем данные ученика
  const studentProgress = await prisma.studentProgress.findFirst({
    where: {
      id: studentProgressId,
      organization: {
        members: {
          some: {
            userId: session.user.id,
            role: { in: ['owner', 'super_manager', 'manager'] },
          },
        },
      },
    },
    include: {
      user: true,
      organization: true,
      studyGroup: { select: { categories: true } },
    },
  })

  if (!studentProgress) {
    return { success: false, error: 'Ученик не найден' }
  }

  // Проверяем наличие паспортных данных
  if (!studentProgress.passport || !studentProgress.registrationAddress) {
    return { success: false, error: 'Заполните паспортные данные ученика' }
  }

  // Загружаем шаблон
  const template = await prisma.contractTemplate.findFirst({
    where: {
      id: templateId,
      organizationId: studentProgress.organizationId,
      isActive: true,
    },
    include: {
      currentVersion: true,
    },
  })

  if (!template || !template.currentVersion) {
    return { success: false, error: 'Шаблон не найден или неактивен' }
  }

  // Формируем номер договора
  const year = new Date().getFullYear()
  const contractCount = await prisma.generatedContract.count({
    where: {
      studentProgress: {
        organizationId: studentProgress.organizationId,
      },
      createdAt: {
        gte: new Date(year, 0, 1),
      },
    },
  })
  const contractNumber = `${contractCount + 1}/${year}`

  // Собираем данные для подстановки
  const passport = studentProgress.passport as {
    series: string
    number: string
    issuedBy: string
    issuedAt: string
    departmentCode: string
  }

  // Получаем метаданные организации
  const orgMetadata = (studentProgress.organization.metadata || {}) as Record<string, unknown>

  // Определяем категорию обучения из учебной группы или дефолт
  const category = studentProgress.studyGroup?.categories?.[0] || 'B'

  // Форматируем сумму прописью (упрощённая реализация)
  const price = (orgMetadata.defaultPrice as number) || 30000
  const priceWords = formatPriceWords(price)

  // Вычисляем возраст
  const birthdate = studentProgress.user.birthdate
  const age = birthdate ? Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 18

  const contractData: TemplateData = {
    student: {
      fullName: studentProgress.user.name || '',
      lastName: studentProgress.user.name?.split(' ')[0] || '',
      firstName: studentProgress.user.name?.split(' ')[1] || '',
      middleName: studentProgress.user.name?.split(' ')[2] || '',
      birthdate: birthdate ? new Date(birthdate).toLocaleDateString('ru-RU') : '',
      age,
      phone: studentProgress.user.phone || '',
      email: studentProgress.user.email || '',
      passport: {
        series: passport.series,
        number: passport.number,
        issuedBy: passport.issuedBy,
        issuedAt: passport.issuedAt,
        departmentCode: passport.departmentCode,
      },
      registrationAddress: studentProgress.registrationAddress || '',
      snils: studentProgress.snils || '',
      isMinor: age < 18,
    },
    school: {
      name: studentProgress.organization.name || '',
      fullName: (orgMetadata.fullName as string) || studentProgress.organization.name || '',
      inn: (orgMetadata.inn as string) || '',
      ogrn: (orgMetadata.ogrn as string) || '',
      kpp: (orgMetadata.kpp as string) || '',
      legalAddress: (orgMetadata.legalAddress as string) || '',
      actualAddress: (orgMetadata.actualAddress as string) || '',
      phone: (orgMetadata.phone as string) || '',
      email: (orgMetadata.email as string) || '',
      directorName: (orgMetadata.directorName as string) || '',
      directorPosition: (orgMetadata.directorPosition as string) || 'Директор',
      basis: (orgMetadata.basis as string) || 'Устава',
      licenseNumber: (orgMetadata.licenseNumber as string) || '',
      licenseDate: (orgMetadata.licenseDate as string) || '',
      bankName: (orgMetadata.bankName as string) || '',
      bankBik: (orgMetadata.bankBik as string) || '',
      bankAccount: (orgMetadata.bankAccount as string) || '',
      corrAccount: (orgMetadata.corrAccount as string) || '',
      city: (orgMetadata.city as string) || 'Москва',
    },
    contract: {
      number: contractNumber,
      date: new Date().toLocaleDateString('ru-RU'),
      category,
      price,
      priceWords,
    },
  }

  // Генерируем PDF через @react-pdf/renderer (лёгкий, быстрый)
  let pdfResult: { buffer: Buffer; size: number }
  try {
    pdfResult = await generateContractPdf(contractData)
  } catch (error) {
    console.error('Ошибка генерации PDF:', error)
    return { success: false, error: 'Ошибка генерации PDF' }
  }

  // Сохраняем PDF файл
  const fileName = `contract_${contractNumber.replace('/', '_')}_${studentProgressId}.pdf`
  const uploadsDir = join(process.cwd(), 'uploads', 'contracts')

  // Создаём директорию если не существует
  try {
    const { mkdir } = await import('fs/promises')
    await mkdir(uploadsDir, { recursive: true })
  } catch {
    // Директория уже существует
  }

  const filePath = join(uploadsDir, fileName)
  await writeFile(filePath, pdfResult.buffer)

  // Создаём запись File
  const file = await prisma.file.create({
    data: {
      filename: fileName,
      mimeType: 'application/pdf',
      size: pdfResult.size,
      path: `/uploads/contracts/${fileName}`,
      category: 'CONTRACT',
      uploadedById: session.user.id,
    },
  })

  // Создаём запись GeneratedContract
  const contract = await prisma.generatedContract.create({
    data: {
      templateVersionId: template.currentVersion.id,
      studentProgressId,
      snapshotData: JSON.stringify(contractData),
      contractNumber,
      pdfFileId: file.id,
      status: 'DRAFT',
    },
  })

  return {
    success: true,
    data: {
      contractId: contract.id,
      pdfUrl: file.path,
      contractNumber,
    },
  }
}

/**
 * Получение списка договоров ученика
 */
export async function getStudentContracts(studentProgressId: string) {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const contracts = await prisma.generatedContract.findMany({
    where: {
      studentProgressId,
      studentProgress: {
        OR: [
          { userId: session.user.id },
          {
            organization: {
              members: {
                some: {
                  userId: session.user.id,
                  role: { in: ['owner', 'super_manager', 'manager'] },
                },
              },
            },
          },
        ],
      },
    },
    include: {
      templateVersion: {
        include: {
          template: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      },
      pdfFile: {
        select: {
          path: true,
          filename: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return { success: true, data: contracts }
}

/**
 * Обновление статуса договора
 */
export async function updateContractStatus(
  contractId: string,
  status: 'DRAFT' | 'PENDING_SIGN' | 'SIGNED' | 'VOID'
): Promise<ActionResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const contract = await prisma.generatedContract.findFirst({
    where: {
      id: contractId,
      studentProgress: {
        organization: {
          members: {
            some: {
              userId: session.user.id,
              role: { in: ['owner', 'super_manager', 'manager'] },
            },
          },
        },
      },
    },
  })

  if (!contract) {
    return { success: false, error: 'Договор не найден' }
  }

  await prisma.generatedContract.update({
    where: { id: contractId },
    data: {
      status,
      signedAt: status === 'SIGNED' ? new Date() : undefined,
    },
  })

  return { success: true, data: undefined }
}

/**
 * Упрощённое преобразование числа в слова
 */
function formatPriceWords(price: number): string {
  const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
  const teens = [
    'десять',
    'одиннадцать',
    'двенадцать',
    'тринадцать',
    'четырнадцать',
    'пятнадцать',
    'шестнадцать',
    'семнадцать',
    'восемнадцать',
    'девятнадцать',
  ]
  const tens = [
    '',
    '',
    'двадцать',
    'тридцать',
    'сорок',
    'пятьдесят',
    'шестьдесят',
    'семьдесят',
    'восемьдесят',
    'девяносто',
  ]
  const hundreds = [
    '',
    'сто',
    'двести',
    'триста',
    'четыреста',
    'пятьсот',
    'шестьсот',
    'семьсот',
    'восемьсот',
    'девятьсот',
  ]

  if (price === 0) {
    return 'ноль рублей'
  }

  const thousands = Math.floor(price / 1000)
  const remainder = price % 1000

  let result = ''

  if (thousands > 0) {
    if (thousands >= 100) {
      result += hundreds[Math.floor(thousands / 100)] + ' '
    }
    const t = thousands % 100
    if (t >= 10 && t < 20) {
      result += teens[t - 10] + ' '
    } else {
      if (t >= 20) {
        result += tens[Math.floor(t / 10)] + ' '
      }
      const u = t % 10
      if (u === 1) {
        result += 'одна '
      } else if (u === 2) {
        result += 'две '
      } else if (u > 0) {
        result += units[u] + ' '
      }
    }
    // Склонение "тысяча/тысячи/тысяч"
    const lastTwo = thousands % 100
    const lastOne = thousands % 10
    if (lastTwo >= 11 && lastTwo <= 19) {
      result += 'тысяч '
    } else if (lastOne === 1) {
      result += 'тысяча '
    } else if (lastOne >= 2 && lastOne <= 4) {
      result += 'тысячи '
    } else {
      result += 'тысяч '
    }
  }

  if (remainder > 0) {
    if (remainder >= 100) {
      result += hundreds[Math.floor(remainder / 100)] + ' '
    }
    const r = remainder % 100
    if (r >= 10 && r < 20) {
      result += teens[r - 10] + ' '
    } else {
      if (r >= 20) {
        result += tens[Math.floor(r / 10)] + ' '
      }
      const u = r % 10
      if (u > 0) {
        result += units[u] + ' '
      }
    }
  }

  // Склонение "рубль/рубля/рублей"
  const lastTwo = price % 100
  const lastOne = price % 10
  if (lastTwo >= 11 && lastTwo <= 19) {
    result += 'рублей'
  } else if (lastOne === 1) {
    result += 'рубль'
  } else if (lastOne >= 2 && lastOne <= 4) {
    result += 'рубля'
  } else {
    result += 'рублей'
  }

  return result.trim()
}
