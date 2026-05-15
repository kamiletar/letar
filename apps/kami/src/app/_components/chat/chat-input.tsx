'use client'

import { Button, Card, HStack, Icon, Input } from '@chakra-ui/react'
import { Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface ChatInputProps {
  onSend: (text: string) => void
  isLoading: boolean
}

/**
 * Форма ввода сообщения
 */
export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const t = useTranslations('chat')
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) {
      return
    }
    onSend(input)
    setInput('')
  }

  return (
    <Card.Footer p={3} borderTopWidth="1px">
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <HStack gap={2}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            size="sm"
            disabled={isLoading}
          />
          <Button type="submit" colorPalette="purple" size="sm" loading={isLoading} disabled={!input.trim()}>
            <Icon boxSize={4}>
              <Send />
            </Icon>
          </Button>
        </HStack>
      </form>
    </Card.Footer>
  )
}
