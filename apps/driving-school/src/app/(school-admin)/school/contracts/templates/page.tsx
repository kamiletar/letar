import { Avatar, Box, Card, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuArrowRight, LuBuilding, LuFileText } from 'react-icons/lu'

import { getSession } from '@/lib/auth'
import { getUserSchools } from '../../stats/_actions/school-stats.action'

export const metadata = {
  title: 'Шаблоны договоров',
  description: 'Управление шаблонами договоров автошкол',
}

interface Props {
  searchParams: Promise<{ schoolId?: string }>
}

export default async function ContractTemplatesPage({ searchParams }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId } = await searchParams

  // Если schoolId уже передан — редиректим на страницу конкретной школы
  if (schoolId) {
    redirect(`/school/contracts/templates/${schoolId}`)
  }

  const result = await getUserSchools()

  if (!result.success) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Ошибка
        </Heading>
        <Text color="error.fg" mt={2}>
          Не удалось загрузить список школ
        </Text>
      </Box>
    )
  }

  const { schools } = result

  if (schools.length === 0) {
    return (
      <VStack gap={6} align="stretch">
        <Heading size="xl">Шаблоны договоров</Heading>
        <Card.Root>
          <Card.Body>
            <VStack py={8} gap={4}>
              <Box p={4} borderRadius="full" bg="bg.subtle">
                <LuBuilding size={32} />
              </Box>
              <Text color="fg.muted" textAlign="center">
                Вы не являетесь администратором ни одной автошколы
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    )
  }

  // Если только одна школа — редирект на её шаблоны
  if (schools.length === 1) {
    redirect(`/school/contracts/templates/${schools[0].id}`)
  }

  return (
    <VStack gap={6} align="stretch">
      <HStack gap={3}>
        <LuFileText size={28} />
        <Heading size="xl">Шаблоны договоров</Heading>
      </HStack>
      <Text color="fg.muted">Выберите автошколу для управления шаблонами</Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {schools.map((school) => (
          <Link key={school.id} href={`/school/contracts/templates/${school.id}`}>
            <Card.Root _hover={{ shadow: 'md', borderColor: 'fg.muted' }} transition="all 0.2s" cursor="pointer">
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
                        Шаблоны договоров
                      </Text>
                    </Box>
                  </HStack>
                  <Box color="fg.muted">
                    <LuArrowRight size={20} />
                  </Box>
                </HStack>
              </Card.Body>
            </Card.Root>
          </Link>
        ))}
      </SimpleGrid>
    </VStack>
  )
}
