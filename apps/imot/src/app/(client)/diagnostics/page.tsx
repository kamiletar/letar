import { IntegrationReport } from '@/app/_components'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { ClientProfiles } from '@/lib/utils/integration-analysis'
import { analyzeIntegration } from '@/lib/utils/integration-analysis'
import { Box, Container, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { LuActivity, LuBrain, LuHeart, LuSparkles, LuUser } from 'react-icons/lu'
import {
  BodyProfileCard,
  EnergyProfileCard,
  NeuroPsychProfileCard,
  NumerologyProfileCard,
  ProfileCompletionDashboard,
  StyleProfileCard,
} from './_components'
import {
  getBodyStatus,
  getEnergyStatus,
  getNeuroPsychStatus,
  getNumerologyStatus,
  getStyleStatus,
} from './_lib/get-profile-status'

/**
 * Страница "Моя диагностика" для клиентов
 * Отображает 5 профилей ИМОТ в read-only режиме с визуализацией
 */
export default async function DiagnosticsPage() {
  const session = await getSession()

  // Проверка аутентификации
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Проверка роли - только CLIENT
  if (session.user.role !== 'CLIENT') {
    redirect('/dashboard')
  }

  // Получение enhanced Prisma client
  const db = getEnhancedPrisma(session.user)

  // Получение данных клиента с профилями
  const client = await db.client.findUnique({
    where: { userId: session.user.id },
    include: {
      numerologyProfile: true,
      neuroPsychProfile: true,
      energyProfile: true,
      bodyProfile: true,
      styleProfile: true,
    },
  })

  // Если клиент не найден (не должно происходить, но на всякий случай)
  if (!client) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack gap={4}>
          <Heading size="2xl" textTransform="none">
            Моя диагностика
          </Heading>
          <Text color="fg.muted">Ваш профиль клиента еще не создан. Пожалуйста, обратитесь к вашему специалисту.</Text>
        </VStack>
      </Container>
    )
  }

  // Проверка, есть ли хотя бы один заполненный профиль
  const hasAnyProfile =
    client.numerologyProfile ||
    client.neuroPsychProfile ||
    client.energyProfile ||
    client.bodyProfile ||
    client.styleProfile

  // Получаем статусы всех профилей
  const profileStatuses = {
    numerology: getNumerologyStatus(client.numerologyProfile),
    neuroPsych: getNeuroPsychStatus(client.neuroPsychProfile),
    energy: getEnergyStatus(client.energyProfile),
    body: getBodyStatus(client.bodyProfile),
    style: getStyleStatus(client.styleProfile),
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <Box>
          <Heading size="2xl" textTransform="none" mb={2}>
            Моя диагностика
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            5 уровней интегративной диагностики ИМОТ
          </Text>
        </Box>

        {/* Dashboard прогресса */}
        <ProfileCompletionDashboard profiles={profileStatuses} />

        {/* Если нет заполненных профилей */}
        {!hasAnyProfile && (
          <Box p={8} borderWidth="1px" borderRadius="lg" borderColor="border" textAlign="center">
            <LuSparkles size={48} style={{ margin: '0 auto 16px' }} />
            <Text fontSize="lg" fontWeight="medium" mb={2}>
              Диагностика еще не проведена
            </Text>
            <Text color="fg.muted">
              Ваш специалист заполнит профили после диагностических сессий. Здесь будут отображаться результаты по всем
              5 уровням ИМОТ.
            </Text>
          </Box>
        )}

        {/* Профили */}
        {hasAnyProfile && (
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
            {/* 1. Нумерология */}
            <NumerologyProfileCard profile={client.numerologyProfile} />

            {/* 2. Нейропсихология */}
            <NeuroPsychProfileCard profile={client.neuroPsychProfile} />

            {/* 3. Энергетика */}
            <EnergyProfileCard profile={client.energyProfile} />

            {/* 4. Тело */}
            <BodyProfileCard profile={client.bodyProfile} />

            {/* 5. Стиль */}
            <StyleProfileCard profile={client.styleProfile} />
          </SimpleGrid>
        )}

        {/* Анализ интеграции */}
        {hasAnyProfile && (
          <>
            {(() => {
              // Подсчитываем количество заполненных профилей
              const profilesCount = [
                client.numerologyProfile,
                client.neuroPsychProfile,
                client.energyProfile,
                client.bodyProfile,
                client.styleProfile,
              ].filter((p) => p !== null).length

              // Если меньше 2 профилей, не показываем анализ
              if (profilesCount < 2) {
                return null
              }

              // Преобразуем профили в формат для анализа
              const clientProfiles: ClientProfiles = {
                numerology: client.numerologyProfile
                  ? {
                      personalityNumber: client.numerologyProfile.personalityNumber,
                      destinyNumber: client.numerologyProfile.destinyNumber,
                      soulNumber: client.numerologyProfile.soulNumber,
                      talents: client.numerologyProfile.talents,
                      karmicLessons: client.numerologyProfile.karmicLessons,
                    }
                  : null,
                neuroPsych: client.neuroPsychProfile
                  ? {
                      behaviorPatterns: client.neuroPsychProfile.behaviorPatterns,
                      cognitiveStyle: client.neuroPsychProfile.cognitiveStyle,
                      defenseMechanisms: client.neuroPsychProfile.defenseMechanisms,
                      emotionalPatterns: client.neuroPsychProfile.emotionalPatterns,
                    }
                  : null,
                energy: client.energyProfile
                  ? {
                      rootChakra: client.energyProfile.rootChakra,
                      sacralChakra: client.energyProfile.sacralChakra,
                      solarPlexusChakra: client.energyProfile.solarPlexusChakra,
                      heartChakra: client.energyProfile.heartChakra,
                      throatChakra: client.energyProfile.throatChakra,
                      thirdEyeChakra: client.energyProfile.thirdEyeChakra,
                      crownChakra: client.energyProfile.crownChakra,
                      moneyChannelLevel: client.energyProfile.moneyChannelLevel,
                      relationshipEnergy: client.energyProfile.relationshipEnergy,
                    }
                  : null,
                body: client.bodyProfile
                  ? {
                      tensionMap: client.bodyProfile.tensionMap,
                      psychosomaticIssues: client.bodyProfile.psychosomaticIssues,
                      breathingPatterns: client.bodyProfile.breathingPatterns,
                    }
                  : null,
                style: client.styleProfile
                  ? {
                      colorType: client.styleProfile.colorType,
                      primaryArchetype: client.styleProfile.primaryArchetype,
                      secondaryArchetype: client.styleProfile.secondaryArchetype,
                      authenticityLevel: client.styleProfile.authenticityLevel,
                    }
                  : null,
              }

              // Проводим анализ интеграции
              const analysis = analyzeIntegration(clientProfiles)

              return (
                <Box mt={8}>
                  <IntegrationReport analysis={analysis} />
                </Box>
              )
            })()}
          </>
        )}

        {/* Легенда уровней */}
        <Box mt={8} p={6} borderWidth="1px" borderRadius="lg">
          <Text fontSize="lg" fontWeight="medium" mb={4}>
            О методике ИМОТ
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Box display="flex" gap={3} alignItems="start">
              <Box color="#FF6B6B" flexShrink={0}>
                <LuSparkles size={24} />
              </Box>
              <Box>
                <Text fontWeight="medium">Нумерология</Text>
                <Text fontSize="sm" color="fg.muted">
                  Матрица судьбы, таланты, предназначение
                </Text>
              </Box>
            </Box>

            <Box display="flex" gap={3} alignItems="start">
              <Box color="#4ECDC4" flexShrink={0}>
                <LuBrain size={24} />
              </Box>
              <Box>
                <Text fontWeight="medium">Нейропсихология</Text>
                <Text fontSize="sm" color="fg.muted">
                  Паттерны поведения, когнитивные особенности
                </Text>
              </Box>
            </Box>

            <Box display="flex" gap={3} alignItems="start">
              <Box color="#FFE66D" flexShrink={0}>
                <LuActivity size={24} />
              </Box>
              <Box>
                <Text fontWeight="medium">Энергетика</Text>
                <Text fontSize="sm" color="fg.muted">
                  7 чакр, энергетические блоки, денежный канал
                </Text>
              </Box>
            </Box>

            <Box display="flex" gap={3} alignItems="start">
              <Box color="#95E1D3" flexShrink={0}>
                <LuHeart size={24} />
              </Box>
              <Box>
                <Text fontWeight="medium">Тело</Text>
                <Text fontSize="sm" color="fg.muted">
                  Карта зажимов, психосоматика, связь тело-психика
                </Text>
              </Box>
            </Box>

            <Box display="flex" gap={3} alignItems="start">
              <Box color="#F38181" flexShrink={0}>
                <LuUser size={24} />
              </Box>
              <Box>
                <Text fontWeight="medium">Стиль</Text>
                <Text fontSize="sm" color="fg.muted">
                  Цветотип, архетип, самовыражение
                </Text>
              </Box>
            </Box>
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  )
}
