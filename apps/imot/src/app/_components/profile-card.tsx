'use client'

import { imotColors, type ImotLevel } from '@/lib/theme'
import { Badge, Box, Card, Heading, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface ProfileCardProps {
  /**
   * Заголовок карточки профиля
   */
  title: string

  /**
   * Описание профиля (опционально)
   */
  description?: string

  /**
   * Цвет карточки (используется из цветовой схемы IMOT)
   */
  colorScheme?: ImotLevel

  /**
   * Иконка профиля (опционально)
   */
  icon?: ReactNode

  /**
   * Статус профиля (заполнен/не заполнен)
   */
  status?: 'filled' | 'empty'

  /**
   * Содержимое карточки
   */
  children: ReactNode

  /**
   * Дополнительные действия в заголовке (например, кнопка редактирования)
   */
  actions?: ReactNode
}

/**
 * Универсальная карточка профиля для всех 5 уровней диагностики ИМОТ
 */
export function ProfileCard({
  title,
  description,
  colorScheme = 'integration',
  icon,
  status,
  children,
  actions,
}: ProfileCardProps) {
  const levelConfig = imotColors[colorScheme]

  return (
    <Card.Root
      borderTop="4px solid"
      borderColor={levelConfig.border}
      bg={levelConfig.bg}
      transition="all 0.3s ease"
      _hover={{
        transform: 'translateY(-2px)',
        shadow: 'lg',
      }}
    >
      <Card.Header>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={3}>
          <Box display="flex" alignItems="center" gap={3} flex="1">
            {icon && (
              <Box color={levelConfig.text} fontSize="2xl">
                {icon}
              </Box>
            )}
            <Box>
              <Heading size="md" color={levelConfig.text}>
                {title}
              </Heading>
              {description && (
                <Text fontSize="sm" color="gray.600" mt={1}>
                  {description}
                </Text>
              )}
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            {status && (
              <Badge colorPalette={status === 'filled' ? 'green' : 'gray'} variant="solid">
                {status === 'filled' ? 'Заполнено' : 'Не заполнено'}
              </Badge>
            )}
            {actions}
          </Box>
        </Box>
      </Card.Header>

      <Card.Body>{children}</Card.Body>
    </Card.Root>
  )
}
