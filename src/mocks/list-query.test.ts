import { describe, expect, it } from 'vitest'
import { applyListQuery } from './list-query'

const items = [
  { id: '1', name: 'Alice', status: 'active', mrr: 300, createdAt: '2025-01-03' },
  { id: '2', name: 'Bob', status: 'trial', mrr: 100, createdAt: '2025-01-01' },
  { id: '3', name: 'Carol', status: 'active', mrr: 200, createdAt: '2025-01-02' },
]
const options = {
  searchFields: ['name'],
  filterFields: ['status'],
  defaultSort: { field: 'createdAt', order: 'desc' as const },
}
const base = { page: 1, pageSize: 10 }

describe('applyListQuery', () => {
  it('默认按 defaultSort 排序', () => {
    const r = applyListQuery(items, base, options)
    expect(r.data.map((x) => x.id)).toEqual(['1', '3', '2'])
    expect(r.total).toBe(3)
  })

  it('关键字搜索不区分大小写', () => {
    expect(applyListQuery(items, { ...base, q: 'bo' }, options).data.map((x) => x.id)).toEqual([
      '2',
    ])
  })

  it('精确过滤 + 显式排序', () => {
    const r = applyListQuery(
      items,
      { ...base, status: 'active', sort: 'mrr', order: 'asc' },
      options,
    )
    expect(r.data.map((x) => x.id)).toEqual(['3', '1'])
  })

  it('分页返回正确切片与元信息', () => {
    const r = applyListQuery(items, { page: 2, pageSize: 2 }, options)
    expect(r.data.map((x) => x.id)).toEqual(['2'])
    expect(r).toMatchObject({ total: 3, page: 2, pageSize: 2 })
  })

  it('忽略空过滤值', () => {
    expect(applyListQuery(items, { ...base, status: '' }, options).total).toBe(3)
  })
})
