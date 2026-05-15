'use client'

import { createForm } from '@letar/forms'

/**
 * App-specific форма для НейроАбоИ.
 *
 * На MVP без extraSelects/Comboboxes — расширим, когда появятся доменные сущности
 * (категории дизайнов, регионы СДЭК, и т.д.).
 *
 * DaData токен передаётся в `<AboiForm.Field.Address token={...} />` напрямую —
 * не через addressProvider в createForm, чтобы не тащить createDaDataProvider
 * subpath-импортом (он не реэкспортирован в top-level @letar/forms).
 */
export const AboiForm = createForm()
