import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { auth } from './auth'
import { prismaAuth } from './prisma'

export interface UserWithRoles {
  id: string
  email: string
  name?: string | null
  emailVerified: boolean
  image?: string | null
  isAnonymous: boolean
  roles: ('CUSTOMER' | 'MANAGER' | 'ADMIN')[]
  phone?: string | null
}

/**
 * Получить сессию с обогащением roles из БД (Better Auth не включает массивы по умолчанию).
 * Кэшируется на уровне React render — дедупликация в одном request.
 */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return null
  }

  const dbUser = await prismaAuth.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      image: true,
      isAnonymous: true,
      roles: true,
      phone: true,
    },
  })

  if (!dbUser) {
    return null
  }

  return {
    session: session.session,
    user: dbUser as UserWithRoles,
  }
})

/**
 * Получить текущего пользователя или null.
 */
export async function getCurrentUser(): Promise<UserWithRoles | null> {
  const session = await getSession()
  return session?.user ?? null
}

/**
 * Требует авторизации, иначе редирект на /sign-in.
 */
export async function requireAuth(): Promise<UserWithRoles> {
  const user = await getCurrentUser()
  if (!user || user.isAnonymous) {
    redirect('/sign-in')
  }
  return user
}

/**
 * Требует роль ADMIN, иначе редирект.
 */
export async function requireAdmin(): Promise<UserWithRoles> {
  const user = await requireAuth()
  if (!user.roles.includes('ADMIN')) {
    redirect('/')
  }
  return user
}

export async function hasRole(role: 'CUSTOMER' | 'MANAGER' | 'ADMIN'): Promise<boolean> {
  const user = await getCurrentUser()
  return !!user && user.roles.includes(role)
}
