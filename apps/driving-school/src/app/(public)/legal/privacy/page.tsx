import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { legalService } from '@/lib/legal'
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { LegalDocumentContent } from '../_components/legal-document-content'

export const metadata = {
  title: 'Политика конфиденциальности | НаПрава.РФ',
  description: 'Политика обработки персональных данных платформы для автошкол',
}

export default async function PrivacyPolicyPage() {
  const document = await legalService.getDocumentBySlug('privacy-policy')

  return (
    <Container maxW="container.md" py={8} position="relative">
      {/* Кнопка переключения темы */}
      <Box position="absolute" top={4} right={4}>
        <ColorModeButton />
      </Box>

      <Stack gap={6}>
        {/* Заголовок */}
        <Box textAlign="center">
          <Heading size="2xl" mb={2}>
            Политика конфиденциальности
          </Heading>
          {document?.currentVersion && (
            <Text fontSize="sm" color="fg.muted">
              Версия {document.currentVersion.version} от{' '}
              {new Date(document.currentVersion.effectiveAt).toLocaleDateString('ru-RU')}
            </Text>
          )}
        </Box>

        {/* Контент документа */}
        {document?.currentVersion ? (
          <LegalDocumentContent content={document.currentVersion.content} />
        ) : (
          <Box p={8} bg="bg.subtle" borderRadius="lg" textAlign="center">
            <Text color="fg.muted" mb={4}>
              Политика конфиденциальности находится в разработке.
            </Text>
            <Text color="fg.muted" fontSize="sm">
              Пожалуйста, вернитесь позже или свяжитесь с нами для получения информации.
            </Text>
          </Box>
        )}

        {/* Ссылки на другие документы */}
        <Box pt={6} borderTopWidth="1px" borderColor="border.muted">
          <Text fontSize="sm" color="fg.muted">
            Также ознакомьтесь с{' '}
            <Link href="/legal/offer" style={{ textDecoration: 'underline' }}>
              Договором-офертой
            </Link>
          </Text>
        </Box>
      </Stack>
    </Container>
  )
}
