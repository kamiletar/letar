/**
 * Карточка навигации в дашборде
 *
 * @module dashboard-card
 */

import { Box, Card, Heading, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'

import type { DashboardCardProps } from './dashboard.types'

/**
 * Карточка-ссылка для навигации
 */
export function DashboardCard({ icon, title, description, href }: DashboardCardProps) {
  return (
    <Card.Root _hover={{ shadow: 'md', borderColor: 'fg.muted' }} transition="all 0.2s" cursor="pointer" asChild>
      <Link href={href}>
        <Card.Body>
          <Stack direction="row" gap={4} align="center">
            <Box color="fg.muted">{icon}</Box>
            <Box>
              <Heading size="md">{title}</Heading>
              <Text color="fg.muted" fontSize="sm">
                {description}
              </Text>
            </Box>
          </Stack>
        </Card.Body>
      </Link>
    </Card.Root>
  )
}
