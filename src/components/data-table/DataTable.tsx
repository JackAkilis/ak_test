import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SortOrder } from '@/contracts/common'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { Pagination } from './Pagination'

export type { ColumnDef }

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[] | undefined
  getRowId: (row: T) => string
  /** 首次加载 */
  isLoading?: boolean
  /** 已有数据、后台刷新中 */
  isFetching?: boolean
  error?: Error | null
  onRetry?: () => void
  /** 服务端排序：当前排序字段与方向 */
  sort?: { field?: string; order?: SortOrder }
  onSortChange?: (field: string, order: SortOrder) => void
  /** 服务端分页 */
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (size: number) => void
  }
  empty?: { title: string; description?: string; action?: ReactNode }
  onRowClick?: (row: T) => void
  className?: string
  /** 是否渲染外层卡片（用于嵌入其它卡片时关闭） */
  bare?: boolean
}

/**
 * 通用数据表：服务端排序 + 分页，自带加载 / 空 / 错误三态。
 * 列定义使用 TanStack Table 的 ColumnDef；在 meta 中用 `sortable: true` 开启排序，
 * `align: 'right'` 右对齐（金额等数值列），`width` 指定列宽 class。
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading,
  isFetching,
  error,
  onRetry,
  sort,
  onSortChange,
  pagination,
  empty,
  onRowClick,
  className,
  bare,
}: DataTableProps<T>) {
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualSorting: true,
    manualPagination: true,
  })

  const rows = table.getRowModel().rows
  const showSkeleton = isLoading && !data
  const showEmpty = !showSkeleton && !error && rows.length === 0

  return (
    <div
      className={cn(
        !bare && 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs',
        className,
      )}
    >
      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs tracking-wide text-slate-500 uppercase">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const meta = (header.column.columnDef.meta ?? {}) as ColumnMeta
                  const field = meta.sortField ?? header.column.id
                  const sortable = Boolean(meta.sortable && onSortChange)
                  const active = sort?.field === field
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn(
                        'px-4 py-3 font-medium',
                        meta.width,
                        meta.align === 'right' && 'text-right',
                      )}
                      aria-sort={
                        active ? (sort?.order === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                    >
                      {sortable ? (
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1 rounded hover:text-slate-900',
                            active && 'text-slate-900',
                          )}
                          onClick={() =>
                            onSortChange!(field, active && sort?.order === 'asc' ? 'desc' : 'asc')
                          }
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {active ? (
                            sort?.order === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody
            className={cn(
              'divide-y divide-slate-100',
              isFetching && !showSkeleton && 'opacity-60 transition-opacity',
            )}
          >
            {showSkeleton &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_c, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))}
            {!showSkeleton &&
              rows.map((row: Row<T>) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn('hover:bg-slate-50/70', onRowClick && 'cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = (cell.column.columnDef.meta ?? {}) as ColumnMeta
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-4 py-3 text-slate-700',
                          meta.align === 'right' && 'text-right tabular-nums',
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
          </tbody>
        </table>

        {error && (
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
            title="加载失败"
            description={error.message}
            action={
              onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  重试
                </Button>
              )
            }
          />
        )}
        {showEmpty && (
          <EmptyState
            title={empty?.title ?? '暂无数据'}
            description={empty?.description}
            action={empty?.action}
          />
        )}
      </div>
      {pagination && (
        <div className="border-t border-slate-200 px-4 py-3">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  )
}

/** 列元信息（通过 ColumnDef.meta 传入） */
export interface ColumnMeta {
  sortable?: boolean
  /** 排序字段名，默认取 column.id */
  sortField?: string
  align?: 'left' | 'right'
  width?: string
}
