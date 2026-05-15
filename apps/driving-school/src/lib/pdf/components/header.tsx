import { Text, View } from '@react-pdf/renderer'

import { contractStyles } from '../contract-styles'

interface ContractHeaderProps {
  contractNumber: string
  contractDate: string
  city: string
}

/**
 * Заголовок договора
 * "ДОГОВОР № X на оказание платных образовательных услуг"
 */
export function ContractHeader({ contractNumber, contractDate, city }: ContractHeaderProps) {
  return (
    <>
      <View style={contractStyles.header}>
        <Text style={contractStyles.title}>ДОГОВОР № {contractNumber}</Text>
        <Text style={contractStyles.subtitle}>на оказание платных образовательных услуг</Text>
      </View>

      <View style={contractStyles.dateCityRow}>
        <Text style={contractStyles.dateCity}>г. {city}</Text>
        <Text style={contractStyles.dateCity}>{contractDate}</Text>
      </View>
    </>
  )
}
