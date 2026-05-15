'use client'

import { verifyStudentLicense } from '@/app/(instructor)/students/_actions/license.action'
import { toaster } from '@/app/_components/ui/toaster'
import { Alert, Badge, Box, Button, Card, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LuCheck, LuCreditCard, LuInfo, LuShieldCheck, LuTriangleAlert } from 'react-icons/lu'
import type { StudentLicenseInfo } from '../_actions/balance.action'

interface LicenseVerificationProps {
  licenses: StudentLicenseInfo[]
}

// Форматирование даты
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

// Проверка истечения срока (30 дней)
function isExpiringSoon(expiresAt: Date): boolean {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  return new Date(expiresAt) <= thirtyDaysFromNow && new Date(expiresAt) > new Date()
}

// Проверка истечения
function isExpired(expiresAt: Date): boolean {
  return new Date(expiresAt) < new Date()
}

// Карточка одних прав
function LicenseCard({ license }: { license: StudentLicenseInfo }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const expired = isExpired(license.expiresAt)
  const expiringSoon = isExpiringSoon(license.expiresAt)

  const handleVerify = () => {
    startTransition(async () => {
      const result = await verifyStudentLicense(license.id)
      if (result.success) {
        toaster.success({ title: 'Права подтверждены' })
        router.refresh()
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="bg.panel">
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Icon size="md" color="fg.muted">
              <LuCreditCard />
            </Icon>
            <Text fontWeight="semibold" fontSize="lg">
              Категория {license.category}
            </Text>
            {license.transmissionRestriction === 'AUTOMATIC' && (
              <Badge colorPalette="purple" variant="subtle" size="sm">
                Только АКПП
              </Badge>
            )}
          </HStack>
          <Badge colorPalette={expired ? 'red' : license.isVerified ? 'green' : 'orange'} variant="subtle">
            {expired ? 'Истёк' : license.isVerified ? 'Подтверждено' : 'Ожидает проверки'}
          </Badge>
        </HStack>

        <HStack gap={4} fontSize="sm" color="fg.muted" flexWrap="wrap">
          <Text>
            Получено:{' '}
            <Text as="span" fontWeight="medium" color="fg">
              {formatDate(license.obtainedAt)}
            </Text>
          </Text>
          <Text>
            Действует до:{' '}
            <Text as="span" fontWeight="medium" color={expired ? 'error.fg' : expiringSoon ? 'warning.fg' : 'fg'}>
              {formatDate(license.expiresAt)}
            </Text>
          </Text>
        </HStack>

        {expiringSoon && !expired && (
          <Alert.Root status="warning">
            <Alert.Indicator>
              <LuTriangleAlert />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Description>Срок действия истекает менее чем через 30 дней</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {expired && (
          <Alert.Root status="error">
            <Alert.Indicator>
              <LuTriangleAlert />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Description>Права просрочены</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {license.isVerified && license.verifiedAt && (
          <HStack gap={2} fontSize="sm" color="success.fg">
            <Icon size="sm">
              <LuCheck />
            </Icon>
            <Text>Подтверждено {formatDate(license.verifiedAt)}</Text>
          </HStack>
        )}

        {!license.isVerified && !expired && (
          <Button colorPalette="green" size="sm" onClick={handleVerify} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner size="xs" mr={2} />
                Подтверждение...
              </>
            ) : (
              <>
                <LuShieldCheck />
                Подтвердить права
              </>
            )}
          </Button>
        )}
      </VStack>
    </Box>
  )
}

export function LicenseVerification({ licenses }: LicenseVerificationProps) {
  if (licenses.length === 0) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack gap={4}>
            <Icon size="xl" color="fg.muted">
              <LuCreditCard />
            </Icon>
            <Text color="fg.muted" textAlign="center">
              Ученик не указал водительские права
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <VStack align="stretch" gap={4}>
      <Alert.Root status="info">
        <Alert.Indicator>
          <LuInfo />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Description>
            Обязательно проверьте наличие прав и их подлинность перед первым занятием с учеником
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>

      {licenses.map((license) => (
        <LicenseCard key={license.id} license={license} />
      ))}
    </VStack>
  )
}
