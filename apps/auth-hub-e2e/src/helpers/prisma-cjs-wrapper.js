/**
 * Тонкая обёртка над общей фабрикой @letar/e2e-testing/prisma-cjs-wrapper —
 * фиксирует путь к generated-клиенту конкретно auth-hub.
 */
const path = require('path')
const { createPrismaCjsWrapper } = require('@letar/e2e-testing/prisma-cjs-wrapper')

const generatedDir = path.resolve(__dirname, '../../../auth-hub/src/generated/prisma')

module.exports = createPrismaCjsWrapper(generatedDir)
