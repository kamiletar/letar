/**
 * Базовый тест — точка расширения для будущих fixtures (route-моков и т.п.),
 * зеркалит структуру apps/grandslamcup-e2e/src/fixtures/base-test.ts.
 */

import { expect, test as base } from '@playwright/test'

export const test = base.extend({})

export { expect }
