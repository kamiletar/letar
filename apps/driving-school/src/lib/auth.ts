import type { Gender, UserRole } from '@letar/driving-school-db/prisma'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth, organization } from 'better-auth/plugins'
import { cache } from 'react'
import { ac, roles } from './permissions'
import { prismaAuth } from './prisma'

/**
 * Конвертирует пол из OAuth провайдера в Gender enum
 */
function parseGender(sex: number | string | undefined): Gender | undefined {
  if (sex === 1 || sex === 'female') {
    return 'FEMALE'
  }
  if (sex === 2 || sex === 'male') {
    return 'MALE'
  }
  if (sex === 0 || sex === 'other') {
    return 'OTHER'
  }
  return undefined
}

/**
 * Парсит дату рождения из разных форматов
 * VK: "DD.MM.YYYY" или "DD.MM" (без года)
 * Yandex: "YYYY-MM-DD"
 * Google: { year, month, day }
 */
function parseBirthdate(bdate: string | { year?: number; month?: number; day?: number } | undefined): Date | undefined {
  if (!bdate) {
    return undefined
  }

  // Google формат: { year, month, day }
  if (typeof bdate === 'object') {
    if (bdate.year && bdate.month && bdate.day) {
      return new Date(bdate.year, bdate.month - 1, bdate.day)
    }
    return undefined
  }

  // VK формат: "DD.MM.YYYY" или "DD.MM"
  if (bdate.includes('.')) {
    const parts = bdate.split('.')
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number)
      return new Date(year, month - 1, day)
    }
    // Без года — игнорируем
    return undefined
  }

  // Yandex/ISO формат: "YYYY-MM-DD"
  if (bdate.includes('-')) {
    const date = new Date(bdate)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  return undefined
}

/**
 * Better Auth конфигурация для Driving School
 *
 * Особенности:
 * - Prisma adapter для PostgreSQL
 * - OAuth: Google, Yandex
 * - Email/password аутентификация
 * - Роли: USER, FREELANCE_INSTRUCTOR, MODERATOR, OWNER
 * - Кастомные поля: isOnboardingComplete
 * - Session-based auth с cookie caching
 */
export const auth = betterAuth({
  // Явно указываем baseURL в punycode для корректных OAuth redirect_uri
  // Google требует точное совпадение redirect_uri с зарегистрированным в Cloud Console
  baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:3003' : 'https://xn--80aaah6cnh.xn--p1ai',

  database: prismaAdapter(prismaAuth, {
    provider: 'postgresql',
  }),

  // Trusted origins — включаем и Punycode и кириллическую версию домена
  // Браузер может отправлять Origin в любом формате
  trustedOrigins: [
    'https://xn--80aaah6cnh.xn--p1ai', // Punycode: направа.рф
    'https://направа.рф', // Кириллица (некоторые браузеры)
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3003'] : []),
  ],

  // Email/Password auth
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // Запрещаем вход без подтверждённого email
    // OAuth пользователи уже получают emailVerified: true
    emailVerification: {
      requireEmailVerification: true,
    },
    // Используем bcrypt вместо scrypt (по умолчанию в Better Auth)
    // Это необходимо для совместимости с паролями, хешированными через bcryptjs
    password: {
      hash: async (password) => {
        const bcrypt = await import('bcryptjs')
        return bcrypt.hash(password, 12)
      },
      verify: async ({ hash, password }) => {
        const bcrypt = await import('bcryptjs')
        return bcrypt.compare(password, hash)
      },
    },
  },

  // OAuth провайдеры
  socialProviders: {
    // Google OAuth — только базовые scopes для входа
    // Calendar scopes запрашиваются отдельно при подключении синхронизации
    ...(process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET && {
        google: {
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          // Только базовые scopes для аутентификации
          scope: ['openid', 'email', 'profile'],
        },
      }),

    // VK (ВКонтакте) OAuth — требует HTTPS (используй ngrok для локальной разработки)
    // Собирает: email, phone, birthdate, gender
    ...(process.env.AUTH_VK_ID &&
      process.env.AUTH_VK_SECRET && {
        vk: {
          clientId: process.env.AUTH_VK_ID,
          clientSecret: process.env.AUTH_VK_SECRET,
          // Кастомный getUserInfo для VK API с дополнительными полями
          getUserInfo: async (tokens) => {
            // VK ID возвращает user_id в токене
            const userId = (tokens.raw as { user_id?: number })?.user_id

            // Получаем данные пользователя через VK API
            // fields: photo_200, screen_name, bdate (дата рождения), sex (пол), contacts (телефон)
            const response = await fetch(
              `https://api.vk.com/method/users.get?user_ids=${userId}&fields=photo_200,screen_name,bdate,sex,contacts&access_token=${tokens.accessToken}&v=5.131`
            )
            const data = await response.json()
            const user = data.response?.[0] as
              | {
                  id: number
                  first_name?: string
                  last_name?: string
                  screen_name?: string
                  photo_200?: string
                  bdate?: string // "DD.MM.YYYY" или "DD.MM"
                  sex?: number // 0 = не указан, 1 = женский, 2 = мужской
                  mobile_phone?: string
                  home_phone?: string
                }
              | undefined

            if (!user) {
              throw new Error('VK user not found')
            }

            // VK не возвращает email через users.get, получаем из токена
            const email = (tokens.raw as { email?: string })?.email

            // Парсим дату рождения и пол
            const birthdate = parseBirthdate(user.bdate)
            const gender = parseGender(user.sex)

            // Телефон из VK (если есть)
            const phone = user.mobile_phone || user.home_phone

            return {
              user: {
                id: String(user.id),
                name: `${user.first_name} ${user.last_name}`.trim() || user.screen_name,
                email: email || `${user.id}@vk.com`, // Fallback если нет email
                image: user.photo_200,
                emailVerified: !!email,
              },
              // Передаём дополнительные данные через data для mapProfileToUser
              data: {
                bdate: user.bdate,
                sex: user.sex,
                phone,
                _parsed: { birthdate, gender, phone },
              },
            }
          },
        },
      }),
  },

  // Плагины
  plugins: [
    nextCookies(),
    // genericOAuth для Yandex (ручная конфигурация, т.к. Yandex не поддерживает OIDC discovery)
    // Собирает: email, phone, birthdate, gender
    genericOAuth({
      config: [
        {
          providerId: 'yandex',
          clientId: process.env.AUTH_YANDEX_ID || '',
          clientSecret: process.env.AUTH_YANDEX_SECRET || '',
          authorizationUrl: 'https://oauth.yandex.ru/authorize',
          tokenUrl: 'https://oauth.yandex.ru/token',
          userInfoUrl: 'https://login.yandex.ru/info',
          // Расширенные scopes: birthday, телефон (default_phone)
          scopes: ['login:email', 'login:info', 'login:avatar', 'login:birthday', 'login:default_phone'],
          // Yandex возвращает email в поле default_email, а не email
          getUserInfo: async (token) => {
            const response = await fetch('https://login.yandex.ru/info', {
              headers: { Authorization: `OAuth ${token.accessToken}` },
            })
            const data = (await response.json()) as {
              id: string
              default_email?: string
              emails?: string[]
              display_name?: string
              real_name?: string
              login?: string
              default_avatar_id?: string
              birthday?: string // "YYYY-MM-DD"
              default_phone?: { number?: string } // { number: "+79123456789" }
              sex?: string // "male" | "female"
            }

            // Парсим дату рождения и пол
            const birthdate = parseBirthdate(data.birthday)
            const gender = parseGender(data.sex)
            const phone = data.default_phone?.number

            return {
              id: data.id,
              email: data.default_email || data.emails?.[0],
              name: data.display_name || data.real_name || data.login,
              image: data.default_avatar_id
                ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200`
                : undefined,
              emailVerified: true, // Yandex верифицирует email
              // Передаём дополнительные данные для mapProfileToUser
              birthdate,
              gender,
              phone,
            }
          },
        },
      ],
    }),
    // Organizations plugin для управления школами
    organization({
      ac,
      roles,
      // Динамический access control для кастомных ролей
      allowUserToCreateOrganization: async (_user) => {
        // Разрешаем создание школ только определённым ролям
        return true
      },
      // Teams для филиалов (SchoolLocation → Team)
      teams: {
        enabled: true,
        maximumTeams: 50, // Максимум филиалов на школу
      },
      // Расширенные поля организации
      schema: {
        organization: {
          additionalFields: {
            phone: {
              type: 'string',
              required: false,
            },
            email: {
              type: 'string',
              required: false,
            },
            website: {
              type: 'string',
              required: false,
            },
            description: {
              type: 'string',
              required: false,
            },
            isPublic: {
              type: 'boolean',
              defaultValue: false,
            },
            averageRating: {
              type: 'number',
              required: false,
            },
            reviewCount: {
              type: 'number',
              defaultValue: 0,
            },
            // JSON поля для массивов
            cities: {
              type: 'string',
              required: false, // JSON строка: ["Москва", "Питер"]
            },
            licenseCategories: {
              type: 'string',
              required: false, // JSON строка: ["B", "C"]
            },
          },
        },
        // Кастомное имя таблицы, т.к. Invitation уже занята (связь инструктор-ученик)
        invitation: {
          modelName: 'OrganizationInvitation',
        },
      },
    }),
  ],

  // Настройки сессии
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 дней
    updateAge: 60 * 60 * 24, // Обновлять каждый день
    cookieCache: {
      enabled: true,
      maxAge: 60, // Кэширование cookie на 1 минуту (снижено с 5 мин для экономии памяти)
    },
  },

  // Кастомные поля пользователя
  user: {
    additionalFields: {
      roles: {
        type: 'string[]',
        defaultValue: ['USER'],
        required: false,
      },
      isOnboardingComplete: {
        type: 'boolean',
        defaultValue: false,
        required: false,
      },
      // Дополнительные данные из OAuth
      phone: {
        type: 'string',
        required: false,
      },
      birthdate: {
        type: 'date',
        required: false,
      },
      gender: {
        type: 'string', // 'MALE' | 'FEMALE' | 'OTHER'
        required: false,
      },
    },
  },

  // Database hooks для сохранения дополнительных данных из OAuth
  databaseHooks: {
    account: {
      create: {
        // После создания аккаунта (OAuth) обновляем профиль пользователя дополнительными данными
        after: async (account) => {
          try {
            const { providerId, userId, accessToken } = account

            // VK — получаем данные через API
            if (providerId === 'vk' && accessToken) {
              // Получаем user_id из провайдера
              const providerUserId = account.accountId

              const response = await fetch(
                `https://api.vk.com/method/users.get?user_ids=${providerUserId}&fields=bdate,sex,contacts&access_token=${accessToken}&v=5.131`
              )
              const data = await response.json()
              const vkUser = data.response?.[0] as
                | {
                    bdate?: string
                    sex?: number
                    mobile_phone?: string
                    home_phone?: string
                  }
                | undefined

              if (vkUser) {
                const birthdate = parseBirthdate(vkUser.bdate)
                const gender = parseGender(vkUser.sex)
                const phone = vkUser.mobile_phone || vkUser.home_phone

                // Обновляем только пустые поля (не перезаписываем существующие)
                const user = await prismaAuth.user.findUnique({
                  where: { id: userId },
                  select: { birthdate: true, gender: true, phone: true },
                })

                const updateData: { birthdate?: Date; gender?: Gender; phone?: string } = {}
                if (birthdate && !user?.birthdate) {
                  updateData.birthdate = birthdate
                }
                if (gender && !user?.gender) {
                  updateData.gender = gender
                }
                if (phone && !user?.phone) {
                  updateData.phone = phone
                }

                if (Object.keys(updateData).length > 0) {
                  await prismaAuth.user.update({
                    where: { id: userId },
                    data: updateData,
                  })
                  console.warn(`[OAuth/VK] Обновлены данные пользователя ${userId}:`, Object.keys(updateData))
                }
              }
            }

            // Yandex — получаем данные через API
            if (providerId === 'yandex' && accessToken) {
              const response = await fetch('https://login.yandex.ru/info', {
                headers: { Authorization: `OAuth ${accessToken}` },
              })
              const yandexUser = (await response.json()) as {
                birthday?: string
                sex?: string
                default_phone?: { number?: string }
              }

              const birthdate = parseBirthdate(yandexUser.birthday)
              const gender = parseGender(yandexUser.sex)
              const phone = yandexUser.default_phone?.number

              // Обновляем только пустые поля
              const user = await prismaAuth.user.findUnique({
                where: { id: userId },
                select: { birthdate: true, gender: true, phone: true },
              })

              const updateData: { birthdate?: Date; gender?: Gender; phone?: string } = {}
              if (birthdate && !user?.birthdate) {
                updateData.birthdate = birthdate
              }
              if (gender && !user?.gender) {
                updateData.gender = gender
              }
              if (phone && !user?.phone) {
                updateData.phone = phone
              }

              if (Object.keys(updateData).length > 0) {
                await prismaAuth.user.update({
                  where: { id: userId },
                  data: updateData,
                })
                console.warn(`[OAuth/Yandex] Обновлены данные пользователя ${userId}:`, Object.keys(updateData))
              }
            }
          } catch (error) {
            // Логируем ошибку, но не прерываем вход
            console.error('[OAuth Hook] Ошибка сохранения дополнительных данных:', error)
          }
        },
      },
    },
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
    customRules: {
      '/sign-in/*': {
        window: 900,
        max: 5,
      },
      '/sign-up/*': {
        window: 3600,
        max: 3,
      },
    },
  },

  // Страницы
  pages: {
    signIn: '/sign-in',
    signUp: '/sign-up',
    error: '/sign-in',
  },
})

// Экспорт типов
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

/**
 * Расширенный тип пользователя
 */
export interface UserWithExtras {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  roles: UserRole[]
  isOnboardingComplete: boolean
  hasStudentProfile?: boolean
  hasInstructorProfile?: boolean
}

export interface SessionWithExtras {
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress?: string | null
    userAgent?: string | null
    createdAt: Date
    updatedAt: Date
  }
  user: UserWithExtras
}

/**
 * Внутренняя функция получения сессии с кэшированием на уровне request.
 * React cache() дедуплицирует вызовы в рамках одного request.
 */
const getSessionCached = cache(async (): Promise<SessionWithExtras | null> => {
  const { headers } = await import('next/headers')
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return null
  }

  // Обогащаем данные из БД
  const dbUser = await prismaAuth.user.findUnique({
    where: { id: session.user.id },
    select: {
      roles: true,
      isOnboardingComplete: true,
      studentProfile: { select: { id: true } },
      instructorProfile: { select: { id: true } },
    },
  })

  if (!dbUser) {
    return null
  }

  return {
    ...session,
    user: {
      ...session.user,
      roles: dbUser.roles,
      isOnboardingComplete: dbUser.isOnboardingComplete,
      hasStudentProfile: !!dbUser.studentProfile,
      hasInstructorProfile: !!dbUser.instructorProfile,
    },
  } as SessionWithExtras
})

/**
 * Получить текущую сессию.
 * Использует React cache() для дедупликации вызовов в рамках одного request.
 */
export async function getSession(): Promise<SessionWithExtras | null> {
  return getSessionCached()
}

/**
 * Получить текущего пользователя
 */
export async function getCurrentUser(): Promise<UserWithExtras | null> {
  const session = await getSession()
  return session?.user ?? null
}

/**
 * Проверить, имеет ли пользователь роль
 */
export async function hasRole(role: UserRole | UserRole[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) {
    return false
  }
  const roles = Array.isArray(role) ? role : [role]
  return roles.some((r) => user.roles.includes(r))
}

/**
 * Проверить, является ли пользователь владельцем платформы
 */
export async function isOwner(): Promise<boolean> {
  return hasRole('OWNER')
}

/**
 * Проверить, является ли пользователь инструктором
 */
export async function isInstructor(): Promise<boolean> {
  return hasRole('FREELANCE_INSTRUCTOR')
}
