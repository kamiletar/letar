import { Document, Page, Text, View } from '@react-pdf/renderer'
// oxlint-disable-next-line no-unassigned-import
import './fonts' // Регистрация шрифта Roboto с поддержкой кириллицы

import type { TemplateData } from '@letar/contract-generator'

import { ContractHeader } from './components/header'
import { ContractParties } from './components/parties'
import { ContractSections } from './components/sections'
import { SignatureBlock } from './components/signatures'
import { contractStyles } from './contract-styles'

interface ContractPDFProps {
  data: TemplateData
}

/**
 * PDF ДОКУМЕНТ: ДОГОВОР НА ОБУЧЕНИЕ
 * Использует @react-pdf/renderer для генерации PDF
 */
export function ContractPDF({ data }: ContractPDFProps) {
  const { student, school, contract } = data

  return (
    <Document
      title={`Договор № ${contract.number}`}
      author={school.name}
      subject="Договор на оказание платных образовательных услуг"
      language="ru"
    >
      <Page size="A4" style={contractStyles.page}>
        {/* Заголовок */}
        <ContractHeader contractNumber={contract.number} contractDate={contract.date} city={school.city || 'Москва'} />

        {/* Стороны договора */}
        <ContractParties school={school} student={student} />

        {/* Разделы договора */}
        <ContractSections contract={contract} />

        {/* Футер */}
        <View style={contractStyles.footer} fixed>
          <Text>{school.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `Страница ${pageNumber} из ${totalPages}`} />
        </View>
      </Page>

      {/* Вторая страница с подписями */}
      <Page size="A4" style={contractStyles.page}>
        {/* Блок подписей */}
        <SignatureBlock school={school} student={student} />

        {/* Футер */}
        <View style={contractStyles.footer} fixed>
          <Text>{school.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `Страница ${pageNumber} из ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
