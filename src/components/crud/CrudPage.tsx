import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import type { ListQuery, Option } from '@/contracts/common'
import type { CrudHooks } from '@/lib/crud-hooks'
import { ApiError } from '@/lib/http'
import { DataTable, useListQueryState } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmDialog, Drawer } from '@/components/ui/overlay'
import { PageHeader } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast-context'
import { useDebouncedValue } from './useDebouncedValue'

/** 模块表单组件需实现的 props 契约 */
export interface EntityFormProps<TEntity, TInput> {
  mode: 'create' | 'edit'
  /** 编辑时的当前实体 */
  entity?: TEntity
  /** 提交：返回 Promise，CrudPage 负责 loading / 关闭 / toast；抛出的 ApiError 由表单映射字段错误 */
  onSubmit: (input: TInput) => Promise<void>
  onCancel: () => void
  submitting: boolean
}

export interface FilterDef<TQuery> {
  name: keyof TQuery & string
  label: string
  options: Option[]
}

export interface CrudPageProps<TEntity extends { id: string }, TInput, TQuery extends ListQuery> {
  hooks: CrudHooks<TEntity, TInput, TQuery>
  columns: ColumnDef<TEntity, unknown>[]
  FormComponent: ComponentType<EntityFormProps<TEntity, TInput>>
  /** 用于确认删除、toast 文案 */
  getLabel: (entity: TEntity) => string
  filters?: FilterDef<TQuery>[]
  searchPlaceholder?: string
  description?: string
  /** 允许的操作，默认全开 */
  can?: { create?: boolean; edit?: boolean; remove?: boolean }
  drawerWidth?: 'md' | 'lg'
}

type DrawerState<T> =
  { open: false } | { open: true; mode: 'create' } | { open: true; mode: 'edit'; entity: T }

/**
 * 通用 CRUD 页面：标题栏 + 搜索/过滤 + 服务端分页排序表格 + 新建/编辑抽屉 + 删除确认。
 * 业务模块只需提供：hooks（由契约生成）、列定义、表单组件。
 */
export function CrudPage<TEntity extends { id: string }, TInput, TQuery extends ListQuery>({
  hooks,
  columns,
  FormComponent,
  getLabel,
  filters = [],
  searchPlaceholder,
  description,
  can = {},
  drawerWidth = 'md',
}: CrudPageProps<TEntity, TInput, TQuery>) {
  const { resource } = hooks
  const { create = true, edit = true, remove = true } = can
  const toast = useToast()

  const { query, setQuery, reset } = useListQueryState<TQuery>(resource.query)
  const list = hooks.useList(query)
  const createMutation = hooks.useCreate()
  const updateMutation = hooks.useUpdate()
  const removeMutation = hooks.useRemove()

  // 搜索框本地状态 + 防抖同步到 URL
  const [keyword, setKeyword] = useState(query.q ?? '')
  const [syncedQ, setSyncedQ] = useState(query.q)
  const debounced = useDebouncedValue(keyword, 300)
  // URL 被外部改变（后退 / 重置）且输入框处于稳定态时，把输入框同步为 URL 的值
  if (query.q !== syncedQ) {
    setSyncedQ(query.q)
    if (debounced === keyword) setKeyword(query.q ?? '')
  }
  useEffect(() => {
    if ((debounced || undefined) !== (query.q || undefined))
      setQuery({ q: debounced || undefined } as Partial<TQuery>)
  }, [debounced, query.q, setQuery])

  const [drawer, setDrawer] = useState<DrawerState<TEntity>>({ open: false })
  const [pendingDelete, setPendingDelete] = useState<TEntity | null>(null)
  const closeDrawer = useCallback(() => setDrawer({ open: false }), [])

  const handleSubmit = useCallback(
    async (input: TInput) => {
      if (!drawer.open) return
      if (drawer.mode === 'create') {
        const created = await createMutation.mutateAsync(input)
        toast.success(`${resource.label}「${getLabel(created)}」已创建`)
      } else {
        const updated = await updateMutation.mutateAsync({ id: drawer.entity.id, input })
        toast.success(`${resource.label}「${getLabel(updated)}」已更新`)
      }
      closeDrawer()
    },
    [drawer, createMutation, updateMutation, toast, resource.label, getLabel, closeDrawer],
  )

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return
    try {
      await removeMutation.mutateAsync(pendingDelete.id)
      toast.success(`${resource.label}「${getLabel(pendingDelete)}」已删除`)
      setPendingDelete(null)
    } catch (err) {
      toast.error('删除失败', ApiError.is(err) ? err.message : '请稍后重试')
    }
  }, [pendingDelete, removeMutation, toast, resource.label, getLabel])

  const allColumns = useMemo<ColumnDef<TEntity, unknown>[]>(() => {
    if (!edit && !remove) return columns
    return [
      ...columns,
      {
        id: '__actions',
        header: () => <span className="sr-only">操作</span>,
        meta: { align: 'right', width: 'w-28' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {edit && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`编辑 ${getLabel(row.original)}`}
                onClick={() => setDrawer({ open: true, mode: 'edit', entity: row.original })}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {remove && (
              <Button
                variant="ghost"
                size="icon"
                className="hover:text-red-600"
                aria-label={`删除 ${getLabel(row.original)}`}
                onClick={() => setPendingDelete(row.original)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ]
  }, [columns, edit, remove, getLabel])

  const hasActiveFilter = Boolean(query.q) || filters.some((f) => query[f.name] !== undefined)
  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <div data-testid={`crud-page-${resource.name}`}>
      <PageHeader
        title={`${resource.label}管理`}
        description={description}
        actions={
          create && (
            <Button onClick={() => setDrawer({ open: true, mode: 'create' })}>
              <Plus className="h-4 w-4" />
              新建{resource.label}
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            aria-label="搜索"
            placeholder={searchPlaceholder ?? `搜索${resource.label}…`}
            className="pl-9"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        {filters.map((f) => (
          <Select
            key={f.name}
            aria-label={f.label}
            className="w-36"
            value={(query[f.name] as string | undefined) ?? ''}
            onChange={(e) => setQuery({ [f.name]: e.target.value || undefined } as Partial<TQuery>)}
            placeholder={`全部${f.label}`}
            options={f.options}
          />
        ))}
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setKeyword('')
              reset()
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        )}
      </div>

      <DataTable
        columns={allColumns}
        data={list.data?.data}
        getRowId={(row) => row.id}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        sort={{
          field: query.sort ?? resource.defaultSort.field,
          order: query.order ?? resource.defaultSort.order,
        }}
        onSortChange={(field, order) => setQuery({ sort: field, order } as Partial<TQuery>)}
        pagination={{
          page: list.data?.page ?? query.page,
          pageSize: list.data?.pageSize ?? query.pageSize,
          total: list.data?.total ?? 0,
          onPageChange: (page) => setQuery({ page } as Partial<TQuery>),
          onPageSizeChange: (pageSize) => setQuery({ pageSize } as Partial<TQuery>),
        }}
        empty={{
          title: hasActiveFilter ? `没有符合条件的${resource.label}` : `还没有${resource.label}`,
          description: hasActiveFilter ? '试试调整搜索或过滤条件' : undefined,
          action:
            !hasActiveFilter && create ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDrawer({ open: true, mode: 'create' })}
              >
                <Plus className="h-4 w-4" />
                新建{resource.label}
              </Button>
            ) : undefined,
        }}
        onRowClick={
          edit ? (row) => setDrawer({ open: true, mode: 'edit', entity: row }) : undefined
        }
      />

      <Drawer
        open={drawer.open}
        onClose={closeDrawer}
        locked={submitting}
        width={drawerWidth}
        title={
          drawer.open && drawer.mode === 'edit' ? `编辑${resource.label}` : `新建${resource.label}`
        }
        description={
          drawer.open && drawer.mode === 'edit'
            ? getLabel(drawer.entity)
            : `填写以下信息以创建${resource.label}`
        }
      >
        {drawer.open && (
          <FormComponent
            key={drawer.mode === 'edit' ? drawer.entity.id : 'create'}
            mode={drawer.mode}
            entity={drawer.mode === 'edit' ? drawer.entity : undefined}
            onSubmit={handleSubmit}
            onCancel={closeDrawer}
            submitting={submitting}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title={`删除${resource.label}`}
        description={
          pendingDelete ? `确定要删除「${getLabel(pendingDelete)}」吗？此操作不可撤销。` : undefined
        }
        confirmText="删除"
        loading={removeMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
