'use client'

import { FieldString, FormSteps } from '@letar/forms-shadcn'

import { DemoForm, DemoPageLayout } from '../_components'

export default function StepsDemoPage() {
  return (
    <DemoPageLayout
      title="FormSteps (beta)"
      description="Compound-компонент форм-уровня, не Field — изолированная песочница."
    >
      <DemoForm<{ firstName: string; email: string }>
        defaultValues={{ firstName: '', email: '' }}
        onSubmit={(value) => {
          // eslint-disable-next-line no-console
          console.log('steps submit', value)
        }}
      >
        <FormSteps>
          <FormSteps.Indicator showDescriptions />
          <FormSteps.Step title="Личное" description="Как к вам обращаться">
            <FieldString name="firstName" label="Имя" required />
          </FormSteps.Step>
          <FormSteps.Step title="Контакты" description="Как с вами связаться">
            <FieldString name="email" label="Email" type="email" />
          </FormSteps.Step>
          <FormSteps.CompletedContent>
            <p className="text-sm">Все шаги пройдены — можно отправлять.</p>
          </FormSteps.CompletedContent>
          {/* data-* на кнопках навигации: якоря для подсказок наставника и тестов */}
          <FormSteps.Navigation
            prevProps={{ 'data-assist-id': 'steps-demo.prev' }}
            nextProps={{ 'data-assist-id': 'steps-demo.next' }}
            submitProps={{ 'data-assist-id': 'steps-demo.submit' }}
          />
        </FormSteps>
      </DemoForm>
    </DemoPageLayout>
  )
}
