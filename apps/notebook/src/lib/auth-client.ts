'use client'

import { createAuthClientWithOAuth, createSignInWithLetarAuth } from '@letar/auth/client'

export const authClient = createAuthClientWithOAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

export const { signOut } = authClient

/** Вход через Ключницу, единственный способ входа */
export const signInWithLetarAuth = createSignInWithLetarAuth(authClient, { defaultCallbackURL: '/' })
