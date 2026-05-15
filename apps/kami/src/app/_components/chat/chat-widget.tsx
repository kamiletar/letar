'use client'

import { useChat } from '@ai-sdk/react'
import { Card } from '@chakra-ui/react'
import { DefaultChatTransport } from 'ai'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { ChatButton } from './chat-button'
import { ChatHeader } from './chat-header'
import { ChatInput } from './chat-input'
import { ChatMessages } from './chat-messages'

/**
 * Анимированная обёртка для Card
 */
const MotionCard = motion.create(Card.Root)

/**
 * Плавающий виджет AI-чатбота
 */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  const handleSend = (text: string) => {
    sendMessage({ text })
  }

  return (
    <>
      {/* Кнопка открытия чата */}
      {!isOpen && <ChatButton onClick={() => setIsOpen(true)} />}

      {/* Окно чата с анимацией */}
      <AnimatePresence>
        {isOpen && (
          <MotionCard
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            position="fixed"
            bottom={6}
            right={6}
            width={{ base: 'calc(100vw - 48px)', sm: '380px' }}
            maxH="500px"
            zIndex="popover"
            shadow="2xl"
            overflow="hidden"
          >
            <ChatHeader onClose={() => setIsOpen(false)} />
            <ChatMessages messages={messages} isLoading={isLoading} error={error} />
            <ChatInput onSend={handleSend} isLoading={isLoading} />
          </MotionCard>
        )}
      </AnimatePresence>
    </>
  )
}
