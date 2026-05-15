import { Text, View } from '@react-pdf/renderer'

import type { SchoolData, StudentData } from '@letar/contract-generator'

import { contractStyles } from '../contract-styles'

interface SignatureBlockProps {
  school: SchoolData
  student: StudentData
}

/**
 * Блок подписей с реквизитами сторон
 */
export function SignatureBlock({ school, student }: SignatureBlockProps) {
  return (
    <View style={contractStyles.signaturesContainer}>
      {/* Исполнитель */}
      <View style={contractStyles.signatureBlock}>
        <Text style={contractStyles.signatureTitle}>ИСПОЛНИТЕЛЬ:</Text>

        <View style={contractStyles.requisites}>
          <Text style={contractStyles.textBold}>{school.fullName}</Text>

          <View style={{ marginTop: 6 }}>
            <RequisiteRow label="ИНН:" value={school.inn} />
            <RequisiteRow label="ОГРН:" value={school.ogrn} />
            {school.kpp && <RequisiteRow label="КПП:" value={school.kpp} />}
            <RequisiteRow label="Адрес:" value={school.legalAddress} />
            {school.phone && <RequisiteRow label="Тел:" value={school.phone} />}
            {school.email && <RequisiteRow label="Email:" value={school.email} />}
          </View>

          <Text style={[contractStyles.textBold, { marginTop: 8, fontSize: 9 }]}>Банковские реквизиты:</Text>
          <View style={{ marginTop: 2 }}>
            <RequisiteRow label="Банк:" value={school.bankName} />
            <RequisiteRow label="Р/с:" value={school.bankAccount} />
            <RequisiteRow label="К/с:" value={school.corrAccount} />
            <RequisiteRow label="БИК:" value={school.bankBik} />
          </View>
        </View>

        <View style={contractStyles.signatureLine} />
        <Text style={contractStyles.signatureLabel}>
          {school.directorPosition} / {school.directorName}
        </Text>
      </View>

      {/* Заказчик */}
      <View style={contractStyles.signatureBlock}>
        <Text style={contractStyles.signatureTitle}>ЗАКАЗЧИК:</Text>

        <View style={contractStyles.requisites}>
          <Text style={contractStyles.textBold}>{student.fullName}</Text>

          <View style={{ marginTop: 6 }}>
            <RequisiteRow label="Паспорт:" value={`${student.passport.series} ${student.passport.number}`} />
            <RequisiteRow label="Выдан:" value={student.passport.issuedBy} />
            <RequisiteRow label="Дата:" value={student.passport.issuedAt} />
            <RequisiteRow label="Код:" value={student.passport.departmentCode} />
            <RequisiteRow label="Адрес:" value={student.registrationAddress} />
            {student.phone && <RequisiteRow label="Тел:" value={student.phone} />}
            {student.email && <RequisiteRow label="Email:" value={student.email} />}
          </View>
        </View>

        <View style={contractStyles.signatureLine} />
        <Text style={contractStyles.signatureLabel}>Подпись / {student.fullName}</Text>
      </View>
    </View>
  )
}

/**
 * Строка реквизита (label: value)
 */
function RequisiteRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={contractStyles.requisiteRow}>
      <Text style={contractStyles.requisiteLabel}>{label}</Text>
      <Text style={contractStyles.requisiteValue}>{value}</Text>
    </View>
  )
}
