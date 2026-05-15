'use client'

/**
 * Шаг 3: Дополнительные данные профиля
 *
 * Содержит формы для каждой роли:
 * - Ученик: город
 * - Инструктор: марка/модель авто, КПП, город
 * - Автошкола: название, город, телефон
 */

import { CityInput } from '@/app/_components/city-input'
import {
  Alert,
  Box,
  Button,
  Card,
  Field,
  Heading,
  HStack,
  Input,
  SegmentGroup,
  SimpleGrid,
  Stack,
  Steps,
  Switch,
  Text,
} from '@chakra-ui/react'
import { LuCheck, LuInfo, LuMapPin } from 'react-icons/lu'
import type { OnboardingFormData } from '../../_lib/onboarding-context'

interface StepProfileProps {
  formData: OnboardingFormData
  onChange: (updates: Partial<OnboardingFormData>) => void
  onComplete: () => void
  onDetectLocation: () => void
  isDetectingLocation: boolean
  isPending: boolean
  errors: Record<string, string>
}

export function StepProfile({
  formData,
  onChange,
  onComplete,
  onDetectLocation,
  isDetectingLocation,
  isPending,
  errors,
}: StepProfileProps) {
  return (
    <Steps.Content index={2}>
      <Card.Root>
        <Card.Header>
          <Heading size="lg">
            {formData.role === 'STUDENT' && 'Расскажите о себе'}
            {formData.role === 'INSTRUCTOR' && 'Информация об автомобиле'}
            {formData.role === 'SCHOOL_ADMIN' && 'Данные автошколы'}
          </Heading>
          <Text color="fg.muted">
            {formData.role === 'STUDENT' && 'Эта информация поможет инструкторам лучше подготовиться'}
            {formData.role === 'INSTRUCTOR' && 'Ученики смогут видеть, на чём вы обучаете'}
            {formData.role === 'SCHOOL_ADMIN' && 'Базовая информация о вашей автошколе'}
          </Text>
        </Card.Header>
        <Card.Body>
          <Stack gap={4}>
            {/* Форма для ученика */}
            {formData.role === 'STUDENT' && (
              <StudentForm
                formData={formData}
                onChange={onChange}
                onDetectLocation={onDetectLocation}
                isDetectingLocation={isDetectingLocation}
              />
            )}

            {/* Форма для инструктора */}
            {formData.role === 'INSTRUCTOR' && (
              <InstructorForm
                formData={formData}
                onChange={onChange}
                onDetectLocation={onDetectLocation}
                isDetectingLocation={isDetectingLocation}
                errors={errors}
              />
            )}

            {/* Форма для школы */}
            {formData.role === 'SCHOOL_ADMIN' && (
              <SchoolForm
                formData={formData}
                onChange={onChange}
                onDetectLocation={onDetectLocation}
                isDetectingLocation={isDetectingLocation}
                errors={errors}
              />
            )}
          </Stack>
        </Card.Body>
        <Card.Footer>
          <HStack gap={4}>
            <Steps.PrevTrigger asChild>
              <Button variant="ghost">Назад</Button>
            </Steps.PrevTrigger>
            <Button colorPalette="brand" size="lg" onClick={onComplete} loading={isPending}>
              <LuCheck />
              Завершить
            </Button>
          </HStack>
        </Card.Footer>
      </Card.Root>
    </Steps.Content>
  )
}

// Форма для ученика
interface StudentFormProps {
  formData: OnboardingFormData
  onChange: (updates: Partial<OnboardingFormData>) => void
  onDetectLocation: () => void
  isDetectingLocation: boolean
}

function StudentForm({ formData, onChange, onDetectLocation, isDetectingLocation }: StudentFormProps) {
  return (
    <Field.Root>
      <Field.Label>Город</Field.Label>
      <HStack>
        <Box flex={1}>
          <CityInput value={formData.city} onChange={(city) => onChange({ city })} placeholder="Введите город" />
        </Box>
        <Button
          variant="outline"
          size="sm"
          onClick={onDetectLocation}
          loading={isDetectingLocation}
          title="Определить автоматически"
        >
          <LuMapPin />
        </Button>
      </HStack>
      <Field.HelperText>Город для поиска инструкторов</Field.HelperText>
    </Field.Root>
  )
}

/**
 * Расчёт стажа в годах на основе даты начала деятельности
 */
function calculateExperienceYears(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  const years = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  return Math.max(0, years)
}

// Форма для инструктора
interface InstructorFormProps {
  formData: OnboardingFormData
  onChange: (updates: Partial<OnboardingFormData>) => void
  onDetectLocation: () => void
  isDetectingLocation: boolean
  errors: Record<string, string>
}

function InstructorForm({ formData, onChange, onDetectLocation, isDetectingLocation, errors }: InstructorFormProps) {
  const experienceHelperText = formData.experienceStartDate
    ? `Стаж ${calculateExperienceYears(formData.experienceStartDate)} лет`
    : 'Стаж будет рассчитан автоматически'

  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
      {/* Левая колонка - личные данные */}
      <Stack gap={4}>
        <Field.Root>
          <Field.Label>Город</Field.Label>
          <HStack>
            <Box flex={1}>
              <CityInput value={formData.city} onChange={(city) => onChange({ city })} placeholder="Введите город" />
            </Box>
            <Button
              variant="outline"
              size="sm"
              onClick={onDetectLocation}
              loading={isDetectingLocation}
              title="Определить автоматически"
            >
              <LuMapPin />
            </Button>
          </HStack>
        </Field.Root>

        <Field.Root>
          <Field.Label>Дата начала деятельности</Field.Label>
          <Input
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={formData.experienceStartDate}
            onChange={(e) => onChange({ experienceStartDate: e.target.value })}
          />
          <Field.HelperText>{experienceHelperText}</Field.HelperText>
        </Field.Root>

        {/* Публичность профиля */}
        <Field.Root>
          <HStack justify="space-between">
            <Box>
              <Field.Label mb={0}>Публичный профиль</Field.Label>
              <Text fontSize="sm" color="fg.muted">
                Ваш профиль будет виден в каталоге
              </Text>
            </Box>
            <Switch.Root checked={formData.isPublic} onCheckedChange={(e) => onChange({ isPublic: !!e.checked })}>
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>
          <Field.HelperText>
            {formData.isPublic ? 'Ученики смогут найти вас в каталоге' : 'Работа только по приглашению или через школу'}
          </Field.HelperText>
        </Field.Root>
      </Stack>

      {/* Правая колонка - данные автомобиля */}
      <Stack gap={4}>
        <Field.Root invalid={!!errors.carBrand} required>
          <Field.Label>Марка автомобиля</Field.Label>
          <Input
            value={formData.carBrand}
            onChange={(e) => onChange({ carBrand: e.target.value })}
            placeholder="Например: Hyundai"
          />
          {errors.carBrand && <Field.ErrorText>{errors.carBrand}</Field.ErrorText>}
        </Field.Root>

        <Field.Root invalid={!!errors.carModel} required>
          <Field.Label>Модель</Field.Label>
          <Input
            value={formData.carModel}
            onChange={(e) => onChange({ carModel: e.target.value })}
            placeholder="Например: Solaris"
          />
          {errors.carModel && <Field.ErrorText>{errors.carModel}</Field.ErrorText>}
        </Field.Root>

        <Field.Root>
          <Field.Label>Тип КПП</Field.Label>
          <SegmentGroup.Root
            value={formData.carTransmission}
            onValueChange={(details) => onChange({ carTransmission: details.value as 'MANUAL' | 'AUTOMATIC' })}
            width="full"
          >
            {/* Без Indicator — стилизация через data-state="checked" */}
            <SegmentGroup.Item value="MANUAL">
              <SegmentGroup.ItemText>Механика</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
            <SegmentGroup.Item value="AUTOMATIC">
              <SegmentGroup.ItemText>Автомат</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          </SegmentGroup.Root>
        </Field.Root>

        {/* Подсказка о дополнительных автомобилях */}
        <Alert.Root status="info" size="sm">
          <Alert.Indicator>
            <LuInfo />
          </Alert.Indicator>
          <Alert.Title>Дополнительные автомобили можно добавить позже в профиле</Alert.Title>
        </Alert.Root>
      </Stack>
    </SimpleGrid>
  )
}

// Форма для автошколы
interface SchoolFormProps {
  formData: OnboardingFormData
  onChange: (updates: Partial<OnboardingFormData>) => void
  onDetectLocation: () => void
  isDetectingLocation: boolean
  errors: Record<string, string>
}

function SchoolForm({ formData, onChange, onDetectLocation, isDetectingLocation, errors }: SchoolFormProps) {
  return (
    <>
      <Field.Root invalid={!!errors.schoolName} required>
        <Field.Label>Название автошколы</Field.Label>
        <Input
          value={formData.schoolName}
          onChange={(e) => onChange({ schoolName: e.target.value })}
          placeholder="Например: Автошкола Профи"
        />
        {errors.schoolName && <Field.ErrorText>{errors.schoolName}</Field.ErrorText>}
      </Field.Root>

      <Field.Root invalid={!!errors.schoolCity} required>
        <Field.Label>Город</Field.Label>
        <HStack>
          <Box flex={1}>
            <CityInput
              value={formData.schoolCity}
              onChange={(city) => onChange({ schoolCity: city })}
              placeholder="Введите город"
            />
          </Box>
          <Button
            variant="outline"
            size="sm"
            onClick={onDetectLocation}
            loading={isDetectingLocation}
            title="Определить автоматически"
          >
            <LuMapPin />
          </Button>
        </HStack>
        {errors.schoolCity && <Field.ErrorText>{errors.schoolCity}</Field.ErrorText>}
      </Field.Root>

      <Field.Root>
        <Field.Label>Телефон (опционально)</Field.Label>
        <Input
          value={formData.schoolPhone}
          onChange={(e) => onChange({ schoolPhone: e.target.value })}
          placeholder="+7 (999) 123-45-67"
          type="tel"
        />
      </Field.Root>
    </>
  )
}
