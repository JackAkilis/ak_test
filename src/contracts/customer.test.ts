import { describe, expect, it } from 'vitest'
import { customerInputSchema, customerQuerySchema } from './customer'

describe('customerInputSchema', () => {
  const valid = {
    name: '张三',
    email: 'zhang@example.com',
    company: '星云科技',
    plan: 'pro',
    status: 'active',
    mrr: 199,
    owner: '周雨欣',
    notes: '',
  }

  it('接受合法输入并裁掉未知字段', () => {
    const parsed = customerInputSchema.parse({ ...valid, id: 'x', createdAt: 'y' })
    expect(parsed).toEqual(valid)
  })

  it('校验必填与格式，并给出中文错误', () => {
    const result = customerInputSchema.safeParse({ ...valid, name: ' ', email: 'bad', mrr: -1 })
    expect(result.success).toBe(false)
    const messages = result.error!.issues.map((i) => `${i.path.join('.')}:${i.message}`)
    expect(messages).toContain('name:请输入联系人姓名')
    expect(messages).toContain('email:邮箱格式不正确')
    expect(messages).toContain('mrr:MRR 不能为负数')
  })

  it('拒绝非法枚举', () => {
    expect(customerInputSchema.safeParse({ ...valid, plan: 'vip' }).success).toBe(false)
  })
})

describe('customerQuerySchema', () => {
  it('从字符串 query 解析并回落默认值', () => {
    expect(customerQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 10 })
    expect(customerQuerySchema.parse({ page: '3', pageSize: '20', plan: 'pro' })).toMatchObject({
      page: 3,
      pageSize: 20,
      plan: 'pro',
    })
  })

  it('非法值不抛错而是回落（URL 容错）', () => {
    const q = customerQuerySchema.parse({ page: 'abc', pageSize: '999', plan: 'nope' })
    expect(q.page).toBe(1)
    expect(q.pageSize).toBe(10)
    expect(q.plan).toBeUndefined()
  })
})
