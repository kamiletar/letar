'use client'

import { Box, Circle, Text, VStack } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { LuCircleHelp } from 'react-icons/lu'

interface FieldTooltipProps {
  /** Заголовок подсказки */
  title?: string
  /** Основной текст подсказки */
  description: string
  /** Пример хорошего заполнения */
  example?: string
  /** Влияние на поиск/конверсию */
  impact?: string
}

/**
 * Компонент подсказки для полей формы онбординга.
 * Показывает иконку "?" с всплывающей подсказкой при наведении.
 */
export function FieldTooltip({ title, description, example, impact }: FieldTooltipProps) {
  return (
    <Tooltip
      showArrow
      positioning={{ placement: 'top' }}
      openDelay={200}
      content={
        <VStack align="start" gap={2} maxW="280px" p={1}>
          {title && (
            <Text fontWeight="semibold" fontSize="sm">
              {title}
            </Text>
          )}
          <Text fontSize="sm">{description}</Text>
          {example && (
            <Box bg="bg.emphasized" px={2} py={1} borderRadius="md" w="full">
              <Text fontSize="xs" color="fg.muted">
                Пример:
              </Text>
              <Text fontSize="sm" fontStyle="italic">
                &quot;{example}&quot;
              </Text>
            </Box>
          )}
          {impact && (
            <Text fontSize="xs" color="green.fg">
              {impact}
            </Text>
          )}
        </VStack>
      }
    >
      <Circle
        size="5"
        cursor="help"
        color="fg.muted"
        _hover={{ color: 'brand.fg' }}
        transition="color 0.2s"
        display="inline-flex"
      >
        <LuCircleHelp size={16} />
      </Circle>
    </Tooltip>
  )
}

// Константы с текстами подсказок для переиспользования
export const ONBOARDING_TOOLTIPS = {
  // Шаг 2: Основная информация
  experienceStartDate: {
    description: 'Укажите дату, когда вы начали работать инструктором по вождению.',
    impact: 'Инструкторы с большим стажем чаще выбираются учениками',
  },
  licenseCategories: {
    description: 'Отметьте все категории прав, по которым вы можете проводить обучение.',
    example: 'B, B1, A (если есть мотоцикл)',
    impact: 'Больше категорий = больше потенциальных учеников',
  },
  bio: {
    title: 'О себе',
    description: 'Расскажите о своём подходе к обучению, особенностях работы, достижениях.',
    example:
      'Спокойный и терпеливый подход. Обучил более 200 учеников. Специализируюсь на преодолении страха вождения.',
    impact: 'Профили с описанием получают на 35% больше заявок',
  },

  // Шаг 3: Автомобиль
  carBrand: {
    description: 'Укажите марку вашего учебного автомобиля.',
    example: 'Hyundai, Kia, Volkswagen',
    impact: 'Ученики часто ищут инструктора по марке авто',
  },
  carModel: {
    description: 'Укажите модель автомобиля.',
    example: 'Solaris, Rio, Polo',
  },
  transmission: {
    description: 'Тип коробки передач влияет на категорию прав, которую получит ученик.',
    impact: 'На механике сдают реже — это отображается в фильтрах поиска',
  },
  carYear: {
    description: 'Год выпуска автомобиля.',
    impact: 'Современные авто привлекают больше учеников',
  },
  carColor: {
    description: 'Цвет автомобиля помогает ученику узнать вас на встрече.',
    example: 'белый, серебристый, красный',
  },
  plateNumber: {
    description: 'Государственный регистрационный номер автомобиля.',
    example: 'А123БВ777',
    impact: 'Нужен для страховых случаев и документов',
  },

  // Шаг 4: Расписание
  workingDays: {
    description: 'Выберите дни недели, в которые вы готовы проводить занятия.',
    impact: 'Гибкое расписание привлекает больше учеников',
  },
  workingHours: {
    description: 'Укажите ваши рабочие часы. Ученики смогут записываться только в это время.',
    example: 'с 9:00 до 20:00',
  },
  lessonDuration: {
    description: 'Стандартная длительность одного занятия по вождению.',
    example: '90 минут — оптимально для практики',
    impact: 'Занятия 90 мин популярнее, чем 60 мин',
  },
  breakDuration: {
    description: 'Перерыв между занятиями для отдыха и переезда к следующему ученику.',
    example: '15-30 минут',
  },

  // Шаг 5: Цены и районы
  basePrice: {
    description: 'Стоимость одного занятия по вождению.',
    example: '2000-3000 ₽ в Москве',
    impact: 'Конкурентная цена увеличивает количество заявок',
  },
  workingAreas: {
    description: 'Укажите районы и города, где вы проводите занятия.',
    example: 'Москва: Центральный, Северный АО',
    impact: 'Ученики ищут инструкторов рядом с домом или работой',
  },
} as const
