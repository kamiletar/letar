/* oxlint-disable no-array-index-key */
import { Badge, Box, Card, HStack, Text, VStack } from '@chakra-ui/react'
import { type ReactNode } from 'react'

interface RoleCardProps {
  icon: ReactNode
  title: string
  badge: string
  badgeColor: 'blue' | 'purple' | 'red'
  description: string
  features?: string[]
  highlighted?: boolean
}

/**
 * Карточка для отображения информации о роли
 *
 * @example
 * <RoleCard
 *   icon={<RiUserLine />}
 *   title="Клиент"
 *   badge="По умолчанию"
 *   badgeColor="blue"
 *   description="Доступ к персональной диагностике..."
 *   highlighted
 * />
 */
export function RoleCard({
  icon,
  title,
  badge,
  badgeColor,
  description,
  features,
  highlighted = false,
}: RoleCardProps) {
  return (
    <Card.Root
      flex={1}
      borderWidth={highlighted ? '2px' : '1px'}
      borderColor={highlighted ? `${badgeColor}.300` : 'border'}
      bg={highlighted ? `${badgeColor}.50` : 'bg.subtle'}
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-4px)',
        shadow: 'lg',
      }}
    >
      <Card.Body p={6}>
        <VStack gap={3} align="start">
          {/* Заголовок с иконкой и бейджем */}
          <HStack justify="space-between" width="full">
            <HStack gap={2}>
              <Box fontSize="24px" color={`${badgeColor}.600`}>
                {icon}
              </Box>
              <Text fontWeight="bold" fontSize="lg">
                {title}
              </Text>
            </HStack>
            <Badge colorPalette={badgeColor} size="sm">
              {badge}
            </Badge>
          </HStack>

          {/* Описание */}
          <Text fontSize="sm" color="fg.muted">
            {description}
          </Text>

          {/* Список возможностей */}
          {features && features.length > 0 && (
            <VStack gap={1} align="start" width="full" mt={2}>
              {/* oxlint-disable-next-line no-array-index-key */}
              {features.map((feature, index) => (
                <HStack key={index} gap={2}>
                  <Box fontSize="xs" color={`${badgeColor}.500`}>
                    ✓
                  </Box>
                  <Text fontSize="xs" color="fg.muted">
                    {feature}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
