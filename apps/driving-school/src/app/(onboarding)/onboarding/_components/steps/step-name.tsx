'use client'

/**
 * Шаг 1: Ввод имени пользователя
 */

import { Button, Card, Field, Heading, Input, Steps, Text } from '@chakra-ui/react'

interface StepNameProps {
  name: string
  onChange: (name: string) => void
  onNext: () => void
  error?: string
}

export function StepName({ name, onChange, onNext, error }: StepNameProps) {
  return (
    <Steps.Content index={0}>
      <Card.Root>
        <Card.Header>
          <Heading size="lg">Как вас зовут?</Heading>
          <Text color="fg.muted">Это имя будет видно другим пользователям</Text>
        </Card.Header>
        <Card.Body>
          <Field.Root invalid={!!error}>
            <Field.Label>Ваше имя</Field.Label>
            <Input
              value={name}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onNext()}
              placeholder="Например: Александр"
              size="lg"
              autoFocus
            />
            {error && <Field.ErrorText>{error}</Field.ErrorText>}
          </Field.Root>
        </Card.Body>
        <Card.Footer>
          <Steps.NextTrigger asChild>
            <Button colorPalette="brand" size="lg">
              Продолжить
            </Button>
          </Steps.NextTrigger>
        </Card.Footer>
      </Card.Root>
    </Steps.Content>
  )
}
