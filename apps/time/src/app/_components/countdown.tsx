'use client'

import { Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { formatTimeRemaining, getNextMilestone, getTimeToMilestone } from '@/lib/milestone'

/**
 * Обратный отсчёт до следующего юбилейного UNIX-часа
 */
export function Countdown() {
  const t = useTranslations('countdown')
  const [remaining, setRemaining] = useState<ReturnType<typeof formatTimeRemaining> | null>(null)
  const [milestone, setMilestone] = useState<number>(0)

  useEffect(() => {
    const nextMilestone = getNextMilestone()
    setMilestone(nextMilestone)

    function update() {
      setRemaining(formatTimeRemaining(getTimeToMilestone(nextMilestone)))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!remaining || !milestone) {
    return null
  }

  const milestoneFormatted = milestone.toLocaleString()

  return (
    <Text fontSize={{ base: '2.5vmin', md: '2.8vmin' }} fontWeight="100" letterSpacing="0.08em" color="fg.muted">
      {t('until', { milestone: milestoneFormatted })}
      {': '}
      {remaining.days > 0 && t('days', { count: remaining.days })}
      {remaining.days > 0 && ' '}
      {t('hours', { count: remaining.hours })} {t('minutes', { count: remaining.minutes })}{' '}
      {t('seconds', { count: remaining.seconds })}
    </Text>
  )
}
