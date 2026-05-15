'use client'

import {
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Link,
  Menu,
  Portal,
  Skeleton,
  SkeletonCircle,
  Text,
} from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import NextLink from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LuBookOpen,
  LuCalendar,
  LuChartBar,
  LuCheck,
  LuChevronDown,
  LuCog,
  LuGraduationCap,
  LuHouse,
  LuMapPin,
  LuPlus,
  LuStar,
  LuTrendingUp,
  LuUsers,
} from 'react-icons/lu'

import type { SchoolInfo, UserSchoolItem } from '../_actions/school-info.action'
import { getSchoolInfoAction, getUserSchoolsAction } from '../_actions/school-info.action'

// Роли администраторов
const roleLabels: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
}

export function SchoolAdminHeader() {
  const params = useParams()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  // Извлекаем schoolId из URL (из params или searchParams)
  const schoolId = (params.schoolId as string) || (params.id as string) || searchParams.get('schoolId')

  const [school, setSchool] = useState<SchoolInfo | null>(null)
  const [schools, setSchools] = useState<UserSchoolItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Загружаем список школ и текущую школу
  useEffect(() => {
    const fetchData = () => {
      setIsLoading(true)

      Promise.all([getUserSchoolsAction(), schoolId ? getSchoolInfoAction(schoolId) : Promise.resolve(null)])
        .then(([schoolsResult, schoolResult]) => {
          if (schoolsResult.success) {
            setSchools(schoolsResult.schools)
          }
          if (schoolResult?.success) {
            setSchool(schoolResult.school)
          } else {
            setSchool(null)
          }
        })
        .finally(() => setIsLoading(false))
    }

    fetchData()

    // Обновляем данные при создании/удалении сущностей (курсов, групп, тем)
    const handleDataChanged = () => fetchData()
    window.addEventListener('school-data-changed', handleDataChanged)
    return () => window.removeEventListener('school-data-changed', handleDataChanged)
  }, [schoolId, pathname])

  // Переключение школы
  const handleSchoolChange = (newSchoolId: string) => {
    // Определяем текущий раздел и переходим в него с новой школой
    const section = getCurrentSection(pathname)
    const newPath = buildPathForSchool(section, newSchoolId)
    router.push(newPath)
  }

  // Определяем текущий раздел
  const getCurrentSection = (path: string): string => {
    if (path.includes('/stats')) {
      return 'stats'
    }
    if (path.includes('/progress')) {
      return 'progress'
    }
    if (path.includes('/courses')) {
      return 'courses'
    }
    if (path.includes('/locations')) {
      return 'locations'
    }
    if (path.includes('/study-groups')) {
      return 'study-groups'
    }
    if (path.includes('/theory-topics')) {
      return 'theory-topics'
    }
    if (path.includes('/theory-lessons')) {
      return 'theory-lessons'
    }
    if (path.includes('/reviews')) {
      return 'reviews'
    }
    if (path.includes('/settings')) {
      return 'settings'
    }
    // Проверяем страницу участников: /school/[id] (без дополнительных сегментов)
    if (path.match(/\/school\/[^/]+$/)) {
      return 'members'
    }
    return 'stats' // По умолчанию - статистика
  }

  // Строим путь для школы
  const buildPathForSchool = (section: string, targetSchoolId: string): string => {
    switch (section) {
      case 'stats':
        return `/school/stats/${targetSchoolId}`
      case 'members':
        return `/school/${targetSchoolId}`
      case 'progress':
        return `/school/progress/${targetSchoolId}`
      case 'courses':
        return `/school/courses/${targetSchoolId}`
      case 'locations':
        return `/school/locations/${targetSchoolId}`
      case 'study-groups':
        return `/school/study-groups/${targetSchoolId}`
      case 'theory-topics':
        return `/school/theory-topics/${targetSchoolId}`
      case 'theory-lessons':
        return `/school/theory-lessons/${targetSchoolId}`
      case 'reviews':
        return `/school/reviews/${targetSchoolId}`
      case 'settings':
        return `/school/${targetSchoolId}/settings`
      default:
        return `/school/stats/${targetSchoolId}`
    }
  }

  return (
    <>
      {/* Хедер с информацией о школе и селектором */}
      <Box bg="bg" borderBottomWidth="1px" borderColor="border" position="sticky" top={0} zIndex={10}>
        <Container maxW="container.xl">
          <Flex h="16" align="center" justify="space-between">
            {/* Левая часть: Селектор школы */}
            <HStack gap={3}>
              {isLoading ? (
                <HStack gap={3}>
                  <SkeletonCircle size="10" />
                  <Box>
                    <Skeleton height="5" width="40" />
                    <Skeleton height="4" width="24" mt={1} />
                  </Box>
                </HStack>
              ) : schools.length > 0 ? (
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <Button variant="ghost" px={2} h="auto" py={2}>
                      <HStack gap={3}>
                        <Avatar.Root size="sm">
                          {school?.logo && <Avatar.Image src={school.logo} />}
                          <Avatar.Fallback>{school?.name?.charAt(0) || '?'}</Avatar.Fallback>
                        </Avatar.Root>
                        <Box textAlign="left">
                          <HStack gap={2}>
                            <Text fontWeight="semibold" fontSize="sm">
                              {school?.name || 'Выберите школу'}
                            </Text>
                            {school && (
                              <Badge colorPalette="blue" size="sm">
                                {roleLabels[school.role] || school.role}
                              </Badge>
                            )}
                          </HStack>
                        </Box>
                        <Box color="fg.muted">
                          <LuChevronDown size={16} />
                        </Box>
                      </HStack>
                    </Button>
                  </Menu.Trigger>
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content minW="280px">
                        <Menu.ItemGroup>
                          <Menu.ItemGroupLabel>Мои школы</Menu.ItemGroupLabel>
                          {schools.map((s) => (
                            <Menu.Item
                              key={s.id}
                              value={s.id}
                              onClick={() => handleSchoolChange(s.id)}
                              cursor="pointer"
                            >
                              <HStack gap={3} flex={1}>
                                <Avatar.Root size="xs">
                                  {s.logo && <Avatar.Image src={s.logo} />}
                                  <Avatar.Fallback>{s.name.charAt(0)}</Avatar.Fallback>
                                </Avatar.Root>
                                <Box flex={1}>
                                  <Text fontSize="sm" fontWeight="medium">
                                    {s.name}
                                  </Text>
                                  <Text fontSize="xs" color="fg.muted">
                                    {roleLabels[s.role] || s.role}
                                  </Text>
                                </Box>
                                {s.id === schoolId && (
                                  <Box color="fg.solid">
                                    <LuCheck size={16} />
                                  </Box>
                                )}
                              </HStack>
                            </Menu.Item>
                          ))}
                        </Menu.ItemGroup>
                        <Menu.Separator />
                        <Menu.Item value="create" asChild>
                          <NextLink href="/school/create">
                            <HStack gap={2}>
                              <LuPlus size={16} />
                              <Text>Зарегистрировать школу</Text>
                            </HStack>
                          </NextLink>
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>
              ) : (
                <Button asChild colorPalette="brand" size="sm">
                  <NextLink href="/school/create">
                    <LuPlus size={16} />
                    Зарегистрировать школу
                  </NextLink>
                </Button>
              )}
            </HStack>

            {/* Правая часть: Ссылка на дашборд */}
            <Link asChild fontSize="sm" color="fg.muted">
              <NextLink href="/dashboard">
                <HStack gap={1}>
                  <LuHouse size={16} />
                  <Text display={{ base: 'none', sm: 'inline' }}>Дашборд</Text>
                </HStack>
              </NextLink>
            </Link>
          </Flex>
        </Container>
      </Box>

      {/* Навигация по разделам */}
      {schoolId && <SchoolAdminNav schoolId={schoolId} currentPath={pathname} school={school} />}
    </>
  )
}

interface SchoolAdminNavProps {
  schoolId: string
  currentPath: string
  school: SchoolInfo | null
}

function SchoolAdminNav({ schoolId, currentPath, school }: SchoolAdminNavProps) {
  const hasCourses = (school?.coursesCount ?? 0) > 0
  const hasStudyGroups = (school?.studyGroupsCount ?? 0) > 0
  const hasTheoryTopics = (school?.theoryTopicsCount ?? 0) > 0

  const navItems = [
    { href: `/school/stats/${schoolId}`, label: 'Статистика', icon: LuChartBar, section: 'stats' },
    {
      href: `/school/progress/${schoolId}`,
      label: 'Ученики',
      icon: LuTrendingUp,
      section: 'progress',
      disabled: !hasCourses || !hasStudyGroups,
      disabledReason: !hasCourses ? 'Сначала создайте хотя бы один курс обучения' : 'Сначала создайте учебные группы',
    },
    { href: `/school/courses/${schoolId}`, label: 'Курсы', icon: LuGraduationCap, section: 'courses' },
    { href: `/school/${schoolId}`, label: 'Участники', icon: LuUsers, section: 'members' },
    { href: `/school/locations/${schoolId}`, label: 'Филиалы', icon: LuMapPin, section: 'locations' },
    {
      href: `/school/study-groups/${schoolId}`,
      label: 'Учебные группы',
      icon: LuBookOpen,
      section: 'study-groups',
      disabled: !hasCourses,
      disabledReason: 'Сначала создайте хотя бы один курс обучения',
    },
    {
      href: `/school/theory-topics/${schoolId}`,
      label: 'Темы занятий',
      icon: LuBookOpen,
      section: 'theory-topics',
      disabled: !hasCourses,
      disabledReason: 'Сначала создайте хотя бы один курс обучения',
    },
    {
      href: `/school/theory-lessons/${schoolId}`,
      label: 'Расписание',
      icon: LuCalendar,
      section: 'theory-lessons',
      disabled: !hasCourses || !hasStudyGroups || !hasTheoryTopics,
      disabledReason: !hasCourses
        ? 'Сначала создайте хотя бы один курс обучения'
        : !hasStudyGroups
          ? 'Сначала создайте учебные группы'
          : 'Сначала добавьте темы занятий',
    },
    { href: `/school/reviews/${schoolId}`, label: 'Отзывы', icon: LuStar, section: 'reviews' },
    { href: `/school/${schoolId}/settings`, label: 'Настройки', icon: LuCog, section: 'settings' },
  ]

  // Определяем активный раздел
  const getIsActive = (section: string) => {
    if (section === 'settings') {
      return currentPath.includes('/settings')
    }
    return currentPath.includes(`/${section}`)
  }

  return (
    <Box bg="bg" borderBottomWidth="1px" borderColor="border">
      <Container maxW="container.xl">
        <HStack gap={2} overflowX="auto" pl={2} py={2}>
          {navItems.map((item) => {
            const isActive = getIsActive(item.section)
            const IconComponent = item.icon
            const isDisabled = 'disabled' in item && item.disabled

            if (isDisabled) {
              return (
                <Tooltip key={item.href} content={'disabledReason' in item ? item.disabledReason : ''}>
                  <Box
                    px={4}
                    py={2}
                    borderRadius="md"
                    fontSize="sm"
                    fontWeight="medium"
                    color="fg.subtle"
                    cursor="not-allowed"
                    opacity={0.5}
                    whiteSpace="nowrap"
                  >
                    <HStack gap={2}>
                      <IconComponent size={16} />
                      <span>{item.label}</span>
                    </HStack>
                  </Box>
                </Tooltip>
              )
            }

            return (
              <Link
                key={item.href}
                asChild
                px={4}
                py={2}
                borderRadius="md"
                fontSize="sm"
                fontWeight="medium"
                color={isActive ? 'fg' : 'fg.muted'}
                bg={isActive ? 'bg.muted' : 'transparent'}
                _hover={{ bg: 'bg.muted', color: 'fg' }}
                _active={{
                  transform: 'scale(.9)',
                  '&:hover': {
                    bg: 'fg.subtle',
                  },
                }}
                whiteSpace="nowrap"
              >
                <NextLink href={item.href}>
                  <HStack gap={2}>
                    <IconComponent size={16} />
                    <span>{item.label}</span>
                  </HStack>
                </NextLink>
              </Link>
            )
          })}
        </HStack>
      </Container>
    </Box>
  )
}
