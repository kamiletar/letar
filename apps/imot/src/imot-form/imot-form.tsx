'use client'

/**
 * ImotForm — расширенный Form компонент для IMOT
 *
 * Включает:
 * - 7 Select компонентов для всех ENUM'ов приложения
 * - 3 Combobox компонента для асинхронного поиска моделей
 *
 * @example
 * ```tsx
 * import { ImotForm } from '@/imot-form'
 *
 * <ImotForm initialValue={data} onSubmit={handleSubmit}>
 *   <ImotForm.Field.String name="name" label="Имя" />
 *   <ImotForm.Select.Gender name="gender" label="Пол" />
 *   <ImotForm.Select.ColorType name="colorType" label="Цветотип" />
 *   <ImotForm.Select.Archetype name="archetype" label="Архетип" />
 *   <ImotForm.Combobox.Client name="clientId" label="Клиент" />
 *   <ImotForm.Button.Submit>Сохранить</ImotForm.Button.Submit>
 * </ImotForm>
 * ```
 */

import { createForm, type ExtendedForm } from '@letar/forms'

// Select компоненты для ENUM'ов
import {
  SelectArchetype,
  SelectChakraType,
  SelectColorType,
  SelectGender,
  SelectSessionStatus,
  SelectTransformationStage,
  SelectUserRole,
} from './selects'

// Combobox компоненты для асинхронного поиска
import { ComboboxClient, ComboboxPlan, ComboboxSession } from './comboboxes'

export const ImotForm: ExtendedForm = createForm({
  extraSelects: {
    // Справочники
    Gender: SelectGender,
    UserRole: SelectUserRole,

    // Статусы
    SessionStatus: SelectSessionStatus,
    TransformationStage: SelectTransformationStage,

    // Профили
    ColorType: SelectColorType,
    Archetype: SelectArchetype,
    ChakraType: SelectChakraType,
  },

  extraComboboxes: {
    Client: ComboboxClient,
    Session: ComboboxSession,
    Plan: ComboboxPlan,
  },
})
