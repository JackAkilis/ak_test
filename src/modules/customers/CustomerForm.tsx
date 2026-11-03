import {
  customerInputSchema,
  customerPlanOptions,
  customerStatusOptions,
  type Customer,
  type CustomerInput,
} from '@/contracts/customer'
import { Field, Form, FormGrid, applyServerErrors, fieldId, useZodForm } from '@/components/form'
import { Input, Select, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-context'
import { FormFooter, type EntityFormProps } from '@/components/crud'
import { ApiError } from '@/lib/http'

const emptyValues: CustomerInput = {
  name: '',
  email: '',
  company: '',
  plan: 'free',
  status: 'trial',
  mrr: 0,
  owner: '',
  notes: '',
}

function toInput(c: Customer): CustomerInput {
  return customerInputSchema.parse(c)
}

export function CustomerForm({
  mode,
  entity,
  onSubmit,
  onCancel,
  submitting,
}: EntityFormProps<Customer, CustomerInput>) {
  const toast = useToast()
  const form = useZodForm(customerInputSchema, {
    defaultValues: entity ? toInput(entity) : emptyValues,
  })
  const { register, formState } = form
  const invalid = (name: keyof CustomerInput) => Boolean(formState.errors[name])

  const submit = async (values: CustomerInput) => {
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
      aria-label={mode === 'create' ? '新建客户表单' : '编辑客户表单'}
    >
      <FormGrid>
        <Field name="name" label="联系人" required>
          <Input
            id={fieldId('name')}
            placeholder="张三"
            invalid={invalid('name')}
            {...register('name')}
          />
        </Field>
        <Field name="email" label="邮箱" required>
          <Input
            id={fieldId('email')}
            type="email"
            placeholder="name@company.com"
            invalid={invalid('email')}
            {...register('email')}
          />
        </Field>
      </FormGrid>
      <Field name="company" label="公司" required>
        <Input
          id={fieldId('company')}
          placeholder="公司全称"
          invalid={invalid('company')}
          {...register('company')}
        />
      </Field>
      <FormGrid>
        <Field name="plan" label="套餐" required>
          <Select
            id={fieldId('plan')}
            options={customerPlanOptions}
            invalid={invalid('plan')}
            {...register('plan')}
          />
        </Field>
        <Field name="status" label="状态" required>
          <Select
            id={fieldId('status')}
            options={customerStatusOptions}
            invalid={invalid('status')}
            {...register('status')}
          />
        </Field>
      </FormGrid>
      <FormGrid>
        <Field name="mrr" label="MRR（元 / 月）" required hint="月度经常性收入">
          <Input
            id={fieldId('mrr')}
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            invalid={invalid('mrr')}
            {...register('mrr', { valueAsNumber: true })}
          />
        </Field>
        <Field name="owner" label="负责人" required>
          <Input
            id={fieldId('owner')}
            placeholder="客户成功负责人"
            invalid={invalid('owner')}
            {...register('owner')}
          />
        </Field>
      </FormGrid>
      <Field name="notes" label="备注">
        <Textarea
          id={fieldId('notes')}
          placeholder="可选"
          invalid={invalid('notes')}
          {...register('notes')}
        />
      </Field>
      <FormFooter mode={mode} submitting={submitting} onCancel={onCancel} />
    </Form>
  )
}
