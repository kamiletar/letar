import { signInWithProviderAction } from '@/app/_actions/auth.actions'
import { AuthButton } from '@/app/_components/auth-button'
import { ImotLogo } from '@/app/_components/imot-logo'
import { RoleCard } from '@/app/_components/role-card'
import { Box, Container, HStack, Separator, Stack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { FaYandex } from 'react-icons/fa'
import { RiGoogleFill, RiStarLine, RiUserLine } from 'react-icons/ri'
import { RegisterForm } from './_components/register-form'

export default function SignUpPage() {
  return (
    <Container maxW="2xl" py={12}>
      <VStack gap={8} align="stretch">
        {/* Логотип IMOT */}
        <Box display="flex" justifyContent="center" mb={4}>
          <ImotLogo size="lg" animated />
        </Box>

        {/* Заголовок */}
        <VStack gap={2} textAlign="center">
          <Text
            fontSize="3xl"
            fontWeight="bold"
            bgGradient="to-r"
            gradientFrom="purple.500"
            gradientTo="purple.700"
            bgClip="text"
          >
            Регистрация
          </Text>
          <Text color="fg.muted" fontSize="md">
            Начните свой путь осознанной трансформации
          </Text>
        </VStack>

        {/* Информация о ролях */}
        <Stack direction={{ base: 'column', md: 'row' }} gap={4}>
          <RoleCard
            icon={<RiUserLine />}
            title="Клиент"
            badge="По умолчанию"
            badgeColor="blue"
            description="Доступ к персональной диагностике, плану трансформации, практикам и отслеживанию прогресса"
            features={[
              'Просмотр диагностики по 5 уровням',
              'Индивидуальный план трансформации',
              'Практики и упражнения',
              'Отслеживание прогресса',
            ]}
            highlighted
          />

          <RoleCard
            icon={<RiStarLine />}
            title="Специалист"
            badge="По запросу"
            badgeColor="purple"
            description="Работа с клиентами, ведение сессий, создание планов трансформации и аналитика"
            features={['Управление клиентами', 'Ведение сессий', 'Создание планов трансформации', 'Аналитика и отчеты']}
          />
        </Stack>

        {/* Форма регистрации */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <Stack gap={6}>
            {/* Форма регистрации по email/паролю */}
            <RegisterForm />

            {/* Разделитель */}
            <HStack gap={4}>
              <Separator flex="1" />
              <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">
                Или зарегистрируйтесь через
              </Text>
              <Separator flex="1" />
            </HStack>

            {/* OAuth провайдеры */}
            <Stack gap={3}>
              {/* Google */}
              <form action={signInWithProviderAction.bind(null, 'google')}>
                <AuthButton provider="google" icon={<RiGoogleFill />} type="submit">
                  Продолжить с Google
                </AuthButton>
              </form>

              {/* Yandex */}
              <form action={signInWithProviderAction.bind(null, 'yandex')}>
                <AuthButton provider="yandex" icon={<FaYandex />} type="submit">
                  Продолжить с Яндекс
                </AuthButton>
              </form>

              {/* Telegram — TODO: адаптировать для Better Auth */}
              {/*
              <form action={signInWithProviderAction.bind(null, 'telegram')}>
                <AuthButton provider="telegram" icon={<RiTelegramFill />} type="submit">
                  Продолжить с Telegram
                </AuthButton>
              </form>
              */}
            </Stack>
          </Stack>
        </Box>

        {/* Информация о специалистах */}
        <Box p={6} bg="purple.50" borderRadius="lg" borderWidth="1px" borderColor="purple.200">
          <VStack gap={3} align="start">
            <Text fontWeight="semibold" color="purple.900">
              Хотите стать специалистом ИМОТ?
            </Text>
            <Text fontSize="sm" color="purple.800">
              После регистрации свяжитесь с администратором для получения доступа к функционалу специалиста. Для этого
              необходимо пройти обучение методике ИМОТ.
            </Text>
          </VStack>
        </Box>

        {/* Описание методики */}
        <Box p={6} bg="bg.subtle" borderRadius="lg" borderWidth="1px" borderColor="border">
          <VStack gap={3} align="start">
            <Text fontWeight="semibold" color="fg">
              О методике ИМОТ:
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Авторская терапевтическая коучинговая методология Елены Рос для комплексной трансформации личности. Работа
              ведется одновременно на 5 уровнях: нумерология, нейропсихология, энергетика, тело и стиль.
            </Text>
          </VStack>
        </Box>

        {/* Ссылка на вход */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Уже есть аккаунт?{' '}
          <Link href="/sign-in">
            <Text as="span" color="purple.600" fontWeight="medium" textDecoration="underline">
              Войти
            </Text>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
