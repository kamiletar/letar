import { Avatar, Badge, Box, Card, Container, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuArrowRight, LuBuilding, LuCheck } from 'react-icons/lu'

import { getSession } from '@/lib/auth'
import { getSchoolsForReviewAction } from '../_actions/review.action'

export const metadata = {
  title: 'Оставить отзыв о школе',
  description: 'Выберите школу для отзыва',
}

export default async function ReviewSchoolsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/my-reviews/school')
  }

  const result = await getSchoolsForReviewAction()

  if (!result.success) {
    return (
      <Container maxW="container.lg" py={8}>
        <Box layerStyle="panel.error" p={6}>
          <Heading size="lg" color="error.fg">
            Ошибка
          </Heading>
          <Text color="error.fg" mt={2}>
            Не удалось загрузить список школ
          </Text>
        </Box>
      </Container>
    )
  }

  const { schools } = result

  if (schools.length === 0) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch">
          <Heading size="xl">Оставить отзыв о школе</Heading>
          <Card.Root>
            <Card.Body>
              <VStack py={8} gap={4}>
                <Box p={4} borderRadius="full" bg="bg.subtle">
                  <LuBuilding size={32} />
                </Box>
                <Text color="fg.muted" textAlign="center">
                  Вы не являетесь учеником ни одной автошколы
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        </VStack>
      </Container>
    )
  }

  // Если только одна школа без отзыва — редирект
  const schoolsWithoutReview = schools.filter((s) => !s.hasReview)
  if (schoolsWithoutReview.length === 1 && schools.length === 1) {
    redirect(`/my-reviews/school/${schoolsWithoutReview[0].id}`)
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="xl">Оставить отзыв о школе</Heading>
          <Text color="fg.muted" mt={2}>
            Выберите школу для отзыва
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {schools.map((school) => (
            <Card.Root
              key={school.id}
              opacity={school.hasReview ? 0.6 : 1}
              _hover={school.hasReview ? {} : { shadow: 'md', borderColor: 'fg.muted' }}
              transition="all 0.2s"
              cursor={school.hasReview ? 'default' : 'pointer'}
              asChild={!school.hasReview}
            >
              {school.hasReview ? (
                <Card.Body>
                  <HStack justify="space-between">
                    <HStack gap={4}>
                      <Avatar.Root size="lg">
                        {school.logo && <Avatar.Image src={school.logo} />}
                        <Avatar.Fallback>{school.name.charAt(0)}</Avatar.Fallback>
                      </Avatar.Root>
                      <Box>
                        <Heading size="md">{school.name}</Heading>
                        <Badge colorPalette="green" mt={1}>
                          <LuCheck /> Отзыв оставлен
                        </Badge>
                      </Box>
                    </HStack>
                  </HStack>
                </Card.Body>
              ) : (
                <Link href={`/my-reviews/school/${school.id}`}>
                  <Card.Body>
                    <HStack justify="space-between">
                      <HStack gap={4}>
                        <Avatar.Root size="lg">
                          {school.logo && <Avatar.Image src={school.logo} />}
                          <Avatar.Fallback>{school.name.charAt(0)}</Avatar.Fallback>
                        </Avatar.Root>
                        <Box>
                          <Heading size="md">{school.name}</Heading>
                          <Text color="fg.muted" fontSize="sm">
                            Оставить отзыв
                          </Text>
                        </Box>
                      </HStack>
                      <Box color="fg.muted">
                        <LuArrowRight size={20} />
                      </Box>
                    </HStack>
                  </Card.Body>
                </Link>
              )}
            </Card.Root>
          ))}
        </SimpleGrid>
      </VStack>
    </Container>
  )
}
