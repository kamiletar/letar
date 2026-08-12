'use client'

import { Code, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

export default function DocumentsDemoPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout
      title="Russian Documents"
      description="Form.Document.* — ИНН, ОГРН, БИК, СНИЛС, Паспорт с масками и контрольными суммами"
    >
      {/* Реквизиты компании */}
      <VStack gap={4} align="stretch">
        <Heading size="lg">Реквизиты компании</Heading>
        <Text color="fg.muted">Маски ввода + realtime валидация контрольных сумм.</Text>

        <Form
          initialValue={{
            inn: '',
            kpp: '',
            ogrn: '',
            bik: '',
            account: '',
            corrAccount: '',
          }}
          onSubmit={(data) => setResult(data)}
        >
          <Form.Document.INN name="inn" label="ИНН" required />
          <Form.Document.KPP name="kpp" label="КПП" />
          <Form.Document.OGRN name="ogrn" label="ОГРН" />
          <Form.Document.BIK name="bik" label="БИК" />
          <Form.Document.BankAccount name="account" label="Расчётный счёт" />
          <Form.Document.CorrAccount name="corrAccount" label="Корр. счёт" />
          <Form.Button.Submit>Сохранить</Form.Button.Submit>
        </Form>
      </VStack>

      {/* Документы физлица */}
      <VStack gap={4} align="stretch" mt={8}>
        <Heading size="lg">Документы физлица</Heading>

        <Form
          initialValue={{
            snils: '',
            passport: '',
            foreignPassport: '',
            departmentCode: '',
            birthCertificate: '',
          }}
          onSubmit={(data) => setResult(data)}
        >
          <Form.Document.SNILS name="snils" label="СНИЛС" />
          <Form.Document.Passport name="passport" label="Паспорт" />
          <Form.Document.ForeignPassport name="foreignPassport" label="Загранпаспорт" />
          <Form.Document.DepartmentCode name="departmentCode" label="Код подразделения" />
          <Form.Document.BirthCertificate name="birthCertificate" label="Свидетельство о рождении" />
          <Form.Button.Submit>Сохранить</Form.Button.Submit>
        </Form>
      </VStack>

      {result && (
        <Code whiteSpace="pre" mt={4}>
          {JSON.stringify(result, null, 2)}
        </Code>
      )}
    </DemoPageLayout>
  )
}
