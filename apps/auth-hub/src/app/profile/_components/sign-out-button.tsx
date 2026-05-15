'use client'

import { signOut } from '@/lib/auth-client'
import { Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuLogOut } from 'react-icons/lu'

/**
 * Кнопка выхода из аккаунта
 */
export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await signOut({ fetchOptions: { onSuccess: () => router.push('/sign-in') } })
  }

  return (
    <Button variant="outline" colorPalette="red" onClick={handleSignOut} loading={loading} w="full">
      <LuLogOut />
      Выйти
    </Button>
  )
}
