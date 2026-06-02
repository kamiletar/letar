/**
 * Тестовый скрипт для проверки отправки email через Maddy
 *
 * Запуск: npx tsx libs/email/test-maddy.ts <email> <smtp_password>
 *
 * Пример: npx tsx libs/email/test-maddy.ts user@gmail.com mypassword123
 */

const targetEmail = process.argv[2]
const smtpPassword = process.argv[3]

if (!targetEmail || !smtpPassword) {
  console.error('❌ Использование: npx tsx libs/email/test-maddy.ts <email> <smtp_password>')
  console.error('   Пример: npx tsx libs/email/test-maddy.ts user@gmail.com mypassword123')
  process.exit(1)
}

// Настройки Maddy
process.env.EMAIL_USE_MAILHOG = 'false'
process.env.SMTP_HOST = 'mail.letar.best'
process.env.SMTP_PORT = '587'
process.env.SMTP_USER = 'noreply@letar.best'
process.env.SMTP_PASSWORD = smtpPassword
process.env.SMTP_FROM_EMAIL = 'noreply@letar.best'
process.env.SMTP_FROM_NAME = 'Letar Monorepo'
process.env.BETTER_AUTH_URL = 'https://letar.best'

import { sendVerificationEmail, verifyConnection } from './src/index'

async function main() {
  console.log('🚀 Тестирование @letar/email через Maddy (mail.letar.best)\n')
  console.log(`📧 Отправляем на: ${targetEmail}\n`)

  // Проверка подключения
  console.log('1️⃣ Проверка подключения к Maddy...')
  const connected = await verifyConnection()
  if (!connected) {
    console.error('❌ Не удалось подключиться к Maddy')
    console.log('   Проверьте:')
    console.log('   - Сервер mail.letar.best доступен')
    console.log('   - Порт 587 открыт')
    console.log('   - Пароль SMTP верный')
    process.exit(1)
  }
  console.log('✅ Подключение успешно\n')

  // Отправка тестового письма
  console.log('2️⃣ Отправка тестового письма верификации...')
  const result = await sendVerificationEmail({
    to: targetEmail,
    userName: 'Тестовый пользователь',
    verificationUrl: 'https://letar.best/verify/test123',
    pin: '123456',
  })

  if (result.success) {
    console.log('✅ Письмо отправлено!')
    console.log(`   Message ID: ${result.messageId}`)
    console.log(`\n📬 Проверьте почту ${targetEmail}`)
    console.log('   (письмо может попасть в спам, если DNS ещё не настроен)')
  } else {
    console.error(`❌ Ошибка: ${result.error}`)
  }
}

main().catch(console.error)
