'use client'

/**
 * Переключатель вида: турнирная таблица / перекрёстная.
 * Использует searchParams для серверной навигации.
 */

import { HStack, Text } from '@chakra-ui/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LuGrid3X3, LuTable } from 'react-icons/lu'

export type StandingsView = 'table' | 'cross'

interface StandingsViewToggleProps {
  currentView: StandingsView
}

export function StandingsViewToggle({ currentView }: StandingsViewToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const toggle = (view: StandingsView) => {
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'table') {
      params.delete('view')
    } else {
      params.set('view', view)
    }
    const query = params.toString()
    router.push(`${pathname}${query ? `?${query}` : ''}`)
  }

  return (
    <HStack gap={0} borderWidth="1px" borderColor="border.muted" borderRadius="lg" overflow="hidden" alignSelf="start">
      <ToggleButton
        active={currentView === 'table'}
        onClick={() =>
          toggle('table')}
        icon={<LuTable size={14} />}
        label="Таблица"
      />
      <ToggleButton
        active={currentView === 'cross'}
        onClick={() =>
          toggle('cross')}
        icon={<LuGrid3X3 size={14} />}
        label="Перекрёстная"
      />
    </HStack>
  )
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <HStack
      gap={1.5}
      px={3}
      py={1.5}
      cursor="pointer"
      bg={active ? 'brand.solid' : 'transparent'}
      color={active ? 'white' : 'fg.muted'}
      fontSize="sm"
      fontWeight={active ? 'medium' : 'normal'}
      _hover={active ? {} : { bg: 'bg.subtle' }}
      transition="all 0.15s"
      onClick={onClick}
    >
      {icon}
      <Text display={{ base: 'none', sm: 'inline' }}>{label}</Text>
    </HStack>
  )
}
