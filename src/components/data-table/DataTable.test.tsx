import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'

interface Row {
  id: string
  name: string
  amount: number
}
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: '名称', meta: { sortable: true } },
  { accessorKey: 'amount', header: '金额', meta: { sortable: true, align: 'right' } },
]
const data: Row[] = [
  { id: '1', name: '甲', amount: 10 },
  { id: '2', name: '乙', amount: 20 },
]

describe('DataTable', () => {
  it('渲染表头与数据行', () => {
    render(<DataTable columns={columns} data={data} getRowId={(r) => r.id} />)
    expect(screen.getByRole('columnheader', { name: /名称/ })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('乙')).toBeInTheDocument()
  })

  it('点击可排序列头触发 onSortChange，并在已升序时切换为降序', async () => {
    const onSortChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => r.id}
        sort={{ field: 'name', order: 'asc' }}
        onSortChange={onSortChange}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /名称/ }))
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc')
    await userEvent.click(screen.getByRole('button', { name: /金额/ }))
    expect(onSortChange).toHaveBeenCalledWith('amount', 'asc')
  })

  it('空数据显示空态，加载中显示骨架，错误显示重试', async () => {
    const { rerender } = render(
      <DataTable
        columns={columns}
        data={[]}
        getRowId={(r) => r.id}
        empty={{ title: '没有东西' }}
      />,
    )
    expect(screen.getByText('没有东西')).toBeInTheDocument()

    rerender(<DataTable columns={columns} data={undefined} isLoading getRowId={(r) => r.id} />)
    expect(screen.queryByText('没有东西')).not.toBeInTheDocument()
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1)

    const onRetry = vi.fn()
    rerender(
      <DataTable
        columns={columns}
        data={undefined}
        error={new Error('boom')}
        onRetry={onRetry}
        getRowId={(r) => r.id}
      />,
    )
    expect(screen.getByText('boom')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('分页信息与翻页', async () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => r.id}
        pagination={{ page: 2, pageSize: 10, total: 25, onPageChange }}
      />,
    )
    expect(screen.getByText('25')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })
})
