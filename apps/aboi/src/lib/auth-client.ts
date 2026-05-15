'use client'

import { anonymousClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

type AnonymousPlugin = ReturnType<typeof anonymousClient>
type AboiAuthClient = ReturnType<
  typeof createAuthClient<{
    plugins: [AnonymousPlugin]
  }>
>

/**
 * Better Auth клиент для НейроАбоИ.
 * Используется в client-компонентах: useSession, signIn, signUp, signOut, anonymous.
 */
export const authClient: AboiAuthClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL,
  plugins: [anonymousClient()],
})

export const { signIn, signOut, useSession } = authClient
// signUp не реэкспортируем — используйте authClient.signUp.email(...) напрямую,
// чтобы избежать проблемы portable-types (TS2883) при destructuring с плагинами.
