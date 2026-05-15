import { ArchetypeFormSchema as ArchetypeSchema } from '@/generated/form-schemas/enums/Archetype.form'
import { ColorTypeFormSchema as ColorTypeSchema } from '@/generated/form-schemas/enums/ColorType.form'
import { z } from 'zod/v4'

/**
 * СХЕМЫ ВАЛИДАЦИИ ДЛЯ 5 ПРОФИЛЕЙ ДИАГНОСТИКИ ИМОТ
 * Используют .strip() для обработки React Server Actions service fields.
 */

// ============================================================================
// 1. НУМЕРОЛОГИЯ - Матрица судьбы
// ============================================================================

export const NumerologyProfileFormSchema = z
  .object({
    clientId: z.string(),

    // Матрица судьбы (числа от 1 до 22)
    lifePathNumber: z.coerce.number().min(1).max(22).optional(),
    destinyNumber: z.coerce.number().min(1).max(22).optional(),
    soulNumber: z.coerce.number().min(1).max(22).optional(),
    personalityNumber: z.coerce.number().min(1).max(22).optional(),
    maturityNumber: z.coerce.number().min(1).max(22).optional(),

    // Жизненные циклы
    currentCycle: z.string().optional(),
    cycleDescription: z.string().optional(),

    // Таланты и дары (JSON массивы)
    talents: z.string().optional(),
    gifts: z.string().optional(),

    // Предназначение
    purpose: z.string().optional(),

    // Кармические уроки
    karmicLessons: z.string().optional(),
    karmicDebts: z.string().optional(),

    // Расчетная матрица
    matrixData: z.string().optional(),

    // Заметки специалиста
    notes: z.string().optional(),
  })
  .strip()

export type NumerologyProfileFormData = z.infer<typeof NumerologyProfileFormSchema>

// ============================================================================
// 2. НЕЙРОПСИХОЛОГИЯ - Паттерны поведения
// ============================================================================

export const NeuroPsychProfileFormSchema = z
  .object({
    clientId: z.string(),

    // Паттерны поведения
    behaviorPatterns: z.string().optional(),

    // Когнитивные особенности
    cognitiveStyle: z.string().optional(),
    learningStyle: z.string().optional(),
    decisionMaking: z.string().optional(),

    // Защитные механизмы
    defenseMechanisms: z.string().optional(),
    copingStrategies: z.string().optional(),

    // Эмоциональное реагирование
    emotionalPatterns: z.string().optional(),
    triggers: z.string().optional(),

    // Ресурсные состояния
    resourceStates: z.string().optional(),
    strengths: z.string().optional(),

    // Заметки специалиста
    notes: z.string().optional(),
  })
  .strip()

export type NeuroPsychProfileFormData = z.infer<typeof NeuroPsychProfileFormSchema>

// ============================================================================
// 3. ЭНЕРГЕТИКА - 7 чакр и энергетическая карта
// ============================================================================

export const EnergyProfileFormSchema = z
  .object({
    clientId: z.string(),

    // Состояние 7 чакр (оценка 1-10)
    rootChakra: z.coerce.number().min(1).max(10).optional(),
    sacralChakra: z.coerce.number().min(1).max(10).optional(),
    solarPlexusChakra: z.coerce.number().min(1).max(10).optional(),
    heartChakra: z.coerce.number().min(1).max(10).optional(),
    throatChakra: z.coerce.number().min(1).max(10).optional(),
    thirdEyeChakra: z.coerce.number().min(1).max(10).optional(),
    crownChakra: z.coerce.number().min(1).max(10).optional(),

    // Энергетические блоки
    energyBlocks: z.string().optional(),
    blockageAreas: z.string().optional(),

    // Денежный канал
    moneyChannelLevel: z.coerce.number().min(1).max(10).optional(),
    moneyBlockages: z.string().optional(),

    // Энергия отношений
    relationshipEnergy: z.coerce.number().min(1).max(10).optional(),
    relationshipBlocks: z.string().optional(),

    // Жизненная сила
    vitalityLevel: z.coerce.number().min(1).max(10).optional(),
    energyLeaks: z.string().optional(),

    // Заметки специалиста
    notes: z.string().optional(),
  })
  .strip()

export type EnergyProfileFormData = z.infer<typeof EnergyProfileFormSchema>

// ============================================================================
// 4. ТЕЛО - Телесная карта и психосоматика
// ============================================================================

export const BodyProfileFormSchema = z
  .object({
    clientId: z.string(),

    // Карта зажимов
    tensionMap: z.string().optional(),
    tensionAreas: z.string().optional(),

    // Психосоматика
    psychosomaticIssues: z.string().optional(),
    symptoms: z.string().optional(),
    chronicConditions: z.string().optional(),

    // Паттерны дыхания
    breathingPatterns: z.string().optional(),
    breathingIssues: z.string().optional(),

    // Телесные ресурсы
    bodyResources: z.string().optional(),
    physicalStrengths: z.string().optional(),

    // Связь тело-психика
    bodyMindConnection: z.string().optional(),
    bodyMessages: z.string().optional(),

    // Заметки специалиста
    notes: z.string().optional(),
  })
  .strip()

export type BodyProfileFormData = z.infer<typeof BodyProfileFormSchema>

// ============================================================================
// 5. СТИЛЬ - Цветотип и архетип
// ============================================================================

export const StyleProfileFormSchema = z
  .object({
    clientId: z.string(),

    // Цветотип
    colorType: ColorTypeSchema.optional(),
    colorPalette: z.string().optional(),
    colorRecommendations: z.string().optional(),

    // Архетип
    primaryArchetype: ArchetypeSchema.optional(),
    secondaryArchetype: ArchetypeSchema.optional(),
    archetypeDescription: z.string().optional(),

    // Самовыражение
    selfExpression: z.string().optional(),
    authenticityLevel: z.coerce.number().min(1).max(10).optional(),

    // Внешнее = внутреннее
    innerOuterAlignment: z.string().optional(),
    styleConflicts: z.string().optional(),

    // Рекомендации
    styleRecommendations: z.string().optional(),

    // Заметки специалиста
    notes: z.string().optional(),
  })
  .strip()

export type StyleProfileFormData = z.infer<typeof StyleProfileFormSchema>
