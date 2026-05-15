'use client'

import { formatDateOnly } from '@/lib/format'
import type { NpmAccessList } from '@/lib/npm'
import { Badge, Box, Button, Card, HStack, Text, VStack } from '@chakra-ui/react'
import { LuShieldCheck, LuTrash2, LuUsers } from 'react-icons/lu'

interface AccessListCardProps {
  accessList: NpmAccessList
  onDelete?: () => void
}

/**
 * Карточка Access List из Nginx Proxy Manager
 */
export function AccessListCard({ accessList, onDelete }: AccessListCardProps) {
  const authCount = accessList.items?.length || 0
  const clientCount = accessList.clients?.length || 0
  const proxyHostCount = accessList.proxy_host_count || 0

  return (
    <Card.Root>
      <Card.Body gap="4">
        {/* Заголовок */}
        <HStack justify="space-between">
          <VStack align="start" gap="1">
            <HStack gap="2">
              <LuShieldCheck size={18} />
              <Text fontSize="lg" fontWeight="bold">
                {accessList.name}
              </Text>
            </HStack>
          </VStack>

          {proxyHostCount > 0 && (
            <Badge colorPalette="blue" size="sm" variant="subtle">
              {proxyHostCount} proxy host{proxyHostCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </HStack>

        {/* Статистика */}
        <HStack gap="6" fontSize="sm">
          <VStack align="start" gap="0">
            <HStack gap="1" color="fg.muted">
              <LuUsers size={14} />
              <Text>Auth Users</Text>
            </HStack>
            <Text fontWeight="medium">{authCount}</Text>
          </VStack>

          <VStack align="start" gap="0">
            <Text color="fg.muted">IP Rules</Text>
            <Text fontWeight="medium">{clientCount}</Text>
          </VStack>
        </HStack>

        {/* Настройки */}
        <HStack gap="2" flexWrap="wrap">
          <Badge colorPalette={accessList.satisfy_any === 1 ? 'yellow' : 'blue'} size="xs" variant="subtle">
            {accessList.satisfy_any === 1 ? 'Satisfy Any' : 'Satisfy All'}
          </Badge>
          {accessList.pass_auth === 1 && (
            <Badge colorPalette="green" size="xs" variant="subtle">
              Pass Auth
            </Badge>
          )}
        </HStack>

        {/* IP правила (первые 3) */}
        {clientCount > 0 && (
          <Box>
            <Text fontSize="sm" color="fg.muted" mb="1">
              IP Rules
            </Text>
            <VStack align="start" gap="1">
              {accessList.clients.slice(0, 3).map((client) => (
                <HStack key={client.address} fontSize="xs" fontFamily="mono">
                  <Badge colorPalette={client.directive === 'allow' ? 'green' : 'red'} size="xs" variant="subtle">
                    {client.directive}
                  </Badge>
                  <Text>{client.address}</Text>
                </HStack>
              ))}
              {clientCount > 3 && (
                <Text fontSize="xs" color="fg.muted">
                  +{clientCount - 3} more rules
                </Text>
              )}
            </VStack>
          </Box>
        )}

        {/* Дата и ID */}
        <HStack justify="space-between" fontSize="xs" color="fg.muted">
          <Text>ID: {accessList.id}</Text>
          <Text>Created: {formatDateOnly(accessList.created_on)}</Text>
        </HStack>

        {/* Кнопки управления */}
        {onDelete && (
          <HStack gap="2" mt="2">
            <Button size="xs" variant="outline" colorPalette="red" onClick={onDelete} disabled={proxyHostCount > 0}>
              <LuTrash2 size={14} />
              Delete
            </Button>
            {proxyHostCount > 0 && (
              <Text fontSize="xs" color="fg.muted">
                Cannot delete: in use by proxy hosts
              </Text>
            )}
          </HStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}
