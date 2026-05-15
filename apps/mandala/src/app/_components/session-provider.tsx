'use client'

import { SessionProvider as BetterAuthSessionProvider } from '@letar/auth/client'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <BetterAuthSessionProvider>{children}</BetterAuthSessionProvider>
}
