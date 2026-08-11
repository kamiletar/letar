'use client'

import { Box, Flex, IconButton, Menu, Portal, Text } from '@chakra-ui/react'
import Link from 'next/link'
import type { ComponentType } from 'react'
import { LuEllipsisVertical } from 'react-icons/lu'

interface AdminAction {
  /** Иконка LucideReact */
  icon: ComponentType<{ size?: number }>
  /** Текст для меню и aria-label */
  label: string
  /** Ссылка (href) */
  href?: string
  /** Клик-обработчик */
  onClick?: () => void
  /** Цветовая палитра (например 'red' для удаления) */
  colorPalette?: string
  /** Открыть в новой вкладке */
  external?: boolean
}

interface AdminActionsMenuProps {
  actions: AdminAction[]
}

/**
 * Адаптивные action-кнопки:
 * - Desktop (md+): отдельные IconButton
 * - Mobile (base): одна кнопка ⋮ → выпадающее меню
 */
export function AdminActionsMenu({ actions }: AdminActionsMenuProps) {
  if (actions.length === 0) { return null }

  return (
    <>
      {/* Desktop: отдельные кнопки */}
      <Flex gap={1} display={{ base: 'none', md: 'flex' }}>
        {actions.map((action) => {
          const IconComp = action.icon
          const btn = (
            <IconButton
              key={action.label}
              variant="ghost"
              size="sm"
              minW="44px"
              minH="44px"
              colorPalette={action.colorPalette}
              aria-label={action.label}
              title={action.label}
              onClick={action.onClick}
            >
              <IconComp size={16} />
            </IconButton>
          )
          if (action.href) {
            return (
              <Link key={action.label} href={action.href} target={action.external ? '_blank' : undefined}>
                {btn}
              </Link>
            )
          }
          return btn
        })}
      </Flex>

      {/* Mobile: меню */}
      <Box display={{ base: 'block', md: 'none' }}>
        <Menu.Root>
          <Menu.Trigger asChild>
            <IconButton variant="ghost" size="sm" minW="44px" minH="44px" aria-label="Действия">
              <LuEllipsisVertical size={18} />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content minW="180px">
                {actions.map((action) => {
                  const IconComp = action.icon
                  const content = (
                    <Flex align="center" gap={2}>
                      <IconComp size={16} />
                      <Text fontSize="sm">{action.label}</Text>
                    </Flex>
                  )

                  if (action.href) {
                    return (
                      <Menu.Item key={action.label} value={action.label} asChild>
                        <Link href={action.href} target={action.external ? '_blank' : undefined}>
                          {content}
                        </Link>
                      </Menu.Item>
                    )
                  }

                  return (
                    <Menu.Item key={action.label} value={action.label} onClick={action.onClick}>
                      {content}
                    </Menu.Item>
                  )
                })}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Box>
    </>
  )
}
