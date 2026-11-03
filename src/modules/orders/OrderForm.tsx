import { useMemo } from 'react'
import {
  currencyOptions,
  orderInputSchema,
  orderStatusOptions,
  type Order,
  type OrderInput,
} from '@/contracts/order'
import { Field, Form, FormGrid, applyServerErrors, fieldId, useZodForm } from '@/components/form'
import { Input, Select, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-context'
import { FormFooter, type EntityFormProps } from '@/components/crud'
import { ApiError } from '@/lib/http'
import { customerHooks } from '@/modules/customers/hooks'

const emptyValues: OrderInput = {
  customerId: '',
  product: '',
  amount: 0,
  currency: 'CNY',
  status: 'pending',
  remark: '',
}

export function OrderForm({
  mode,
  entity,
  onSubmit,
  onCancel,
  submitting,
}: EntityFormProps<Order, OrderInput>) {
  const toast = useToast()
  const form = useZodForm(orderInputSchema, {
    defaultValues: entity ? orderInputSchema.parse(entity) : emptyValues,
  })
  const { register, formState } = form
  const invalid = (name: keyof OrderInput) => Boolean(formState.errors[name])

  // 关联数据：客户下拉（演示跨模块复用 hooks）
  const customers = customerHooks.useList({ page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const customerOptions = useMemo(
    () =>
      (customers.data?.data ?? []).map((c) => ({ value: c.id, label: `${c.name} · ${c.company}` })),
    [customers.data],
  )

  const submit = async (values: OrderInput) => {
    try {
      await onSubmit(values)
    } catch (err) {
      if (!applyServerErrors(form, err)) {
        toast.error('保存失败', ApiError.is(err) ? err.message : '请稍后重试')
      }
    }
  }

  return (
    <Form
      form={form}
      onSubmit={submit}
      aria-label={mode === 'create' ? '新建订单表单' : '编辑订单表单'}
    >
      <Field
        name="customerId"
        label="客户"
        required
        hint={customers.isLoading ? '客户列表加载中…' : undefined}
      >
        <Select
          id={fieldId('customerId')}
          placeholder="请选择客户"
          options={customerOptions}
          invalid={invalid('customerId')}
          disabled={customers.isLoading}
          {...register('customerId')}
        />
      </Field>
      <Field name="product" label="商品 / 套餐" required>
        <Input
          id={fieldId('product')}
          placeholder="如：专业版 · 年付"
          invalid={invalid('product')}
          {...register('product')}
        />
      </Field>
      <FormGrid>
        <Field name="amount" label="金额" required>
          <Input
            id={fieldId('amount')}
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            invalid={invalid('amount')}
            {...register('amount', { valueAsNumber: true })}
          />
        </Field>
        <Field name="currency" label="币种" required>
          <Select
            id={fieldId('currency')}
            options={currencyOptions}
            invalid={invalid('currency')}
            {...register('currency')}
          />
        </Field>
      </FormGrid>
      <Field name="status" label="状态" required hint="状态改为「已支付」时服务端会记录支付时间">
        <Select
          id={fieldId('status')}
          options={orderStatusOptions}
          invalid={invalid('status')}
          {...register('status')}
        />
      </Field>
      <Field name="remark" label="备注">
        <Textarea
          id={fieldId('remark')}
          placeholder="可选"
          invalid={invalid('remark')}
          {...register('remark')}
        />
      </Field>
      <FormFooter mode={mode} submitting={submitting} onCancel={onCancel} />
    </Form>
  )
}
