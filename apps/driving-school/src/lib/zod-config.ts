import { z } from 'zod/v4'

/**
 * Настройка глобальной локализации ошибок Zod на русский язык.
 *
 * Импортируйте этот файл в корневой layout.tsx для применения.
 *
 * @see https://zod.dev/error-customization
 */

// Используем встроенную русскую локаль Zod v4
z.config(z.locales.ru())
