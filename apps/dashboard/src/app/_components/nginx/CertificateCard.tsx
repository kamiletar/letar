'use client'

import { formatDateOnly } from '@/lib/format'
import type { NpmCertificate } from '@/lib/nginx-proxy-manager'
import { Badge, Box, Button, Card, HStack, Text, VStack } from '@chakra-ui/react'
import { LuShield, LuTrash2 } from 'react-icons/lu'

interface CertificateCardProps {
  certificate: NpmCertificate
  onDelete?: () => void
}

/**
 * Карточка SSL сертификата из Nginx Proxy Manager
 */
export function CertificateCard({ certificate, onDelete }: CertificateCardProps) {
  const domains = certificate.domain_names.join(', ')

  // Проверка срока действия
  const expiresDate = new Date(certificate.expires_on)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const isExpired = daysUntilExpiry < 0
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry >= 0

  // Цвет бейджа срока действия
  const getExpiryColor = () => {
    if (isExpired) {
      return 'red'
    }
    if (isExpiringSoon) {
      return 'yellow'
    }
    return 'green'
  }

  // Текст срока действия
  const getExpiryText = () => {
    if (isExpired) {
      return `Expired ${Math.abs(daysUntilExpiry)} days ago`
    }
    if (daysUntilExpiry === 0) {
      return 'Expires today'
    }
    if (daysUntilExpiry === 1) {
      return 'Expires tomorrow'
    }
    return `Expires in ${daysUntilExpiry} days`
  }

  return (
    <Card.Root>
      <Card.Body gap="4">
        {/* Заголовок */}
        <HStack justify="space-between">
          <VStack align="start" gap="1">
            <HStack gap="2">
              <LuShield size={18} />
              <Text fontSize="lg" fontWeight="bold">
                {certificate.nice_name || certificate.domain_names[0]}
              </Text>
            </HStack>
          </VStack>

          <HStack gap="2">
            <Badge colorPalette={certificate.provider === 'letsencrypt' ? 'green' : 'blue'} size="sm" variant="subtle">
              {certificate.provider === 'letsencrypt' ? "Let's Encrypt" : 'Custom'}
            </Badge>
            <Badge colorPalette={getExpiryColor()} size="sm" variant="solid">
              {getExpiryText()}
            </Badge>
          </HStack>
        </HStack>

        {/* Домены */}
        <Box>
          <Text fontSize="sm" color="fg.muted">
            Domains
          </Text>
          <Text fontSize="sm" fontWeight="medium">
            {domains}
          </Text>
        </Box>

        {/* Даты */}
        <HStack gap="6" fontSize="sm">
          <VStack align="start" gap="0">
            <Text color="fg.muted">Created</Text>
            <Text fontWeight="medium">{formatDateOnly(certificate.created_on)}</Text>
          </VStack>

          <VStack align="start" gap="0">
            <Text color="fg.muted">Expires</Text>
            <Text fontWeight="medium" color={isExpired ? 'red.500' : isExpiringSoon ? 'yellow.500' : undefined}>
              {formatDateOnly(certificate.expires_on)}
            </Text>
          </VStack>
        </HStack>

        {/* ID */}
        <Text fontSize="xs" color="fg.muted">
          ID: {certificate.id}
        </Text>

        {/* Кнопки управления */}
        {onDelete && (
          <HStack gap="2" mt="2">
            <Button size="xs" variant="outline" colorPalette="red" onClick={onDelete}>
              <LuTrash2 size={14} />
              Delete
            </Button>
          </HStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}
