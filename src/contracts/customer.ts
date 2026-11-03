import { z } from 'zod'
import { idSchema, listQuerySchema, timestampFields } from './common'
import { defineResource, toOptions } from './resource'

export const customerPlanSchema = z.enum(['free', 'pro', 'enterprise'])
export type CustomerPlan = z.infer<typeof customerPlanSchema>
export const customerPlanLabels: Record<CustomerPlan, string> = {
  free: '免费版',
  pro: '专业版',
  enterprise: '企业版',
}
export const customerPlanOptions = toOptions(customerPlanLabels)

export const customerStatusSchema = z.enum(['trial', 'active', 'churned'])
export type CustomerStatus = z.infer<typeof customerStatusSchema>
export const customerStatusLabels: Record<CustomerStatus, string> = {
  trial: '试用中',
  active: '已付费',
  churned: '已流失',
}
export const customerStatusOptions = toOptions(customerStatusLabels)

export const customerSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string(),
  company: z.string(),
  plan: customerPlanSchema,
  status: customerStatusSchema,
  /** 月度经常性收入（元） */
  mrr: z.number(),
  /** 客户成功负责人 */
  owner: z.string(),
  notes: z.string(),
  ...timestampFields,
})
export type Customer = z.infer<typeof customerSchema>

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, '请输入联系人姓名').max(50, '最多 50 个字符'),
  email: z.email('邮箱格式不正确'),
  company: z.string().trim().min(1, '请输入公司名称').max(100, '最多 100 个字符'),
  plan: customerPlanSchema,
  status: customerStatusSchema,
  mrr: z.number({ error: '请输入有效金额' }).min(0, 'MRR 不能为负数'),
  owner: z.string().trim().min(1, '请输入负责人'),
  notes: z.string().max(500, '最多 500 个字符'),
})
export type CustomerInput = z.infer<typeof customerInputSchema>

export const customerQuerySchema = listQuerySchema.extend({
  plan: customerPlanSchema.optional().catch(undefined),
  status: customerStatusSchema.optional().catch(undefined),
})
export type CustomerQuery = z.infer<typeof customerQuerySchema>

export const customerResource = defineResource<Customer, CustomerInput, CustomerQuery>({
  name: 'customers',
  label: '客户',
  entity: customerSchema,
  input: customerInputSchema,
  query: customerQuerySchema,
  searchFields: ['name', 'email', 'company', 'owner'],
  filterFields: ['plan', 'status'],
  defaultSort: { field: 'createdAt', order: 'desc' },
})
