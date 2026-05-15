/**
 * Шаблон договора по умолчанию
 *
 * Этот файл НЕ использует Puppeteer и безопасен для импорта в клиентский код.
 */

/**
 * Создаёт шаблон по умолчанию для договора на обучение
 */
export function createDefaultTrainingContractTemplate(): string {
  return `
<div class="contract-header">
  <h1>ДОГОВОР № {{contract.number}}</h1>
  <p>на оказание платных образовательных услуг</p>
</div>

<div class="contract-date-city">
  <span>г. {{school.city}}</span>
  <span>{{contract.date}}</span>
</div>

<div class="contract-parties">
  <p style="text-indent: 0; font-weight: bold; margin-bottom: 12pt;">Стороны договора:</p>
  <p><strong>ИСПОЛНИТЕЛЬ:</strong> {{school.fullLegalName}}, в лице директора {{school.directorName}}, действующего на основании Устава.</p>
  <p><strong>ИНН:</strong> {{school.inn}}, <strong>ОГРН:</strong> {{school.ogrn}}</p>
  <p><strong>Адрес:</strong> {{school.address}}</p>
  <p><strong>Телефон:</strong> {{school.phone}}, <strong>Email:</strong> {{school.email}}</p>
  <br>
  <p><strong>ЗАКАЗЧИК:</strong> {{student.fullName}}, {{student.dateOfBirth}}, паспорт: серия {{student.passport.series}} номер {{student.passport.number}}, выдан {{student.passport.issuedBy}}, {{student.passport.issueDate}}, код подразделения {{student.passport.departmentCode}}, адрес регистрации: {{student.passport.address}}.</p>
</div>

<div class="contract-section">
  <h2>1. ПРЕДМЕТ ДОГОВОРА</h2>
  <p>1.1. Исполнитель обязуется оказать Заказчику образовательные услуги по программе подготовки водителей транспортных средств категории {{contract.category}}, а Заказчик обязуется оплатить эти услуги.</p>
  <p>1.2. Срок обучения составляет {{contract.durationMonths}} месяцев.</p>
</div>

<div class="contract-section">
  <h2>2. СТОИМОСТЬ ОБУЧЕНИЯ И ПОРЯДОК ОПЛАТЫ</h2>
  <p>2.1. Стоимость обучения составляет {{contract.price}} рублей.</p>
  <p>2.2. Оплата производится в следующем порядке:</p>
  <p>- {{contract.paymentSchedule}}</p>
</div>

<div class="contract-section">
  <h2>3. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h2>
  <p>3.1. Исполнитель обязан:</p>
  <p>- Обеспечить надлежащее качество образовательных услуг;</p>
  <p>- Предоставить необходимые учебные материалы;</p>
  <p>- Обеспечить безопасность учебного процесса.</p>
  <br>
  <p>3.2. Заказчик обязан:</p>
  <p>- Своевременно вносить плату за обучение;</p>
  <p>- Посещать занятия по установленному расписанию;</p>
  <p>- Соблюдать правила внутреннего распорядка автошколы.</p>
</div>

<div class="contract-section">
  <h2>4. СРОК ДЕЙСТВИЯ ДОГОВОРА</h2>
  <p>4.1. Договор вступает в силу с момента его подписания и действует до полного исполнения сторонами своих обязательств.</p>
</div>

<div class="contract-section">
  <h2>5. ПРОЧИЕ УСЛОВИЯ</h2>
  <p>5.1. Договор составлен в двух экземплярах, имеющих равную юридическую силу, по одному для каждой из сторон.</p>
  <p>5.2. Все изменения и дополнения к настоящему договору действительны только в том случае, если они совершены в письменной форме и подписаны обеими сторонами.</p>
</div>
`
}
