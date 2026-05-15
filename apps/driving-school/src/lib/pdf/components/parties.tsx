import { Text, View } from '@react-pdf/renderer'

import type { SchoolData, StudentData } from '@letar/contract-generator'

import { contractStyles } from '../contract-styles'

interface ContractPartiesProps {
  school: SchoolData
  student: StudentData
}

/**
 * Блок сторон договора
 * ИСПОЛНИТЕЛЬ и ЗАКАЗЧИК с их реквизитами
 */
export function ContractParties({ school, student }: ContractPartiesProps) {
  return (
    <View style={contractStyles.preamble}>
      <Text style={contractStyles.textBold}>Стороны договора:</Text>

      {/* Исполнитель */}
      <View style={{ marginTop: 8 }}>
        <Text style={contractStyles.preambleText}>
          <Text style={contractStyles.bold}>ИСПОЛНИТЕЛЬ:</Text>
          {school.fullName}, в лице {school.directorPosition.toLowerCase()} {school.directorName}, действующего на
          основании {school.basis}.
        </Text>
        <Text style={[contractStyles.preambleText, { marginTop: 4 }]}>
          <Text style={contractStyles.bold}>ИНН:</Text>
          {school.inn}, <Text style={contractStyles.bold}>ОГРН:</Text>
          {school.ogrn}
          {school.kpp && (
            <>
              , <Text style={contractStyles.bold}>КПП:</Text>
              {school.kpp}
            </>
          )}
        </Text>
        <Text style={[contractStyles.preambleText, { marginTop: 2 }]}>
          <Text style={contractStyles.bold}>Адрес:</Text>
          {school.legalAddress}
        </Text>
        {(school.phone || school.email) && (
          <Text style={[contractStyles.preambleText, { marginTop: 2 }]}>
            {school.phone && (
              <>
                <Text style={contractStyles.bold}>Тел:</Text>
                {school.phone}
              </>
            )}
            {school.phone && school.email && ', '}
            {school.email && (
              <>
                <Text style={contractStyles.bold}>Email:</Text>
                {school.email}
              </>
            )}
          </Text>
        )}
      </View>

      {/* Заказчик */}
      <View style={{ marginTop: 12 }}>
        <Text style={contractStyles.preambleText}>
          <Text style={contractStyles.bold}>ЗАКАЗЧИК:</Text>
          {student.fullName}, дата рождения: {student.birthdate}
        </Text>
        <Text style={[contractStyles.preambleText, { marginTop: 2 }]}>
          <Text style={contractStyles.bold}>Паспорт:</Text>
          серия {student.passport.series} номер {student.passport.number}, выдан {student.passport.issuedBy},{' '}
          {student.passport.issuedAt}, код подразделения {student.passport.departmentCode}
        </Text>
        <Text style={[contractStyles.preambleText, { marginTop: 2 }]}>
          <Text style={contractStyles.bold}>Адрес регистрации:</Text>
          {student.registrationAddress}
        </Text>
        {(student.phone || student.email) && (
          <Text style={[contractStyles.preambleText, { marginTop: 2 }]}>
            {student.phone && (
              <>
                <Text style={contractStyles.bold}>Тел:</Text>
                {student.phone}
              </>
            )}
            {student.phone && student.email && ', '}
            {student.email && (
              <>
                <Text style={contractStyles.bold}>Email:</Text>
                {student.email}
              </>
            )}
          </Text>
        )}

        {/* Законный представитель для несовершеннолетних */}
        {student.isMinor && student.representative && (
          <View style={{ marginTop: 8 }}>
            <Text style={contractStyles.preambleText}>
              <Text style={contractStyles.bold}>Законный представитель ({student.representative.relationship}):</Text>
              {student.representative.fullName}
            </Text>
            <Text style={[contractStyles.preambleText, { marginTop: 2 }]}>
              <Text style={contractStyles.bold}>Паспорт:</Text>
              серия {student.representative.passport.series} номер {student.representative.passport.number}, выдан{' '}
              {student.representative.passport.issuedBy}, {student.representative.passport.issuedAt}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}
