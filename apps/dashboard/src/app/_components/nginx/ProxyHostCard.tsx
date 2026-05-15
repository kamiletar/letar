'use client'

import { formatDateOnly } from '@/lib/format'
import type { NpmProxyHost } from '@/lib/npm'
import { Badge, Box, Button, Card, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuExternalLink, LuLock, LuTrash2 } from 'react-icons/lu'
import { Switch } from '../ui/switch'

interface ProxyHostCardProps {
  host: NpmProxyHost
  onToggle?: (enabled: boolean) => void
  onDelete?: () => void
  /** Индикатор переходного состояния */
  isTransitioning?: boolean
}

/**
 * Карточка proxy host из Nginx Proxy Manager
 */
export function ProxyHostCard({ host, onToggle, onDelete, isTransitioning = false }: ProxyHostCardProps) {
  // NPM API может возвращать enabled как 0/1 или true/false
  const isEnabled = host.enabled === 1 || host.enabled === true
  const hasSSL = host.certificate_id > 0
  return (
    <Card.Root opacity={isTransitioning ? 0.7 : 1} transition="opacity 0.2s" position="relative">
      {/* Индикатор загрузки поверх карточки */}
      {isTransitioning && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="bg/50"
          borderRadius="lg"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="1"
        >
          <Spinner size="lg" color="blue.500" />
        </Box>
      )}

      <Card.Body gap="4">
        {/* Заголовок с toggle */}
        <HStack justify="space-between">
          <VStack align="start" gap="1">
            <HStack gap="2">
              <Text fontSize="lg" fontWeight="bold" asChild _hover={{ textDecoration: 'underline' }}>
                <a href={`https://${host.domain_names[0]}`} target="_blank" rel="noopener noreferrer">
                  {host.domain_names[0]}
                </a>
              </Text>
              {hasSSL && (
                <Badge colorPalette="green" size="xs" variant="subtle">
                  <LuLock size={10} />
                  SSL
                </Badge>
              )}
            </HStack>
            {host.domain_names.length > 1 && (
              <Text fontSize="xs" color="fg.muted">
                +{host.domain_names.length - 1} more domains
              </Text>
            )}
          </VStack>

          <HStack gap="3">
            <Badge colorPalette={isEnabled ? 'green' : 'gray'} size="sm" variant="solid">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Switch
              checked={isEnabled}
              onCheckedChange={(e) => onToggle?.(e.checked)}
              disabled={isTransitioning}
              size="sm"
            />
          </HStack>
        </HStack>

        {/* Forward target */}
        <Box>
          <Text fontSize="sm" color="fg.muted">
            Forward to
          </Text>
          <HStack gap="1">
            <Text fontSize="sm" fontWeight="medium" fontFamily="mono">
              {host.forward_scheme}://{host.forward_host}:{host.forward_port}
            </Text>
            <LuExternalLink size={12} />
          </HStack>
        </Box>

        {/* Все домены */}
        <Box>
          <Text fontSize="sm" color="fg.muted">
            Domains
          </Text>
          <VStack align="start" gap="0">
            {host.domain_names.map((domain) => (
              <Text key={domain} fontSize="sm" fontWeight="medium" asChild _hover={{ textDecoration: 'underline' }}>
                <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
                  {domain}
                </a>
              </Text>
            ))}
          </VStack>
        </Box>

        {/* Настройки */}
        <HStack gap="4" flexWrap="wrap">
          {host.ssl_forced === true && (
            <Badge colorPalette="blue" size="xs" variant="subtle">
              Force SSL
            </Badge>
          )}
          {host.caching_enabled === true && (
            <Badge colorPalette="purple" size="xs" variant="subtle">
              Caching
            </Badge>
          )}
          {host.block_exploits === true && (
            <Badge colorPalette="orange" size="xs" variant="subtle">
              Block Exploits
            </Badge>
          )}
          {host.http2_support === 1 && (
            <Badge colorPalette="cyan" size="xs" variant="subtle">
              HTTP/2
            </Badge>
          )}
          {host.allow_websocket_upgrade === 1 && (
            <Badge colorPalette="teal" size="xs" variant="subtle">
              WebSocket
            </Badge>
          )}
        </HStack>

        {/* Дата создания и ID */}
        <HStack justify="space-between" fontSize="xs" color="fg.muted">
          <Text>ID: {host.id}</Text>
          <Text>Created: {formatDateOnly(host.created_on)}</Text>
        </HStack>

        {/* Кнопки управления */}
        <HStack gap="2" mt="2">
          {onDelete && (
            <Button size="xs" variant="outline" colorPalette="red" onClick={onDelete} disabled={isTransitioning}>
              <LuTrash2 size={14} />
              Delete
            </Button>
          )}
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
