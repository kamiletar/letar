'use client'

import { Steps } from '@chakra-ui/react'
import { LuCheck, LuFileSpreadsheet, LuSettings, LuUpload, LuUsers } from 'react-icons/lu'

interface WizardStepsProps {
  currentStepIndex: number
}

/**
 * Компонент прогресса визарда импорта.
 */
export function WizardSteps({ currentStepIndex }: WizardStepsProps) {
  return (
    <Steps.Root step={currentStepIndex} count={5} size="sm" colorPalette="brand">
      <Steps.List>
        <Steps.Item index={0}>
          <Steps.Indicator>
            <Steps.Status incomplete={<LuUsers />} complete={<LuCheck />} />
          </Steps.Indicator>
          <Steps.Title>Тип данных</Steps.Title>
          <Steps.Separator />
        </Steps.Item>
        <Steps.Item index={1}>
          <Steps.Indicator>
            <Steps.Status incomplete={<LuUpload />} complete={<LuCheck />} />
          </Steps.Indicator>
          <Steps.Title>Загрузка</Steps.Title>
          <Steps.Separator />
        </Steps.Item>
        <Steps.Item index={2}>
          <Steps.Indicator>
            <Steps.Status incomplete={<LuSettings />} complete={<LuCheck />} />
          </Steps.Indicator>
          <Steps.Title>Сопоставление</Steps.Title>
          <Steps.Separator />
        </Steps.Item>
        <Steps.Item index={3}>
          <Steps.Indicator>
            <Steps.Status incomplete={<LuFileSpreadsheet />} complete={<LuCheck />} />
          </Steps.Indicator>
          <Steps.Title>Проверка</Steps.Title>
          <Steps.Separator />
        </Steps.Item>
        <Steps.Item index={4}>
          <Steps.Indicator>
            <Steps.Status incomplete={<LuCheck />} complete={<LuCheck />} />
          </Steps.Indicator>
          <Steps.Title>Готово</Steps.Title>
          <Steps.Separator />
        </Steps.Item>
      </Steps.List>
    </Steps.Root>
  )
}
