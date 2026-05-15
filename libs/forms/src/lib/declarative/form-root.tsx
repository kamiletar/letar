'use client'

/**
 * Реэкспорт из модульной структуры for backward compatibility.
 *
 * Componentы теперь организованы в:
 * - form-root/index.tsx - FormRoot, Form
 * - form-root/form-simple.tsx - FormSimple
 * - form-root/form-with-api.tsx - FormWithApi
 * - form-root/form-validators.ts - buildValidators
 * - form-root/form-compound-types.ts - typeы compound componentов
 * - form-root/form-loading-state.tsx - FormLoadingState
 * - form-root/use-form-features.ts - общий хук для persistence и offline
 */
export * from './form-root/index'
