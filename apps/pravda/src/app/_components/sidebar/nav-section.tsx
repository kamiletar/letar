'use client'

import { Box, Collapsible, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { memo, useState } from 'react'
import { LuChevronDown, LuChevronRight } from 'react-icons/lu'

import type { NavItem as NavItemType } from './nav-data'
import { NavItem } from './nav-item'

interface NavSectionProps {
  title: string
  items: NavItemType[]
  defaultOpen?: boolean
}

/**
 * Раскрывающаяся секция навигации.
 * Содержит заголовок и список элементов.
 * Мемоизирована для оптимизации ререндеров.
 */
export const NavSection = memo(function NavSection({ title, items, defaultOpen = true }: NavSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Box mb={4}>
      <Collapsible.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
        <Collapsible.Trigger asChild>
          <HStack
            as="button"
            w="full"
            py={2}
            px={2}
            cursor="pointer"
            borderRadius="md"
            _hover={{ bg: 'bg.subtle' }}
            justify="space-between"
            aria-expanded={isOpen}
          >
            <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide" color="fg.muted">
              {title}
            </Text>
            <Icon color="fg.muted" boxSize={4}>
              {isOpen ? <LuChevronDown /> : <LuChevronRight />}
            </Icon>
          </HStack>
        </Collapsible.Trigger>

        <Collapsible.Content>
          <VStack align="stretch" gap={0.5} mt={1}>
            {items.map((item) => <NavItem key={item.href} title={item.title} href={item.href} />)}
          </VStack>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  )
})
