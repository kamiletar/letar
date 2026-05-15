'use client'

import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { LogoutButton } from '@/app/dashboard/_components/logout-button'
import { Button, HStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuHouse } from 'react-icons/lu'

/**
 * Хедер для страниц инструктора с навигацией в личный кабинет
 */
export function InstructorHeader() {
  return (
    <HStack justify="space-between">
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard">
          <LuHouse />В личный кабинет
        </Link>
      </Button>
      <HStack gap={2}>
        <ColorModeButton />
        <LogoutButton />
      </HStack>
    </HStack>
  )
}
