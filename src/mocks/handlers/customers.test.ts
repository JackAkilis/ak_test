import { describe, expect, it } from 'vitest'
import type { Customer, CustomerInput } from '@/contracts/customer'
import type { Paginated } from '@/contracts/common'
import { ApiError, http } from '@/lib/http'
import { db } from '../db'

const input: CustomerInput = {
  name: '测试客户',
  email: 'test@example.com',
  company: '测试公司',
  plan: 'pro',
  status: 'active',
  mrr: 999,
  owner: '周雨欣',
  notes: '',
}

describe('GET/POST/PUT/DELETE /api/customers（Mock 契约）', () => {
  it('列表返回分页结构并支持过滤', async () => {
    const res = await http<Paginated<Customer>>('/api/customers', {
      query: { pageSize: 5, status: 'active' },
    })
    expect(res.data).toHaveLength(5)
    expect(res.total).toBe(db.customers.all().filter((c) => c.status === 'active').length)
    expect(res.data.every((c) => c.status === 'active')).toBe(true)
  })

  it('创建 → 查询 → 更新 → 删除 全流程', async () => {
    const created = await http<Customer>('/api/customers', { method: 'POST', body: input })
    expect(created.id).toMatch(/^cus_/)
    expect(created).toMatchObject(input)

    const fetched = await http<Customer>(`/api/customers/${created.id}`)
    expect(fetched.name).toBe('测试客户')

    const updated = await http<Customer>(`/api/customers/${created.id}`, {
      method: 'PUT',
      body: { ...input, name: '改名了' },
    })
    expect(updated.name).toBe('改名了')
    expect(updated.updatedAt >= created.updatedAt).toBe(true)

    await http<void>(`/api/customers/${created.id}`, { method: 'DELETE' })
    await expect(http(`/api/customers/${created.id}`)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })

  it('非法入参返回 400 与字段级错误', async () => {
    const err = await http('/api/customers', {
      method: 'POST',
      body: { ...input, email: 'nope', mrr: -5 },
    }).catch((e: unknown) => e)
    expect(ApiError.is(err)).toBe(true)
    const apiErr = err as ApiError
    expect(apiErr.status).toBe(400)
    expect(apiErr.code).toBe('VALIDATION_ERROR')
    expect(apiErr.fieldErrors?.email?.[0]).toBe('邮箱格式不正确')
    expect(apiErr.fieldErrors?.mrr?.[0]).toBe('MRR 不能为负数')
  })

  it('有订单的客户不能删除（业务规则 409）', async () => {
    const withOrders = db.orders.all()[0].customerId
    await expect(http(`/api/customers/${withOrders}`, { method: 'DELETE' })).rejects.toMatchObject({
      status: 409,
      code: 'HAS_ORDERS',
    })
  })
})
