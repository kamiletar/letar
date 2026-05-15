'use client'

/**
 * WeatherWidget — виджет погоды для занятий
 *
 * Показывает прогноз погоды на время запланированного занятия
 * Помогает ученикам и инструкторам подготовиться к условиям вождения
 *
 * @module weather-widget
 */

import { Badge, Box, HStack, Icon, Skeleton, Text, VStack } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { useEffect, useState } from 'react'
import {
  LuCloud,
  LuCloudDrizzle,
  LuCloudFog,
  LuCloudLightning,
  LuCloudRain,
  LuCloudSnow,
  LuSun,
  LuThermometer,
  LuWind,
} from 'react-icons/lu'

interface WeatherData {
  temperature: number
  condition: WeatherCondition
  description: string
  windSpeed: number
  humidity: number
}

type WeatherCondition = 'sunny' | 'cloudy' | 'partly_cloudy' | 'rain' | 'drizzle' | 'snow' | 'fog' | 'thunderstorm'

interface WeatherWidgetProps {
  /** Дата и время для прогноза */
  dateTime: Date
  /** Город (опционально, по умолчанию определяется по геолокации) */
  city?: string
  /** Компактный режим */
  compact?: boolean
}

/**
 * Иконка и цвет по погодным условиям
 */
function getWeatherStyle(condition: WeatherCondition): {
  icon: typeof LuSun
  color: string
  drivingTip: string
} {
  switch (condition) {
    case 'sunny':
      return {
        icon: LuSun,
        color: 'yellow',
        drivingTip: 'Отличная погода для вождения!',
      }
    case 'partly_cloudy':
      return {
        icon: LuCloud,
        color: 'blue',
        drivingTip: 'Хорошие условия для вождения',
      }
    case 'cloudy':
      return {
        icon: LuCloud,
        color: 'gray',
        drivingTip: 'Обычные условия вождения',
      }
    case 'drizzle':
      return {
        icon: LuCloudDrizzle,
        color: 'cyan',
        drivingTip: 'Включите дворники, соблюдайте дистанцию',
      }
    case 'rain':
      return {
        icon: LuCloudRain,
        color: 'blue',
        drivingTip: 'Мокрая дорога! Снизьте скорость',
      }
    case 'snow':
      return {
        icon: LuCloudSnow,
        color: 'cyan',
        drivingTip: 'Скользко! Будьте особенно осторожны',
      }
    case 'fog':
      return {
        icon: LuCloudFog,
        color: 'gray',
        drivingTip: 'Включите противотуманки, снизьте скорость',
      }
    case 'thunderstorm':
      return {
        icon: LuCloudLightning,
        color: 'purple',
        drivingTip: 'Опасные условия! Рекомендуем перенести занятие',
      }
    default:
      return {
        icon: LuCloud,
        color: 'gray',
        drivingTip: 'Проверьте погоду перед выездом',
      }
  }
}

/**
 * Мок-функция получения погоды (в продакшене заменить на реальный API)
 */
async function fetchWeather(_dateTime: Date, _city?: string): Promise<WeatherData> {
  // Симуляция задержки API
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Мок-данные на основе времени года
  const month = _dateTime.getMonth()

  // Зима (декабрь-февраль)
  if (month === 11 || month === 0 || month === 1) {
    return {
      temperature: Math.floor(Math.random() * 10) - 10, // -10 до 0
      condition: Math.random() > 0.5 ? 'snow' : 'cloudy',
      description: 'Зимняя погода',
      windSpeed: Math.floor(Math.random() * 10) + 2,
      humidity: Math.floor(Math.random() * 30) + 60,
    }
  }

  // Весна/осень
  if ((month >= 2 && month <= 4) || (month >= 9 && month <= 10)) {
    const conditions: WeatherCondition[] = ['partly_cloudy', 'cloudy', 'rain', 'drizzle']
    return {
      temperature: Math.floor(Math.random() * 15) + 5, // 5 до 20
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      description: 'Переменчивая погода',
      windSpeed: Math.floor(Math.random() * 8) + 3,
      humidity: Math.floor(Math.random() * 30) + 50,
    }
  }

  // Лето (июнь-август)
  const summerConditions: WeatherCondition[] = ['sunny', 'partly_cloudy', 'thunderstorm']
  return {
    temperature: Math.floor(Math.random() * 15) + 20, // 20 до 35
    condition: summerConditions[Math.floor(Math.random() * summerConditions.length)],
    description: 'Летняя погода',
    windSpeed: Math.floor(Math.random() * 5) + 1,
    humidity: Math.floor(Math.random() * 30) + 40,
  }
}

/**
 * Виджет погоды
 *
 * @example
 * ```tsx
 * // Для конкретного занятия
 * <WeatherWidget
 *   dateTime={lesson.startTime}
 *   city="Москва"
 * />
 *
 * // Компактный режим
 * <WeatherWidget dateTime={new Date()} compact />
 * ```
 */
export function WeatherWidget({ dateTime, city, compact = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadWeather() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchWeather(dateTime, city)
        if (mounted) {
          setWeather(data)
        }
      } catch {
        if (mounted) {
          setError('Не удалось загрузить погоду')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadWeather()

    return () => {
      mounted = false
    }
  }, [dateTime, city])

  // Загрузка
  if (isLoading) {
    return compact ? (
      <Skeleton height="24px" width="80px" borderRadius="md" />
    ) : (
      <Skeleton height="60px" borderRadius="lg" />
    )
  }

  // Ошибка
  if (error || !weather) {
    return null
  }

  const { icon: WeatherIcon, color, drivingTip } = getWeatherStyle(weather.condition)

  // Компактный режим
  if (compact) {
    return (
      <Tooltip content={`${weather.description}. ${drivingTip}`}>
        <Badge colorPalette={color} size="sm" display="flex" alignItems="center" gap={1}>
          <Icon boxSize={3}>
            <WeatherIcon />
          </Icon>
          {weather.temperature}°C
        </Badge>
      </Tooltip>
    )
  }

  // Полный режим
  return (
    <Box
      p={3}
      borderRadius="lg"
      bg={`${color}.50`}
      borderWidth="1px"
      borderColor={`${color}.200`}
      _dark={{
        bg: `${color}.950`,
        borderColor: `${color}.800`,
      }}
    >
      <HStack gap={3}>
        <Icon boxSize={8} color={`${color}.500`}>
          <WeatherIcon />
        </Icon>

        <VStack align="flex-start" gap={0} flex={1}>
          <HStack gap={2}>
            <Text fontWeight="bold" fontSize="lg">
              {weather.temperature}°C
            </Text>
            <Text color="fg.muted" fontSize="sm">
              {weather.description}
            </Text>
          </HStack>

          <HStack gap={4} fontSize="xs" color="fg.muted">
            <HStack gap={1}>
              <LuWind size={12} />
              <Text>{weather.windSpeed} м/с</Text>
            </HStack>
            <HStack gap={1}>
              <LuThermometer size={12} />
              <Text>{weather.humidity}%</Text>
            </HStack>
          </HStack>

          <Text fontSize="xs" color={`${color}.600`} mt={1}>
            💡 {drivingTip}
          </Text>
        </VStack>
      </HStack>
    </Box>
  )
}

/**
 * Мини-виджет погоды для карточек занятий
 */
export function WeatherBadge({ dateTime, city }: { dateTime: Date; city?: string }) {
  return <WeatherWidget dateTime={dateTime} city={city} compact />
}
