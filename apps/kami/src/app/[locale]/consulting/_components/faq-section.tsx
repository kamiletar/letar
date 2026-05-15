'use client'

import { Accordion, Box, Heading, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { memo, useCallback, useState } from 'react'

interface FaqItem {
  question: string
  answer: string
}

/**
 * CSS keyframes для scroll-triggered анимации появления
 * Заменяет framer-motion whileInView для лучшей производительности
 */
const fadeInUpKeyframes = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

/**
 * Анимированная FAQ секция с плавным открытием/закрытием
 * Использует CSS transitions вместо framer-motion для лучшей производительности
 */
export const FaqSection = memo(function FaqSection() {
  const t = useTranslations('consulting')
  const faqItems = t.raw('faq.items') as FaqItem[]
  const [openItems, setOpenItems] = useState<string[]>([])

  const handleValueChange = useCallback((details: { value: string[] }) => {
    setOpenItems(details.value)
  }, [])

  return (
    <VStack gap={8} align="stretch">
      {/* Inject keyframes */}
      <style>{fadeInUpKeyframes}</style>

      <Heading as="h2" fontSize={{ base: '2xl', md: '3xl' }} textAlign="center">
        {t('faq.title')}
      </Heading>

      <Accordion.Root
        collapsible
        variant="enclosed"
        borderRadius="xl"
        bg={{ base: 'white', _dark: 'gray.900' }}
        value={openItems}
        onValueChange={handleValueChange}
      >
        {faqItems.map((item, index) => {
          const itemValue = `item-${index}`
          const isOpen = openItems.includes(itemValue)

          return (
            <Box
              key={itemValue}
              css={{
                animation: `fadeInUp 0.4s ease-out ${index * 0.08}s both`,
              }}
            >
              <Accordion.Item value={itemValue}>
                <Accordion.ItemTrigger
                  px={5}
                  py={4}
                  _hover={{
                    bg: { base: 'gray.50', _dark: 'gray.800' },
                  }}
                  transition="all 0.2s"
                >
                  <Text fontWeight="medium" flex="1" textAlign="left">
                    {item.question}
                  </Text>
                  <Box
                    css={{
                      transition: 'transform 0.3s ease-in-out',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    <Accordion.ItemIndicator />
                  </Box>
                </Accordion.ItemTrigger>

                {/* CSS-based accordion content с grid-анимацией */}
                <Box
                  css={{
                    display: 'grid',
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    opacity: isOpen ? 1 : 0,
                    transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease',
                  }}
                >
                  <Box css={{ overflow: 'hidden' }}>
                    <Box px={5} pb={4} pt={2}>
                      <Text color="fg.subtle" lineHeight="tall">
                        {item.answer}
                      </Text>
                    </Box>
                  </Box>
                </Box>
              </Accordion.Item>
            </Box>
          )
        })}
      </Accordion.Root>
    </VStack>
  )
})
