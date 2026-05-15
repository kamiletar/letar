import { Box, Button, Card, Code, Container, Heading, Stack, Table, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LuBookOpen, LuZap } from 'react-icons/lu'

import { ColorModeButton } from '@/app/_components/ui/color-mode'

export const metadata: Metadata = {
  title: 'API для разработчиков | НаПрава.РФ',
  description: 'Документация Public API для интеграции с CRM-системами и внешними приложениями',
}

export default function DevelopersPage() {
  return (
    <Container maxW="container.lg" py={8} position="relative">
      {/* Кнопка переключения темы */}
      <Box position="absolute" top={4} right={4}>
        <ColorModeButton />
      </Box>

      <Stack gap={8}>
        {/* Заголовок */}
        <Box textAlign="center">
          <Heading size="2xl" mb={2}>
            Public API v1
          </Heading>
          <Text fontSize="lg" color="fg.muted" mb={4}>
            REST API для интеграции с вашими CRM-системами и приложениями
          </Text>
          <Stack direction="row" justify="center" gap={3}>
            <Button asChild colorPalette="brand" size="lg">
              <Link href="/api-docs">
                <LuBookOpen />
                Swagger UI
              </Link>
            </Button>
          </Stack>
        </Box>

        {/* Введение */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Возможности API</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              <Text>
                Public API позволяет автошколам интегрировать платформу со своими внутренними системами. API доступен
                только для чтения данных (GET запросы) и предоставляет доступ к следующим ресурсам:
              </Text>
              <Stack as="ul" gap={1} ps={6}>
                <Text as="li">/school — информация о школе</Text>
                <Text as="li">/schoolMembership — участники школы (ученики, инструкторы, администраторы)</Text>
                <Text as="li">/schoolLocation — локации школы</Text>
              </Stack>
              <Text fontSize="sm" color="fg.muted">
                API использует формат JSON:API. Дополнительные ресурсы будут добавляться по мере поступления запросов от
                пользователей.
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Авторизация */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Авторизация</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              <Text>Для доступа к API необходим API-ключ. Ключи создаются в настройках школы администратором.</Text>
              <Text>Передавайте ключ в заголовке каждого запроса:</Text>
              <Code p={4} borderRadius="md" display="block" whiteSpace="pre" fontSize="sm">
                {`X-API-Key: ds_live_xxxxxxxxxxxxx`}
              </Code>
              <Text fontSize="sm" color="fg.muted">
                API-ключ привязан к конкретной школе и даёт доступ только к её данным.
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Rate Limiting */}
        <Card.Root>
          <Card.Header>
            <Card.Title>
              <Stack direction="row" align="center" gap={2}>
                <LuZap />
                Rate Limiting
              </Stack>
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              <Text>Каждый API-ключ ограничен лимитом запросов для обеспечения стабильности сервиса:</Text>
              <Table.Root size="sm">
                <Table.Body>
                  <Table.Row>
                    <Table.Cell fontWeight="medium">Лимит</Table.Cell>
                    <Table.Cell>100 запросов в минуту</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell fontWeight="medium">Сброс</Table.Cell>
                    <Table.Cell>Каждую минуту</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
              <Text fontSize="sm" fontWeight="medium">
                Заголовки в ответе:
              </Text>
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Заголовок</Table.ColumnHeader>
                    <Table.ColumnHeader>Описание</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell>
                      <Code>X-RateLimit-Limit</Code>
                    </Table.Cell>
                    <Table.Cell>Максимум запросов в минуту</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell>
                      <Code>X-RateLimit-Remaining</Code>
                    </Table.Cell>
                    <Table.Cell>Осталось запросов</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell>
                      <Code>X-RateLimit-Reset</Code>
                    </Table.Cell>
                    <Table.Cell>Unix timestamp сброса лимита</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Базовый URL */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Базовый URL</Card.Title>
          </Card.Header>
          <Card.Body>
            <Code p={4} borderRadius="md" display="block" fontSize="sm">
              https://your-domain.ru/api/v1
            </Code>
          </Card.Body>
        </Card.Root>

        {/* Эндпоинты */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Эндпоинты</Card.Title>
            <Card.Description>
              Прямой доступ к моделям данных в формате JSON:API.{' '}
              <Link href="/api-docs" style={{ textDecoration: 'underline' }}>
                Полная спецификация в Swagger UI
              </Link>
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              {/* GET /school */}
              <Box>
                <Text fontWeight="bold" mb={2}>
                  GET /school
                </Text>
                <Text color="fg.muted" mb={3}>
                  Возвращает информацию о школе (автоматически фильтруется по API-ключу)
                </Text>
                <Text fontWeight="medium" mb={2} fontSize="sm">
                  Параметры (JSON:API):
                </Text>
                <Table.Root size="sm" mb={3}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Параметр</Table.ColumnHeader>
                      <Table.ColumnHeader>Пример</Table.ColumnHeader>
                      <Table.ColumnHeader>Описание</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell>
                        <Code>include</Code>
                      </Table.Cell>
                      <Table.Cell>
                        <Code>include=locations</Code>
                      </Table.Cell>
                      <Table.Cell>Включить связанные данные</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>
                        <Code>select</Code>
                      </Table.Cell>
                      <Table.Cell>
                        <Code>select=name,slug</Code>
                      </Table.Cell>
                      <Table.Cell>Выбрать конкретные поля</Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* GET /schoolMembership */}
              <Box>
                <Text fontWeight="bold" mb={2}>
                  GET /schoolMembership
                </Text>
                <Text color="fg.muted" mb={3}>
                  Возвращает список участников школы (ученики, инструкторы, администраторы)
                </Text>
                <Text fontWeight="medium" mb={2} fontSize="sm">
                  Параметры (JSON:API):
                </Text>
                <Table.Root size="sm" mb={3}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Параметр</Table.ColumnHeader>
                      <Table.ColumnHeader>Пример</Table.ColumnHeader>
                      <Table.ColumnHeader>Описание</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell>
                        <Code>filter[role]</Code>
                      </Table.Cell>
                      <Table.Cell>
                        <Code>filter[role]=STUDENT</Code>
                      </Table.Cell>
                      <Table.Cell>Фильтр по роли</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>
                        <Code>include</Code>
                      </Table.Cell>
                      <Table.Cell>
                        <Code>include=user</Code>
                      </Table.Cell>
                      <Table.Cell>Включить данные пользователя</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>
                        <Code>page[limit]</Code>
                      </Table.Cell>
                      <Table.Cell>
                        <Code>page[limit]=20</Code>
                      </Table.Cell>
                      <Table.Cell>Лимит записей</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>
                        <Code>page[offset]</Code>
                      </Table.Cell>
                      <Table.Cell>
                        <Code>page[offset]=40</Code>
                      </Table.Cell>
                      <Table.Cell>Смещение для пагинации</Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* GET /schoolLocation */}
              <Box>
                <Text fontWeight="bold" mb={2}>
                  GET /schoolLocation
                </Text>
                <Text color="fg.muted" mb={3}>
                  Возвращает список локаций (адресов) школы
                </Text>
              </Box>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Формат ответа */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Формат ответа</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              <Box>
                <Text fontWeight="medium" mb={2}>
                  Успешный ответ (JSON:API):
                </Text>
                <Code p={4} borderRadius="md" display="block" whiteSpace="pre" fontSize="sm">
                  {`{
  "data": [
    {
      "type": "schoolMembership",
      "id": "...",
      "attributes": { ... },
      "relationships": { ... }
    }
  ],
  "links": {
    "first": "/api/v1/schoolMembership?page[offset]=0",
    "next": "/api/v1/schoolMembership?page[offset]=20"
  }
}`}
                </Code>
              </Box>

              <Box>
                <Text fontWeight="medium" mb={2}>
                  Ответ с ошибкой:
                </Text>
                <Code p={4} borderRadius="md" display="block" whiteSpace="pre" fontSize="sm">
                  {`{
  "error": "Описание ошибки",
  "code": "ERROR_CODE"
}`}
                </Code>
              </Box>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Коды ошибок */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Коды ошибок</Card.Title>
          </Card.Header>
          <Card.Body>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>HTTP код</Table.ColumnHeader>
                  <Table.ColumnHeader>Код ошибки</Table.ColumnHeader>
                  <Table.ColumnHeader>Описание</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>401</Table.Cell>
                  <Table.Cell>
                    <Code>MISSING_KEY</Code>
                  </Table.Cell>
                  <Table.Cell>API-ключ не передан</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>401</Table.Cell>
                  <Table.Cell>
                    <Code>INVALID_KEY</Code>
                  </Table.Cell>
                  <Table.Cell>Неверный API-ключ</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>401</Table.Cell>
                  <Table.Cell>
                    <Code>REVOKED_KEY</Code>
                  </Table.Cell>
                  <Table.Cell>API-ключ отозван</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>404</Table.Cell>
                  <Table.Cell>
                    <Code>RESOURCE_NOT_FOUND</Code>
                  </Table.Cell>
                  <Table.Cell>Ресурс недоступен через API</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>405</Table.Cell>
                  <Table.Cell>
                    <Code>METHOD_NOT_ALLOWED</Code>
                  </Table.Cell>
                  <Table.Cell>HTTP метод не разрешён (используйте GET)</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>429</Table.Cell>
                  <Table.Cell>
                    <Code>RATE_LIMITED</Code>
                  </Table.Cell>
                  <Table.Cell>Превышен лимит запросов</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>500</Table.Cell>
                  <Table.Cell>
                    <Code>INTERNAL_ERROR</Code>
                  </Table.Cell>
                  <Table.Cell>Внутренняя ошибка сервера</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>

        {/* Примеры */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Примеры запросов</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              <Box>
                <Text fontWeight="medium" mb={2}>
                  cURL:
                </Text>
                <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
                  {`curl -X GET "https://your-domain.ru/api/v1/schoolMembership?filter[role]=STUDENT" \\
  -H "X-API-Key: ds_live_xxxxxxxxxxxxx"`}
                </Code>
              </Box>

              <Box>
                <Text fontWeight="medium" mb={2}>
                  JavaScript (fetch):
                </Text>
                <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
                  {`const response = await fetch(
  'https://your-domain.ru/api/v1/schoolMembership?filter[role]=STUDENT',
  {
    headers: {
      'X-API-Key': 'ds_live_xxxxxxxxxxxxx'
    }
  }
);
const data = await response.json();`}
                </Code>
              </Box>

              <Box>
                <Text fontWeight="medium" mb={2}>
                  Python (requests):
                </Text>
                <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
                  {`import requests

response = requests.get(
    'https://your-domain.ru/api/v1/schoolMembership',
    headers={'X-API-Key': 'ds_live_xxxxxxxxxxxxx'},
    params={'filter[role]': 'STUDENT'}
)
data = response.json()`}
                </Code>
              </Box>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Получение ключа */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Как получить API-ключ</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={3}>
              <Text>1. Войдите в систему как администратор школы</Text>
              <Text>2. Перейдите в Настройки школы → API-ключи</Text>
              <Text>3. Нажмите «Создать ключ» и укажите название (например, «CRM Integration»)</Text>
              <Text>4. Скопируйте ключ — он показывается только один раз</Text>
              <Text fontSize="sm" color="fg.muted" mt={2}>
                Храните ключ в безопасном месте. Если ключ скомпрометирован, немедленно отзовите его и создайте новый.
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Ссылки */}
        <Box pt={6} borderTopWidth="1px" borderColor="border.muted">
          <Stack gap={2}>
            <Stack direction="row" gap={4}>
              <Text fontSize="sm" color="fg.muted">
                <Link href="/api-docs" style={{ textDecoration: 'underline' }}>
                  Swagger UI (интерактивная документация)
                </Link>
              </Text>
              <Text fontSize="sm" color="fg.muted">
                <Link href="/" style={{ textDecoration: 'underline' }}>
                  Вернуться на главную
                </Link>
              </Text>
            </Stack>
            <Text fontSize="sm" color="fg.muted">
              Вопросы по API? Напишите нам в поддержку через личный кабинет.
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
}
