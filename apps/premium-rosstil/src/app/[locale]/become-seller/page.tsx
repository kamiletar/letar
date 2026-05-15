import { getSession } from '@/lib/auth'
import { getPrisma } from '@/lib/db'
import { Box, Button, Container, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import { redirect } from 'next/navigation'
import { FaCheckCircle, FaClock, FaStore, FaTimesCircle } from 'react-icons/fa'
import { ApplicationForm } from './_components/application-form'

export const metadata: Metadata = {
  title: 'Стать продавцом — Премиум РосСтиль',
  description: 'Подайте заявку на размещение ваших товаров на маркетплейсе Премиум РосСтиль',
}

export default async function BecomeSellerPage() {
  const session = await getSession()

  // Неавторизованный — показать промо и кнопку входа
  if (!session?.user) {
    return (
      <Container maxW="2xl" py={16}>
        <VStack gap={6} textAlign="center">
          <Box fontSize="4xl" color="fg.muted">
            <FaStore />
          </Box>
          <Heading size="2xl" textTransform="none">
            Продавайте на Премиум РосСтиль
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            Размещайте свои товары на маркетплейсе дизайнерской одежды. Для подачи заявки необходимо войти в аккаунт.
          </Text>
          <Button asChild colorPalette="fg" size="lg">
            <NextLink href="/auth/signin?callbackUrl=/become-seller">Войти и подать заявку</NextLink>
          </Button>
        </VStack>
      </Container>
    )
  }

  const db = getPrisma()

  // Проверка — уже продавец
  const existingSeller = await db.seller.findUnique({
    where: { userId: session.user.id },
    select: { slug: true, status: true },
  })

  if (existingSeller) {
    // ACTIVE — редирект в панель продавца
    if (existingSeller.status === 'ACTIVE') {
      redirect('/seller')
    }

    // PENDING/SUSPENDED — показать статус
    return (
      <Container maxW="2xl" py={16}>
        <VStack gap={6} textAlign="center">
          <Icon boxSize={16} color="orange.500">
            <FaClock />
          </Icon>
          <Heading size="2xl" textTransform="none">
            Ваш магазин на модерации
          </Heading>
          <Text color="fg.muted">Мы проверяем ваш профиль продавца. Обычно это занимает 1-2 рабочих дня.</Text>
        </VStack>
      </Container>
    )
  }

  // Проверка — есть заявка
  const existingApplication = await db.sellerApplication.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { status: true, reviewNote: true },
  })

  // Заявка на рассмотрении
  if (existingApplication?.status === 'PENDING') {
    return (
      <Container maxW="2xl" py={16}>
        <VStack gap={6} textAlign="center">
          <Icon boxSize={16} color="orange.500">
            <FaClock />
          </Icon>
          <Heading size="2xl" textTransform="none">
            Заявка на рассмотрении
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            Мы получили вашу заявку и рассмотрим её в ближайшее время. Обычно это занимает 1-2 рабочих дня.
          </Text>
        </VStack>
      </Container>
    )
  }

  // Заявка одобрена (но Seller ещё не создан — редкий случай)
  if (existingApplication?.status === 'APPROVED') {
    return (
      <Container maxW="2xl" py={16}>
        <VStack gap={6} textAlign="center">
          <Icon boxSize={16} color="green.500">
            <FaCheckCircle />
          </Icon>
          <Heading size="2xl" textTransform="none">
            Заявка одобрена!
          </Heading>
          <Text color="fg.muted">Ваша заявка одобрена. Панель продавца скоро будет доступна.</Text>
        </VStack>
      </Container>
    )
  }

  // Загрузить контактные данные для предзаполнения
  const userProfile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { phoneNumber: true },
  })

  // Показать отклонение (если было) + форму для повторной подачи
  const wasRejected = existingApplication?.status === 'REJECTED'

  return (
    <Container maxW="2xl" py={16}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={3} textAlign="center">
          <Box fontSize="4xl" color="fg.muted">
            <FaStore />
          </Box>
          <Heading size="2xl" textTransform="none">
            Стать продавцом
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            Заполните заявку и начните продавать на маркетплейсе
          </Text>
        </VStack>

        {/* Уведомление об отклонении */}
        {wasRejected && (
          <Box p={4} borderRadius="lg" bg="red.subtle" borderWidth="1px" borderColor="red.muted">
            <HStack gap={3}>
              <Icon color="red.500">
                <FaTimesCircle />
              </Icon>
              <VStack align="start" gap={1}>
                <Text fontWeight="medium" color="red.fg">
                  Предыдущая заявка отклонена
                </Text>
                {existingApplication.reviewNote && (
                  <Text fontSize="sm" color="red.fg">
                    Причина: {existingApplication.reviewNote}
                  </Text>
                )}
                <Text fontSize="sm" color="red.fg">
                  Вы можете подать заявку повторно.
                </Text>
              </VStack>
            </HStack>
          </Box>
        )}

        {/* Преимущества */}
        <Box p={6} borderRadius="lg" bg="bg.subtle" borderWidth="1px">
          <Heading size="sm" mb={3} textTransform="none">
            Почему Премиум РосСтиль?
          </Heading>
          <VStack align="start" gap={2} fontSize="sm" color="fg.muted">
            <Text>• Аудитория ценителей дизайнерской одежды</Text>
            <Text>• Удобная панель управления товарами и заказами</Text>
            <Text>• Прозрачная комиссия и быстрые выплаты</Text>
            <Text>• Защита покупателей — доверие к площадке</Text>
          </VStack>
        </Box>

        {/* Форма */}
        <ApplicationForm defaultEmail={session.user.email || ''} defaultPhone={userProfile?.phoneNumber} />
      </VStack>
    </Container>
  )
}
