/**
 * Утилита для генерации PDF договора
 * Отделена от server action для корректной работы с JSX
 */

import { createElement } from 'react'

import type { TemplateData } from '@letar/contract-generator'
import { generatePdfFromReact } from '@letar/contract-generator/pdf-react'

import { ContractPDF } from './contract-pdf'

/**
 * Генерирует PDF договора из данных
 *
 * @param data - Данные для договора (ученик, школа, договор)
 * @returns Promise с PDF буфером
 */
export async function generateContractPdf(data: TemplateData) {
  // Используем createElement вместо JSX для совместимости с server actions
  const element = createElement(ContractPDF, { data })
  return generatePdfFromReact(element)
}
