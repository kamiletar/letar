'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Heading,
  HStack,
  IconButton,
  Input,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { memo, useState } from 'react'
import { LuDownload, LuPencil, LuPlus, LuSearch, LuTrash2, LuUpload, LuX } from 'react-icons/lu'
import type * as XLSXType from 'xlsx'
import {
  type ProductCreateForm,
  ProductCreateFormSchema,
  ProductUpdateFormSchema,
} from '../../../src/generated/form-schemas'
import type { Product } from '../../../src/generated/prisma'
import { useCreateProduct, useDeleteProduct, useFindManyProduct, useUpdateProduct } from '../../lib/hooks'
import { AppEmptyState } from '../_components/ui/empty-state'
import { toaster } from '../_components/ui/toaster'

/** Мемоизированная строка таблицы товаров — предотвращает лишние ререндеры */
const ProductRow = memo(function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}) {
  return (
    <Table.Row>
      <Table.Cell>
        <Badge fontFamily="mono" fontSize="sm">
          {product.gtin}
        </Badge>
      </Table.Cell>
      <Table.Cell fontWeight="medium">{product.name}</Table.Cell>
      <Table.Cell>
        {product.articleCode && (
          <Badge variant="subtle" colorPalette="gray">
            {product.articleCode}
          </Badge>
        )}
      </Table.Cell>
      <Table.Cell fontSize="sm" color="fg.muted">
        {product.composition || '—'}
      </Table.Cell>
      <Table.Cell fontSize="sm" color="fg.muted">
        {product.color || '—'}
      </Table.Cell>
      <Table.Cell>
        <HStack gap={1}>
          <IconButton aria-label="Редактировать" variant="ghost" size="sm" onClick={() => onEdit(product)}>
            <LuPencil />
          </IconButton>
          <IconButton
            aria-label="Удалить"
            variant="ghost"
            size="sm"
            colorPalette="red"
            onClick={() => onDelete(product)}
          >
            <LuTrash2 />
          </IconButton>
        </HStack>
      </Table.Cell>
    </Table.Row>
  )
})

/** Структура импортируемого товара */
interface ImportedProduct {
  gtin: string
  name: string
  articleCode?: string
  composition?: string
  color?: string
  manufacturer?: string
  category?: string
}

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importData, setImportData] = useState<ImportedProduct[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Запросы
  const {
    data: products,
    isLoading,
    refetch,
  } = useFindManyProduct({
    where: search
      ? {
          OR: [{ gtin: { contains: search } }, { name: { contains: search } }, { articleCode: { contains: search } }],
        }
      : undefined,
    orderBy: { updatedAt: 'desc' },
  })

  // Мутации
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()

  // Создание товара
  const handleCreate = async (data: ProductCreateForm) => {
    try {
      await createMutation.mutateAsync({ data })
      toaster.success({ title: 'Товар добавлен', closable: true })
      setIsCreateOpen(false)
      refetch()
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось добавить товар',
        closable: true,
      })
    }
  }

  // Обновление товара
  const handleUpdate = async (data: Partial<ProductCreateForm>) => {
    if (!editingProduct) {
      return
    }
    try {
      await updateMutation.mutateAsync({
        where: { id: editingProduct.id },
        data,
      })
      toaster.success({ title: 'Товар обновлён', closable: true })
      setEditingProduct(null)
      refetch()
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить товар',
        closable: true,
      })
    }
  }

  // Удаление товара
  const handleDelete = async (product: Product) => {
    if (!confirm(`Удалить товар "${product.name}"?`)) {
      return
    }
    try {
      await deleteMutation.mutateAsync({ where: { id: product.id } })
      toaster.success({ title: 'Товар удалён', closable: true })
      refetch()
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить товар',
        closable: true,
      })
    }
  }

  // Обработка файла импорта (CSV/Excel)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setImportError(null)
    setImportData([])

    try {
      // Динамический импорт xlsx (~1.3 MB) — загружается только при использовании
      const XLSX: typeof XLSXType = await import('xlsx')
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet)

      // Маппинг колонок (поддержка разных названий)
      const mappedData: ImportedProduct[] = jsonData.map((row) => ({
        gtin: String(row['GTIN'] || row['gtin'] || row['Штрихкод'] || row['штрихкод'] || '').trim(),
        name: String(row['Название'] || row['название'] || row['Name'] || row['name'] || '').trim(),
        articleCode:
          String(row['Артикул'] || row['артикул'] || row['ArticleCode'] || row['articleCode'] || '').trim() ||
          undefined,
        composition:
          String(row['Состав'] || row['состав'] || row['Composition'] || row['composition'] || '').trim() || undefined,
        color: String(row['Цвет'] || row['цвет'] || row['Color'] || row['color'] || '').trim() || undefined,
        manufacturer:
          String(
            row['Производитель'] || row['производитель'] || row['Manufacturer'] || row['manufacturer'] || ''
          ).trim() || undefined,
        category:
          String(row['Категория'] || row['категория'] || row['Category'] || row['category'] || '').trim() || undefined,
      }))

      // Фильтруем только записи с GTIN и названием
      const validData = mappedData.filter((item) => item.gtin && item.name)

      if (validData.length === 0) {
        setImportError('Не найдено записей с GTIN и названием. Проверьте формат файла.')
        return
      }

      setImportData(validData)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Ошибка чтения файла')
    }

    // Сбрасываем input для повторной загрузки того же файла
    event.target.value = ''
  }

  // Импорт товаров в базу
  const handleImport = async () => {
    if (importData.length === 0) {
      return
    }

    setIsImporting(true)
    let successCount = 0
    let errorCount = 0

    for (const item of importData) {
      try {
        await createMutation.mutateAsync({ data: item })
        successCount++
      } catch {
        errorCount++
      }
    }

    setIsImporting(false)
    setIsImportOpen(false)
    setImportData([])
    refetch()

    if (errorCount === 0) {
      toaster.success({
        title: 'Импорт завершён',
        description: `Добавлено ${successCount} товаров`,
        closable: true,
      })
    } else {
      toaster.warning({
        title: 'Импорт завершён с ошибками',
        description: `Добавлено: ${successCount}, ошибок: ${errorCount} (возможно, дубликаты GTIN)`,
        closable: true,
      })
    }
  }

  // Скачивание шаблона CSV
  const handleDownloadTemplate = async () => {
    // Динамический импорт xlsx (~1.3 MB) — загружается только при использовании
    const XLSX: typeof XLSXType = await import('xlsx')
    const template = [
      ['GTIN', 'Название', 'Артикул', 'Состав', 'Цвет', 'Производитель', 'Категория'],
      ['4610000000007', 'Галстук Детский', 'ГМ', '100% полиэстер', 'разноцветный', 'Росстиль', 'Галстуки'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Товары')
    XLSX.writeFile(wb, 'products-template.xlsx')
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between">
          <Box>
            <Heading size="2xl" mb={2}>
              База товаров
            </Heading>
            <Text color="fg.muted">Управление справочником товаров по GTIN</Text>
          </Box>
          <HStack gap={2}>
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <LuUpload />
              Импорт
            </Button>
            <Button colorPalette="blue" onClick={() => setIsCreateOpen(true)}>
              <LuPlus />
              Добавить товар
            </Button>
          </HStack>
        </HStack>

        {/* Поиск */}
        <HStack>
          <Box position="relative" flex={1} maxW="400px">
            <Input
              placeholder="Поиск по GTIN, названию или артикулу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              pl={10}
            />
            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted">
              <LuSearch />
            </Box>
          </Box>
          {search && (
            <IconButton aria-label="Очистить поиск" variant="ghost" size="sm" onClick={() => setSearch('')}>
              <LuX />
            </IconButton>
          )}
        </HStack>

        {/* Таблица товаров */}
        <Card.Root>
          <Card.Body p={0}>
            {isLoading ? (
              <Box p={8} textAlign="center">
                <Text color="fg.muted">Загрузка...</Text>
              </Box>
            ) : !products?.length ? (
              <Box py={12}>
                <AppEmptyState
                  type="products"
                  action={
                    search
                      ? { label: 'Сбросить поиск', onClick: () => setSearch('') }
                      : { label: 'Добавить товар', onClick: () => setIsCreateOpen(true) }
                  }
                />
              </Box>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>GTIN</Table.ColumnHeader>
                    <Table.ColumnHeader>Название</Table.ColumnHeader>
                    <Table.ColumnHeader>Артикул</Table.ColumnHeader>
                    <Table.ColumnHeader>Состав</Table.ColumnHeader>
                    <Table.ColumnHeader>Цвет</Table.ColumnHeader>
                    <Table.ColumnHeader width="100px">Действия</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {products.map((product) => (
                    <ProductRow key={product.id} product={product} onEdit={setEditingProduct} onDelete={handleDelete} />
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Card.Body>
        </Card.Root>

        {/* Диалог создания */}
        <Dialog.Root open={isCreateOpen} onOpenChange={(e) => setIsCreateOpen(e.open)}>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="500px">
              <Dialog.Header>
                <Dialog.Title>Добавить товар</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Form
                  schema={ProductCreateFormSchema}
                  initialValue={{
                    gtin: '',
                    name: '',
                    articleCode: undefined,
                    composition: undefined,
                    color: undefined,
                    manufacturer: undefined,
                    category: undefined,
                  }}
                  onSubmit={handleCreate}
                >
                  <VStack gap={4} align="stretch">
                    <Form.Field.String name="gtin" />
                    <Form.Field.String name="name" />
                    <Form.Field.String name="articleCode" />
                    <Form.Field.String name="composition" />
                    <Form.Field.String name="color" />
                    <Form.Field.String name="manufacturer" />
                    <Form.Field.String name="category" />
                    <Form.Errors />
                    <HStack justify="flex-end" gap={2} pt={2}>
                      <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                        Отмена
                      </Button>
                      <Form.Button.Submit>{createMutation.isPending ? 'Добавление...' : 'Добавить'}</Form.Button.Submit>
                    </HStack>
                  </VStack>
                </Form>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>

        {/* Диалог редактирования */}
        <Dialog.Root open={!!editingProduct} onOpenChange={(e) => !e.open && setEditingProduct(null)}>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="500px">
              <Dialog.Header>
                <Dialog.Title>Редактировать товар</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {editingProduct && (
                  <Form
                    schema={ProductUpdateFormSchema}
                    initialValue={{
                      gtin: editingProduct.gtin,
                      name: editingProduct.name,
                      articleCode: editingProduct.articleCode ?? undefined,
                      composition: editingProduct.composition ?? undefined,
                      color: editingProduct.color ?? undefined,
                      manufacturer: editingProduct.manufacturer ?? undefined,
                      category: editingProduct.category ?? undefined,
                    }}
                    onSubmit={handleUpdate}
                  >
                    <VStack gap={4} align="stretch">
                      <Form.Field.String name="gtin" />
                      <Form.Field.String name="name" />
                      <Form.Field.String name="articleCode" />
                      <Form.Field.String name="composition" />
                      <Form.Field.String name="color" />
                      <Form.Field.String name="manufacturer" />
                      <Form.Field.String name="category" />
                      <Form.Errors />
                      <HStack justify="flex-end" gap={2} pt={2}>
                        <Button variant="ghost" onClick={() => setEditingProduct(null)}>
                          Отмена
                        </Button>
                        <Form.Button.Submit>
                          {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                        </Form.Button.Submit>
                      </HStack>
                    </VStack>
                  </Form>
                )}
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>

        {/* Диалог импорта */}
        <Dialog.Root open={isImportOpen} onOpenChange={(e) => !e.open && setIsImportOpen(false)} size="xl">
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="800px">
              <Dialog.Header>
                <Dialog.Title>Импорт товаров</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  {/* Инструкция и кнопки */}
                  <HStack justify="space-between" flexWrap="wrap" gap={2}>
                    <Text color="fg.muted" fontSize="sm">
                      Загрузите CSV или Excel файл с товарами. Обязательные колонки: GTIN, Название
                    </Text>
                    <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                      <LuDownload />
                      Скачать шаблон
                    </Button>
                  </HStack>

                  {/* Загрузка файла */}
                  <Box
                    border="2px dashed"
                    borderColor="border.muted"
                    borderRadius="md"
                    p={6}
                    textAlign="center"
                    position="relative"
                    _hover={{ borderColor: 'blue.500', bg: 'bg.subtle' }}
                    transition="all 0.2s"
                  >
                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      position="absolute"
                      inset={0}
                      opacity={0}
                      cursor="pointer"
                      onChange={handleFileUpload}
                    />
                    <VStack gap={2}>
                      <LuUpload size={32} />
                      <Text fontWeight="medium">Перетащите файл или нажмите для выбора</Text>
                      <Text fontSize="sm" color="fg.muted">
                        CSV, XLSX, XLS
                      </Text>
                    </VStack>
                  </Box>

                  {/* Ошибка */}
                  {importError && (
                    <Box bg="red.subtle" color="red.fg" p={3} borderRadius="md">
                      <Text fontSize="sm">{importError}</Text>
                    </Box>
                  )}

                  {/* Превью данных */}
                  {importData.length > 0 && (
                    <VStack gap={3} align="stretch">
                      <HStack justify="space-between">
                        <Text fontWeight="medium">Найдено товаров: {importData.length}</Text>
                        <Button variant="ghost" size="sm" colorPalette="red" onClick={() => setImportData([])}>
                          <LuX />
                          Очистить
                        </Button>
                      </HStack>
                      <Box
                        maxH="300px"
                        overflowY="auto"
                        border="1px solid"
                        borderColor="border.muted"
                        borderRadius="md"
                      >
                        <Table.Root size="sm">
                          <Table.Header>
                            <Table.Row>
                              <Table.ColumnHeader>GTIN</Table.ColumnHeader>
                              <Table.ColumnHeader>Название</Table.ColumnHeader>
                              <Table.ColumnHeader>Артикул</Table.ColumnHeader>
                              <Table.ColumnHeader>Состав</Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {importData.slice(0, 50).map((item, index) => (
                              <Table.Row key={index}>
                                <Table.Cell fontFamily="mono" fontSize="xs">
                                  {item.gtin}
                                </Table.Cell>
                                <Table.Cell fontSize="sm">{item.name}</Table.Cell>
                                <Table.Cell fontSize="sm" color="fg.muted">
                                  {item.articleCode || '—'}
                                </Table.Cell>
                                <Table.Cell fontSize="sm" color="fg.muted">
                                  {item.composition || '—'}
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                      {importData.length > 50 && (
                        <Text fontSize="sm" color="fg.muted" textAlign="center">
                          ...и ещё {importData.length - 50} товаров
                        </Text>
                      )}
                    </VStack>
                  )}

                  {/* Кнопки действий */}
                  <HStack justify="flex-end" gap={2} pt={2}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsImportOpen(false)
                        setImportData([])
                        setImportError(null)
                      }}
                    >
                      Отмена
                    </Button>
                    <Button
                      colorPalette="blue"
                      disabled={importData.length === 0 || isImporting}
                      onClick={handleImport}
                    >
                      {isImporting ? 'Импорт...' : `Импортировать ${importData.length} товаров`}
                    </Button>
                  </HStack>
                </VStack>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </VStack>
    </Container>
  )
}
