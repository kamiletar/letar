'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { numberToOrdinal, numberToWords } from '@letar/number-words'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { getCurrentUnixHour, isMilestoneHour, MILESTONE_INTERVAL } from '@/lib/milestone'

import { Celebration } from '../_components/celebration'
import { Countdown } from '../_components/countdown'
import { SubscribeButton } from '../_components/subscribe-button'

export default function WhatHourPage() {
  const t = useTranslations('time')
  const locale = useLocale()
  const [hour, setHour] = useState<number | null>(null)

  useEffect(() => {
    setHour(getCurrentUnixHour())

    const interval = setInterval(() => {
      setHour(getCurrentUnixHour())
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  if (hour === null) {
    return <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" />
  }

  const isSpecialNumber = /0{3,}$/.test(String(hour))
  const isCelebrating = isMilestoneHour(hour, MILESTONE_INTERVAL)

  return (
    <>
      {isCelebrating && <Celebration milestoneHour={hour} />}

      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        maxW="25em"
        mx="auto"
        textAlign="center"
        px={4}
      >
        <VStack gap={6}>
          <VStack gap={4} aria-live="polite" aria-atomic="true">
            {isSpecialNumber ? (
              <Text
                fontSize={{ base: '4vmin', md: '4.2vmin' }}
                fontWeight="100"
                letterSpacing="0.08em"
                lineHeight="1.4"
                textTransform="lowercase"
                _firstLetter={{ textTransform: 'uppercase' }}
              >
                {numberToWords(hour - 1, locale)} {t('hoursPassed')}
              </Text>
            ) : (
              <Text
                fontSize={{ base: '4vmin', md: '4.2vmin' }}
                fontWeight="100"
                letterSpacing="0.08em"
                lineHeight="1.4"
              >
                {t('now')}{' '}
                <Text as="span" fontWeight="300">
                  {numberToOrdinal(hour, locale)}
                </Text>{' '}
                {t('hour')}
              </Text>
            )}
          </VStack>

          <Countdown />

          <SubscribeButton />
        </VStack>
      </Box>
    </>
  )
}
