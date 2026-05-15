import { Box, Container, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { getTranslations } from 'next-intl/server'

interface SecurityItemProps {
  label: string
  value: string
  detail?: string
}

/**
 * Строка в таблице безопасности
 */
function SecurityItem({ label, value, detail }: SecurityItemProps) {
  return (
    <HStack justify="space-between" py={3} borderBottom="1px solid" borderColor="border.muted" flexWrap="wrap" gap={2}>
      <Text color="fg.muted" fontSize="sm">
        {label}
      </Text>
      <VStack align="end" gap={0}>
        <Text fontWeight="semibold" fontFamily="mono" fontSize="sm">
          {value}
        </Text>
        {detail && (
          <Text fontSize="xs" color="fg.subtle">
            {detail}
          </Text>
        )}
      </VStack>
    </HStack>
  )
}

/**
 * Секция глубокого погружения в безопасность
 */
export async function SecurityDeepDive() {
  const t = await getTranslations('security')

  return (
    <Box id="security" py={24} bg="bg.subtle">
      <Container maxW="6xl">
        <VStack gap={16}>
          {/* Заголовок */}
          <VStack gap={4} textAlign="center" maxW="2xl">
            <Heading as="h2" size="3xl" fontWeight="bold">
              {t('title')}
            </Heading>
            <Text fontSize="lg" color="fg.muted">
              {t('subtitle')}
            </Text>
          </VStack>

          <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={8} w="full">
            {/* Криптография */}
            <Box p={8} borderRadius="xl" bg="bg.surface" border="1px solid" borderColor="border">
              <Heading as="h3" size="lg" mb={6} color="brand.fg">
                {t('crypto.title')}
              </Heading>
              <VStack align="stretch" gap={0}>
                <SecurityItem
                  label={t('crypto.keyAgreementLabel')}
                  value="X25519 + ML-KEM-768"
                  detail={t('crypto.keyAgreementDetail')}
                />
                <SecurityItem
                  label={t('crypto.signaturesLabel')}
                  value="ML-DSA-65"
                  detail={t('crypto.signaturesDetail')}
                />
                <SecurityItem
                  label={t('crypto.encryptionLabel')}
                  value="ChaCha20-Poly1305"
                  detail={t('crypto.encryptionDetail')}
                />
                <SecurityItem label={t('crypto.hashingLabel')} value="BLAKE3" detail={t('crypto.hashingDetail')} />
                <SecurityItem label={t('crypto.kdfLabel')} value="Argon2id" detail={t('crypto.kdfDetail')} />
                <SecurityItem label={t('crypto.fsLabel')} value="Triple Ratchet + SPQR" detail={t('crypto.fsDetail')} />
              </VStack>
            </Box>

            {/* Защита */}
            <Box p={8} borderRadius="xl" bg="bg.surface" border="1px solid" borderColor="border">
              <Heading as="h3" size="lg" mb={6} color="accent.fg">
                {t('protection.title')}
              </Heading>
              <VStack align="stretch" gap={0}>
                <SecurityItem
                  label={t('protection.dpiLabel')}
                  value={t('protection.dpiValue')}
                  detail={t('protection.dpiDetail')}
                />
                <SecurityItem
                  label={t('protection.metadataLabel')}
                  value={t('protection.metadataValue')}
                  detail={t('protection.metadataDetail')}
                />
                <SecurityItem
                  label={t('protection.deniabilityLabel')}
                  value={t('protection.deniabilityValue')}
                  detail={t('protection.deniabilityDetail')}
                />
                <SecurityItem
                  label={t('protection.antispamLabel')}
                  value={t('protection.antispamValue')}
                  detail={t('protection.antispamDetail')}
                />
                <SecurityItem
                  label={t('protection.paddingLabel')}
                  value={t('protection.paddingValue')}
                  detail={t('protection.paddingDetail')}
                />
                <SecurityItem
                  label={t('protection.recoveryLabel')}
                  value={t('protection.recoveryValue')}
                  detail={t('protection.recoveryDetail')}
                />
              </VStack>
            </Box>
          </Grid>

          {/* Отличие от конкурентов */}
          <Box p={8} borderRadius="xl" bg="bg.surface" border="1px solid" borderColor="brand.border" w="full">
            <Heading as="h3" size="lg" mb={6}>
              {t('vsTitle')}
            </Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
              <VStack align="start" gap={2}>
                <Text fontWeight="semibold" color="brand.fg">
                  vs Signal
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {t('vsSignal')}
                </Text>
              </VStack>
              <VStack align="start" gap={2}>
                <Text fontWeight="semibold" color="brand.fg">
                  vs Session
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {t('vsSession')}
                </Text>
              </VStack>
              <VStack align="start" gap={2}>
                <Text fontWeight="semibold" color="brand.fg">
                  vs SimpleX
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {t('vsSimpleX')}
                </Text>
              </VStack>
            </Grid>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
