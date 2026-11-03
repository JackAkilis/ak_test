import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import {
  customerPlanLabels,
  customerStatusLabels,
  type Customer,
  type CustomerPlan,
  type CustomerStatus,
} from '@/contracts/customer'
import { formatDate, formatMoney } from '@/lib/utils'
import { Badge, type BadgeTone } from '@/components/ui/badge'

const planTone: Record<CustomerPlan, BadgeTone> = {
  free: 'gray',
  pro: 'blue',
  enterprise: 'violet',
}
const statusTone: Record<CustomerStatus, BadgeTone> = {
  trial: 'amber',
  active: 'green',
  churned: 'red',
}

const col = createColumnHelper<Customer>()

export const customerColumns = [
  col.accessor('name', {
    header: '客户',
    meta: { sortable: true },
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium text-slate-900">{row.original.name}</div>
        <div className="truncate text-xs text-slate-500">{row.original.email}</div>
      </div>
    ),
  }),
  col.accessor('company', { header: '公司', meta: { sortable: true } }),
  col.accessor('plan', {
    header: '套餐',
    cell: ({ getValue }) => (
      <Badge tone={planTone[getValue()]}>{customerPlanLabels[getValue()]}</Badge>
    ),
  }),
  col.accessor('status', {
    header: '状态',
    cell: ({ getValue }) => (
      <Badge tone={statusTone[getValue()]}>{customerStatusLabels[getValue()]}</Badge>
    ),
  }),
  col.accessor('mrr', {
    header: 'MRR',
    meta: { sortable: true, align: 'right' },
    cell: ({ getValue }) =>
      getValue() > 0 ? formatMoney(getValue()) : <span className="text-slate-400">—</span>,
  }),
  col.accessor('owner', { header: '负责人' }),
  col.accessor('createdAt', {
    header: '创建时间',
    meta: { sortable: true },
    cell: ({ getValue }) => <span className="text-slate-500">{formatDate(getValue())}</span>,
  }),
] as ColumnDef<Customer, unknown>[]
