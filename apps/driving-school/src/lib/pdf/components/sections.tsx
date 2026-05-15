import { Text, View } from '@react-pdf/renderer'

import type { ContractData } from '@letar/contract-generator'

import { contractStyles } from '../contract-styles'

interface ContractSectionsProps {
  contract: ContractData
}

/**
 * Разделы договора (предмет, стоимость, права и обязанности, срок, прочее)
 */
export function ContractSections({ contract }: ContractSectionsProps) {
  return (
    <>
      {/* 1. ПРЕДМЕТ ДОГОВОРА */}
      <View style={contractStyles.section}>
        <Text style={contractStyles.sectionTitle}>1. ПРЕДМЕТ ДОГОВОРА</Text>
        <Text style={contractStyles.paragraph}>
          1.1. Исполнитель обязуется оказать Заказчику образовательные услуги по программе подготовки водителей
          транспортных средств категории «{contract.category}», а Заказчик обязуется оплатить эти услуги.
        </Text>
        <Text style={contractStyles.paragraph}>
          1.2. Форма обучения: очная. Срок обучения определяется в соответствии с учебным планом программы.
        </Text>
      </View>

      {/* 2. СТОИМОСТЬ ОБУЧЕНИЯ */}
      <View style={contractStyles.section}>
        <Text style={contractStyles.sectionTitle}>2. СТОИМОСТЬ ОБУЧЕНИЯ И ПОРЯДОК ОПЛАТЫ</Text>
        <Text style={contractStyles.paragraph}>
          2.1. Стоимость обучения составляет {contract.price.toLocaleString('ru-RU')} ({contract.priceWords}) рублей.
        </Text>
        <Text style={contractStyles.paragraph}>
          2.2. Оплата производится путём безналичного перечисления денежных средств на расчётный счёт Исполнителя или
          наличными в кассу.
        </Text>
        <Text style={contractStyles.paragraph}>2.3. Допускается рассрочка платежа по согласованию сторон.</Text>
      </View>

      {/* 3. ПРАВА И ОБЯЗАННОСТИ */}
      <View style={contractStyles.section}>
        <Text style={contractStyles.sectionTitle}>3. ПРАВА И ОБЯЗАННОСТИ СТОРОН</Text>

        <Text style={contractStyles.paragraph}>3.1. Исполнитель обязан:</Text>
        <View style={contractStyles.listItem}>
          <Text style={contractStyles.listNumber}>–</Text>
          <Text style={contractStyles.listText}>обеспечить надлежащее качество образовательных услуг;</Text>
        </View>
        <View style={contractStyles.listItem}>
          <Text style={contractStyles.listNumber}>–</Text>
          <Text style={contractStyles.listText}>предоставить необходимые учебные материалы;</Text>
        </View>
        <View style={contractStyles.listItem}>
          <Text style={contractStyles.listNumber}>–</Text>
          <Text style={contractStyles.listText}>обеспечить безопасность учебного процесса;</Text>
        </View>
        <View style={contractStyles.listItem}>
          <Text style={contractStyles.listNumber}>–</Text>
          <Text style={contractStyles.listText}>по окончании обучения выдать документы установленного образца.</Text>
        </View>

        <Text style={[contractStyles.paragraph, { marginTop: 8 }]}>3.2. Заказчик обязан:</Text>
        <View style={contractStyles.listItem}>
          <Text style={contractStyles.listNumber}>–</Text>
          <Text style={contractStyles.listText}>своевременно вносить плату за обучение;</Text>
        </View>
        <View style={contractStyles.listItem}>
          <Text style={contractStyles.listNumber}>–</Text>
          <Text style={contractStyles.listText}>посещать занятия по установленному расписанию;</Text>
        </View>
        <View style={contractStyles.listItem}>
          <Text style={contractStyles.listNumber}>–</Text>
          <Text style={contractStyles.listText}>соблюдать правила внутреннего распорядка автошколы;</Text>
        </View>
        <View style={contractStyles.listItem}>
          <Text style={contractStyles.listNumber}>–</Text>
          <Text style={contractStyles.listText}>выполнять требования техники безопасности.</Text>
        </View>
      </View>

      {/* 4. СРОК ДЕЙСТВИЯ */}
      <View style={contractStyles.section}>
        <Text style={contractStyles.sectionTitle}>4. СРОК ДЕЙСТВИЯ ДОГОВОРА</Text>
        <Text style={contractStyles.paragraph}>
          4.1. Договор вступает в силу с момента его подписания и действует до полного исполнения сторонами своих
          обязательств.
        </Text>
        <Text style={contractStyles.paragraph}>
          4.2. Договор может быть расторгнут по соглашению сторон или по инициативе одной из сторон с письменным
          уведомлением другой стороны за 14 дней.
        </Text>
      </View>

      {/* 5. ПРОЧИЕ УСЛОВИЯ */}
      <View style={contractStyles.section}>
        <Text style={contractStyles.sectionTitle}>5. ПРОЧИЕ УСЛОВИЯ</Text>
        <Text style={contractStyles.paragraph}>
          5.1. Договор составлен в двух экземплярах, имеющих равную юридическую силу, по одному для каждой из сторон.
        </Text>
        <Text style={contractStyles.paragraph}>
          5.2. Все изменения и дополнения к настоящему договору действительны только в том случае, если они совершены в
          письменной форме и подписаны обеими сторонами.
        </Text>
        <Text style={contractStyles.paragraph}>
          5.3. Стороны обязуются хранить в тайне персональные данные друг друга и не передавать их третьим лицам без
          согласия.
        </Text>
      </View>
    </>
  )
}
