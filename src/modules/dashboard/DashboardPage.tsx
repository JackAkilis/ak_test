import { useQuery } from '@tanstack/react-query'
import { ArrowRight, TrendingUp, Users, Wallet, ReceiptText } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { DashboardSummary } from '@/contracts/dashboard'
import { orderStatusLabels } from '@/contracts/order'
import { http } from '@/lib/http'
import { cn, formatMoney } from '@/lib/utils'
import { DataTable } from '@/components/data-table'
import { Card, PageHeader, Skeleton } from '@/components/ui/misc'
import { orderColumns, orderStatusTone } from '@/modules/orders/columns'

const barColor = {
  amber: 'bg-amber-400',
  green: 'bg-emerald-500',
  violet: 'bg-violet-400',
  gray: 'bg-slate-300',
  blue: 'bg-sky-400',
  red: 'bg-red-400',
} as const

export default function DashboardPage() {
  const summary = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: ({ signal }) => http<DashboardSummary>('/api/dashboard/summary', { signal }),
  })
  const s = summary.data

  return (
    <div>
      <PageHeader title="总览" description="Nimbus 订阅业务关键指标与最近动态" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="客户总数"
          value={s ? String(s.customerTotal) : undefined}
          hint={s ? `${s.activeCustomers} 已付费 · ${s.trialCustomers} 试用中` : undefined}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="MRR"
          value={s ? formatMoney(s.mrr) : undefined}
          hint="月度经常性收入"
          accent
        />
        <StatCard
          icon={<ReceiptText className="h-5 w-5" />}
          label="本月订单"
          value={s ? String(s.ordersThisMonth) : undefined}
          hint="自然月内创建"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="本月已支付（¥）"
          value={s ? formatMoney(s.revenueThisMonth) : undefined}
          hint="仅统计人民币订单"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900">订单状态分布</h2>
          <div className="mt-4 flex flex-col gap-3">
            {s
              ? s.statusBreakdown.map((item) => {
                  const total = s.statusBreakdown.reduce((n, x) => n + x.count, 0) || 1
                  const pct = Math.round((item.count / total) * 100)
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{orderStatusLabels[item.status]}</span>
                        <span className="text-slate-900 tabular-nums">
                          {item.count} <span className="text-slate-400">({pct}%)</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            barColor[orderStatusTone[item.status]],
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              : Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        </Card>

        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">最近订单</h2>
            <Link
              to="/orders"
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
            >
              查看全部 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <DataTable
            bare
            columns={orderColumns.filter(
              (c) =>
                !['paidAt', 'product'].includes((c as { accessorKey?: string }).accessorKey ?? ''),
            )}
            data={s?.recentOrders}
            getRowId={(o) => o.id}
            isLoading={summary.isLoading}
            error={summary.error}
            onRetry={() => summary.refetch()}
          />
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ReactNode
  label: string
  value?: string
  hint?: string
  accent?: boolean
}) {
  return (
    <Card
      className={cn('p-5', accent && 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-white')}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span
          className={cn(
            'rounded-md p-1.5',
            accent ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500',
          )}
        >
          {icon}
        </span>
      </div>
      {value === undefined ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {value}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}
