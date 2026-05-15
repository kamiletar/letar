import { unsubscribeFromNewsletter } from '@/app/_actions/newsletter'
import { Container, Heading, Text, VStack } from '@chakra-ui/react'

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>
}

export const metadata = {
  title: 'Отписка от рассылки',
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams

  if (!token) {
    return (
      <Container maxW="lg" py={16}>
        <VStack gap={4} textAlign="center">
          <Heading size="xl">Ошибка</Heading>
          <Text color="fg.muted">Ссылка для отписки недействительна.</Text>
        </VStack>
      </Container>
    )
  }

  const result = await unsubscribeFromNewsletter(token)

  return (
    <Container maxW="lg" py={16}>
      <VStack gap={4} textAlign="center">
        {result.success ? (
          <>
            <Heading size="xl">Вы отписаны</Heading>
            <Text color="fg.muted">Вы больше не будете получать email-рассылку от Премиум РосСтиль.</Text>
          </>
        ) : (
          <>
            <Heading size="xl">Ошибка</Heading>
            <Text color="fg.muted">{result.error || 'Не удалось отписаться.'}</Text>
          </>
        )}
      </VStack>
    </Container>
  )
}
