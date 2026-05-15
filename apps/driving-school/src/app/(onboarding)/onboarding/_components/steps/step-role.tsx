'use client'

/**
 * Шаг 2: Выбор роли пользователя
 */

import { Box, Button, Card, Heading, HStack, SimpleGrid, Steps, Text, VStack } from '@chakra-ui/react'
import { LuBookOpen, LuBuilding2, LuCar } from 'react-icons/lu'
import type { OnboardingRole } from '../../_schemas/onboarding.schema'

interface StepRoleProps {
  role: OnboardingRole | null
  onChange: (role: OnboardingRole) => void
  error?: string
}

export function StepRole({ role, onChange, error }: StepRoleProps) {
  return (
    <Steps.Content index={1}>
      <Card.Root>
        <Card.Header>
          <Heading size="lg">Выберите вашу роль</Heading>
          <Text color="fg.muted">Вы всегда сможете изменить её позже. Используйте ← → для выбора</Text>
        </Card.Header>
        <Card.Body>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <RoleCard
              icon={<LuBookOpen size={32} />}
              title="Ученик"
              description="Записывайтесь на занятия к инструкторам"
              isSelected={role === 'STUDENT'}
              onClick={() => onChange('STUDENT')}
            />
            <RoleCard
              icon={<LuCar size={32} />}
              title="Инструктор"
              description="Ведите расписание и принимайте учеников"
              isSelected={role === 'INSTRUCTOR'}
              onClick={() => onChange('INSTRUCTOR')}
            />
            <RoleCard
              icon={<LuBuilding2 size={32} />}
              title="Автошкола"
              description="Управляйте школой, инструкторами и учениками"
              isSelected={role === 'SCHOOL_ADMIN'}
              onClick={() => onChange('SCHOOL_ADMIN')}
            />
          </SimpleGrid>
          {error && (
            <Text color="error.solid" fontSize="sm" mt={2}>
              {error}
            </Text>
          )}
        </Card.Body>
        <Card.Footer>
          <HStack gap={4}>
            <Steps.PrevTrigger asChild>
              <Button variant="ghost">Назад</Button>
            </Steps.PrevTrigger>
            <Steps.NextTrigger asChild>
              <Button colorPalette="brand" size="lg">
                Продолжить
              </Button>
            </Steps.NextTrigger>
          </HStack>
        </Card.Footer>
      </Card.Root>
    </Steps.Content>
  )
}

// Компонент карточки выбора роли
interface RoleCardProps {
  icon: React.ReactNode
  title: string
  description: string
  isSelected: boolean
  onClick: () => void
}

function RoleCard({ icon, title, description, isSelected, onClick }: RoleCardProps) {
  return (
    <Box
      as="button"
      onClick={onClick}
      p={6}
      borderRadius="xl"
      borderWidth="2px"
      borderColor={isSelected ? 'fg' : 'border'}
      bg={isSelected ? 'fg.muted/10' : 'bg.panel'}
      textAlign="center"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        borderColor: 'fg',
        transform: 'translateY(-2px)',
      }}
    >
      <VStack gap={3}>
        <Box color={isSelected ? 'fg' : 'fg.muted'}>{icon}</Box>
        <Heading size="md">{title}</Heading>
        <Text fontSize="sm" color="fg.muted">
          {description}
        </Text>
      </VStack>
    </Box>
  )
}
