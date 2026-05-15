import { Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <Container maxW="4xl" py="8">
      <VStack gap={6} align="stretch">
        <Heading size="2xl">Form Develop App</Heading>
        <Text color="gray.500">
          Песочница для разработки @letar/forms. Полноценный CRUDL пример с рецептами.
        </Text>
        <Button asChild colorPalette="blue" size="lg" width="fit-content">
          <Link href="/recipes">Перейти к рецептам</Link>
        </Button>
        <Button asChild colorPalette="teal" size="lg" width="fit-content">
          <Link href="/fields-demo">Демо полей форм</Link>
        </Button>
        <Button asChild colorPalette="purple" size="lg" width="fit-content">
          <Link href="/numeric-demo">Числовые поля (NumberInput, Currency, Percentage)</Link>
        </Button>
        <Button asChild colorPalette="orange" size="lg" width="fit-content">
          <Link href="/masked-demo">Маскированные поля (Phone, MaskedInput)</Link>
        </Button>
        <Button asChild colorPalette="cyan" size="lg" width="fit-content">
          <Link href="/advanced-demo">Продвинутые поля (Address, Duration, DateTimePicker)</Link>
        </Button>
        <Button asChild colorPalette="red" size="lg" width="fit-content">
          <Link href="/auth-demo">Аутентификация (PasswordStrength, OTPInput)</Link>
        </Button>
        <Button asChild colorPalette="yellow" size="lg" width="fit-content">
          <Link href="/offline-demo">Оффлайн формы (OfflineIndicator, SyncStatus)</Link>
        </Button>
        <Button asChild colorPalette="green" size="lg" width="fit-content">
          <Link href="/i18n-demo">Мультиязычность (FormI18nProvider, i18nKey)</Link>
        </Button>
        <Button asChild colorPalette="pink" size="lg" width="fit-content">
          <Link href="/field-change-demo">Реактивные поля (onFieldChange, Form.Watch)</Link>
        </Button>
        <Button asChild colorPalette="gray" size="lg" width="fit-content">
          <Link href="/autofill-demo">Smart Autofill (автоматический autocomplete)</Link>
        </Button>
        <Button asChild colorPalette="blue" variant="outline" size="lg" width="fit-content">
          <Link href="/utility-demo">Утилитарные (InfoBlock, Divider, Hidden)</Link>
        </Button>
        <Button asChild colorPalette="teal" variant="outline" size="lg" width="fit-content">
          <Link href="/calculated-demo">Вычисляемые поля (Form.Field.Calculated)</Link>
        </Button>
        <Button asChild colorPalette="red" variant="outline" size="lg" width="fit-content">
          <Link href="/security-demo">Security (Honeypot, Rate Limit, Secure Upload)</Link>
        </Button>
        <Button asChild colorPalette="purple" variant="outline" size="lg" width="fit-content">
          <Link href="/signature-demo">Signature (Canvas подпись + Typed mode)</Link>
        </Button>
        <Button asChild colorPalette="orange" variant="outline" size="lg" width="fit-content">
          <Link href="/documents-demo">Russian Documents (ИНН, ОГРН, БИК, СНИЛС)</Link>
        </Button>
        <Button asChild colorPalette="cyan" variant="outline" size="lg" width="fit-content">
          <Link href="/table-editor-demo">TableEditor (Инлайн-таблица для массивов)</Link>
        </Button>
        <Button asChild colorPalette="pink" variant="outline" size="lg" width="fit-content">
          <Link href="/matrix-choice-demo">MatrixChoice (Матрица для опросников)</Link>
        </Button>
        <Button asChild colorPalette="yellow" variant="outline" size="lg" width="fit-content">
          <Link href="/survey-fields-demo">Survey Fields (ImageChoice + Likert + YesNo)</Link>
        </Button>
        <Button asChild colorPalette="red" variant="outline" size="lg" width="fit-content">
          <Link href="/async-validation-demo">Async Validation (серверная проверка)</Link>
        </Button>
        <Button asChild colorPalette="teal" variant="outline" size="lg" width="fit-content">
          <Link href="/templates-demo">Form Templates (10 готовых шаблонов)</Link>
        </Button>
        <Button asChild colorPalette="gray" variant="outline" size="lg" width="fit-content">
          <Link href="/autosave-demo">Autosave (серверное автосохранение)</Link>
        </Button>
        <Button asChild colorPalette="blue" variant="outline" size="lg" width="fit-content">
          <Link href="/conversational-demo">Conversational Mode (Typeform-стиль)</Link>
        </Button>
        <Button asChild colorPalette="purple" variant="outline" size="lg" width="fit-content">
          <Link href="/data-grid-demo">DataGrid (TanStack Table, 100+ строк)</Link>
        </Button>
        <Button asChild colorPalette="green" variant="outline" size="lg" width="fit-content">
          <Link href="/credit-card-demo">CreditCard (Ввод данных карты)</Link>
        </Button>
        <Button asChild colorPalette="orange" variant="outline" size="lg" width="fit-content">
          <Link href="/captcha-demo">CAPTCHA (Turnstile, reCAPTCHA, hCaptcha)</Link>
        </Button>
      </VStack>
    </Container>
  )
}
