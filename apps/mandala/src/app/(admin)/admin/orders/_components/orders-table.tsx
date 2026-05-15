'use client'

import type { OrderStatus } from '@/generated/prisma'
import { Box, Checkbox, HStack, IconButton, Link, Table, Text } from '@chakra-ui/react'
import { type BulkAction, BulkActionsBar, StatusBadge, useSelection } from '@letar/admin-ui'
import { useRouter } from 'next/navigation'
import { LuEye } from 'react-icons/lu'
import { bulkUpdateOrderStatus } from '../_actions/bulk-actions'

interface OrderItem {
  id: string
  quantity: number
  product: {
    name: string
  }
}

interface Order {
  id: string
  name: string
  phone: string
  email: string | null
  total: number
  status: OrderStatus
  createdAt: Date
  items: OrderItem[]
}

interface OrdersTableProps {
  orders: Order[]
}

/**
 * Таблица заказов с поддержкой множественного выбора и bulk actions
 */
export function OrdersTable({ orders }: OrdersTableProps) {
  const router = useRouter()
  const orderIds = orders.map((o) => o.id)
  const selection = useSelection(orderIds)

  const handleBulkAction = async (action: (ids: string[]) => Promise<void>) => {
    await action(selection.selectedArray)
    selection.clear()
    router.refresh()
  }

  // Bulk actions для изменения статуса заказов
  const bulkActions: BulkAction[] = [
    {
      key: 'confirm',
      label: 'Подтвердить',
      colorPalette: 'blue',
      onClick: (ids) => handleBulkAction(() => bulkUpdateOrderStatus(ids, 'CONFIRMED')),
    },
    {
      key: 'ship',
      label: 'Отправить',
      colorPalette: 'purple',
      onClick: (ids) => handleBulkAction(() => bulkUpdateOrderStatus(ids, 'SHIPPED')),
    },
    {
      key: 'deliver',
      label: 'Доставлен',
      colorPalette: 'green',
      onClick: (ids) => handleBulkAction(() => bulkUpdateOrderStatus(ids, 'DELIVERED')),
    },
    {
      key: 'cancel',
      label: 'Отменить',
      colorPalette: 'red',
      onClick: (ids) => handleBulkAction(() => bulkUpdateOrderStatus(ids, 'CANCELLED')),
    },
  ]

  return (
    <>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="40px">
              <Checkbox.Root
                checked={selection.isAllSelected ? true : selection.isIndeterminate ? 'indeterminate' : false}
                onCheckedChange={() => selection.toggleAll()}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
              </Checkbox.Root>
            </Table.ColumnHeader>
            <Table.ColumnHeader>ID</Table.ColumnHeader>
            <Table.ColumnHeader>Дата</Table.ColumnHeader>
            <Table.ColumnHeader>Покупатель</Table.ColumnHeader>
            <Table.ColumnHeader>Товары</Table.ColumnHeader>
            <Table.ColumnHeader>Сумма</Table.ColumnHeader>
            <Table.ColumnHeader>Статус</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {orders.map((order) => (
            <Table.Row
              key={order.id}
              _hover={{ bg: 'whiteAlpha.50' }}
              bg={selection.isSelected(order.id) ? 'purple.900/30' : undefined}
            >
              <Table.Cell>
                <Checkbox.Root
                  checked={selection.isSelected(order.id)}
                  onCheckedChange={() => selection.toggle(order.id)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              </Table.Cell>
              <Table.Cell fontFamily="mono" fontSize="sm">
                {order.id.slice(0, 8)}...
              </Table.Cell>
              <Table.Cell>
                {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Table.Cell>
              <Table.Cell>
                <Box>
                  <Text fontWeight="medium">{order.name}</Text>
                  <Text fontSize="sm" color="fg.muted">
                    {order.phone}
                  </Text>
                </Box>
              </Table.Cell>
              <Table.Cell>
                <Box>
                  <Text>{order.items.length} шт</Text>
                  <Text fontSize="sm" color="fg.muted" truncate maxW="200px">
                    {order.items.map((item) => item.product.name).join(', ')}
                  </Text>
                </Box>
              </Table.Cell>
              <Table.Cell fontWeight="bold">{order.total} ₽</Table.Cell>
              <Table.Cell>
                <StatusBadge type="order" value={order.status} />
              </Table.Cell>
              <Table.Cell>
                <HStack gap={1} justify="flex-end">
                  <IconButton aria-label="Подробнее" variant="ghost" size="sm" asChild>
                    <Link href={`/admin/orders/${order.id}`}>
                      <LuEye />
                    </Link>
                  </IconButton>
                </HStack>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <BulkActionsBar
        selectedCount={selection.selectedCount}
        selectedIds={selection.selectedArray}
        onClear={selection.clear}
        actions={bulkActions}
      />
    </>
  )
}
