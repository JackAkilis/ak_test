import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { orderStatusLabels, type Order, type OrderStatus } from '@/contracts/order'
import { formatDateTime, formatMoney } from '@/lib/utils'
import { Badge, type BadgeTone } from '@/components/ui/badge'

export const orderStatusTone: Record<OrderStatus, BadgeTone> = {
  pending: 'amber',
  paid: 'green',
  refunded: 'violet',
  cancelled: 'gray',
}

const col = createColumnHelper<Order>()

export const orderColumns = [
  col.accessor('orderNo', {
    header: '订单号',
    meta: { sortable: true },
    cell: ({ getValue }) => (
      <span className="font-mono text-xs whitespace-nowrap text-slate-700">{getValue()}</span>
    ),
  }),
  col.accessor('customerName', {
    header: '客户',
    meta: { sortable: true },
    cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
  }),
  col.accessor('product', { header: '商品 / 套餐' }),
  col.accessor('amount', {
    header: '金额',
    meta: { sortable: true, align: 'right' },
    cell: ({ row }) => (
      <span className="font-medium text-slate-900">
        {formatMoney(row.original.amount, row.original.currency)}
      </span>
    ),
  }),
  col.accessor('status', {
    header: '状态',
    cell: ({ getValue }) => (
      <Badge tone={orderStatusTone[getValue()]}>{orderStatusLabels[getValue()]}</Badge>
    ),
  }),
  col.accessor('paidAt', {
    header: '支付时间',
    cell: ({ getValue }) => <span className="text-slate-500">{formatDateTime(getValue())}</span>,
  }),
  col.accessor('createdAt', {
    header: '创建时间',
    meta: { sortable: true },
    cell: ({ getValue }) => <span className="text-slate-500">{formatDateTime(getValue())}</span>,
  }),
] as ColumnDef<Order, unknown>[]
