'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Card, Link as ChakraLink, HStack, Icon, IconButton, Spinner, Text } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { LuCheck, LuExternalLink, LuEye, LuFileDown, LuUser } from 'react-icons/lu'
import { fetchSiteStats, type UmamiWebsite, writeEnvToServer } from './api'

const UMAMI_UI_URL = 'https://stats.letar.best'

/** Процент отказов (bounce rate) */
function bounceRate(pageviews: number, bounces: number, visits: number): number {
  if (!visits) {
    return 0
  }
  return Math.round((bounces / visits) * 100)
}

/** Цвет bounce rate */
function bounceColor(rate: number): string {
  if (rate < 40) {
    return 'green.500'
  }
  if (rate < 60) {
    return 'yellow.500'
  }
  return 'red.500'
}

interface SiteCardProps {
  site: UmamiWebsite
  /** null — ещё загружается, true — env записан, false — не записан */
  envConfigured: boolean | null
}

/** Компактная карточка сайта с метриками из Umami */
export function SiteCard({ site, envConfigured }: SiteCardProps) {
  const [envState, setEnvState] = useState<'idle' | 'writing' | 'done'>('idle')
  const queryClient = useQueryClient()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics-stats', site.id],
    queryFn: () => fetchSiteStats(site.id),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const br = stats ? bounceRate(stats.pageviews, stats.bounces, stats.visits) : 0

  /** Записать env на сервер */
  const handleWriteEnv = async () => {
    setEnvState('writing')
    const { ok, error } = await writeEnvToServer(site.domain, site.id)
    if (ok) {
      setEnvState('done')
      toaster.create({ title: `.env.docker обновлён для ${site.name}`, type: 'success' })
      queryClient.invalidateQueries({ queryKey: ['analytics-env-status'] })
    } else {
      setEnvState('idle')
      toaster.create({
        title: 'Не удалось записать',
        description: `${error}\nСкопируй вручную`,
        type: 'warning',
      })
    }
  }

  return (
    <Card.Root>
      <Card.Body px="4" py="3">
        {/* Заголовок + badge */}
        <HStack justify="space-between" mb="2">
          <ChakraLink
            href={`${UMAMI_UI_URL}/websites/${site.id}`}
            target="_blank"
            rel="noopener noreferrer"
            _hover={{ textDecoration: 'underline' }}
          >
            <Text fontWeight="semibold" fontSize="sm">
              {site.name}
            </Text>
          </ChakraLink>
          <Badge colorPalette="green" size="sm">
            live
          </Badge>
        </HStack>

        {/* Домен */}
        <Text fontSize="xs" color="fg.muted" mb="2" asChild _hover={{ textDecoration: 'underline' }}>
          <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer">
            {site.domain}
          </a>
        </Text>

        {/* Метрики — одна компактная строка */}
        {isLoading ? (
          <Spinner size="xs" />
        ) : stats ? (
          <HStack gap="4" fontSize="xs" color="fg.muted">
            <HStack gap="1">
              <Icon size="xs">
                <LuEye />
              </Icon>
              <Text fontWeight="medium" color="fg" fontSize="sm">
                {stats.pageviews.toLocaleString('ru-RU')}
              </Text>
            </HStack>
            <HStack gap="1">
              <Icon size="xs">
                <LuUser />
              </Icon>
              <Text fontWeight="medium" color="fg" fontSize="sm">
                {stats.visitors.toLocaleString('ru-RU')}
              </Text>
            </HStack>
            <Text ml="auto" fontWeight="medium" fontSize="sm" color={bounceColor(br)}>
              {br}%
            </Text>
          </HStack>
        ) : (
          <Text fontSize="xs" color="fg.muted">
            Нет данных
          </Text>
        )}

        {/* Ссылки: Umami + записать env */}
        <HStack justify="space-between" mt="2">
          <ChakraLink
            href={`${UMAMI_UI_URL}/websites/${site.id}`}
            target="_blank"
            rel="noopener noreferrer"
            fontSize="xs"
            color="brand.fg"
            _hover={{ textDecoration: 'underline' }}
          >
            <HStack gap="1">
              <Text>Umami</Text>
              <Icon size="xs">
                <LuExternalLink />
              </Icon>
            </HStack>
          </ChakraLink>

          <IconButton
            aria-label="Записать в .env.docker"
            size="xs"
            variant={envState === 'done' || (envConfigured === false && envState === 'idle') ? 'solid' : 'ghost'}
            colorPalette={envState === 'done' ? 'green' : envConfigured === false ? 'orange' : 'gray'}
            onClick={handleWriteEnv}
            loading={envState === 'writing'}
            title={
              envConfigured === false ? 'env не записан — нажми для записи' : 'Записать UMAMI_WEBSITE_ID в .env.docker'
            }
          >
            {envState === 'done' ? <LuCheck /> : <LuFileDown />}
          </IconButton>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
